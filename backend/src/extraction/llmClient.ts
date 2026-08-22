import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { PdfPage } from "./pdf.js";
import { TenderExtractionSchema, type Requirement, type TenderExtraction } from "./schema.js";

/**
 * The Tender Intake / Parsing agent's LLM call, behind an interface so the
 * real implementation is a one-line swap (set ANTHROPIC_API_KEY) — see
 * createExtractionClient() below. See agents/skills/tender-intake.md for the
 * agent's guardrails: extraction and classification only, never adjudication.
 */
export interface ExtractionClient {
  readonly engine: string;
  extract(fileName: string, pages: PdfPage[]): Promise<TenderExtraction>;
}

const SYSTEM_PROMPT = `You are the Tender Intake / Parsing agent for TenderMind, a construction tender analysis tool.

Question you answer: what does this tender document actually say, structured so downstream specialist agents (legal, engineering, accounting, risk) can all work from the same facts?

Guardrail (verbatim from the architecture spec): you perform extraction and classification, not qualification, pricing, legal interpretation, or bid decisions. You build the Requirement Registry; you do not decide whether any requirement is satisfied.

Rules:
- Every requirement must carry a citation: the exact page it was found on. Never invent a page number.
- If a metadata field (deadline, buyer, estimated value, etc.) is not stated in the document, return null for it — do not guess. Add a plain-language line to "unknowns" describing what's missing instead.
- Extract each distinct requirement once. Do not restate the same clause as multiple requirements.
- "clarification_questions" is for ambiguity worth an RFI to the buyer before pricing, not for missing metadata (that belongs in "unknowns").
- Stay within scope: extract and classify only. Do not assess compliance, do not price anything, do not recommend a bid decision.`;

// Conservative guard against unbounded per-call cost. Chunked / multi-pass
// extraction for larger packages is future work, not v1 scope.
const MAX_INPUT_CHARS = 600_000;

function renderPages(fileName: string, pages: PdfPage[]): string {
  const body = pages
    .map((page) => `--- ${fileName} · page ${page.pageNumber} ---\n${page.text}`)
    .join("\n\n");
  if (body.length > MAX_INPUT_CHARS) {
    throw new Error(
      `${fileName} produced ${body.length} characters of extracted text, over the ${MAX_INPUT_CHARS}-character single-pass limit. Chunked extraction isn't built yet — split the document before uploading.`,
    );
  }
  return body;
}

export class AnthropicExtractionClient implements ExtractionClient {
  readonly engine = "anthropic";
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    this.client = new Anthropic();
    this.model = process.env.EXTRACTION_MODEL ?? "claude-opus-5";
  }

  async extract(fileName: string, pages: PdfPage[]): Promise<TenderExtraction> {
    const text = renderPages(fileName, pages);
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extract structured tender data from "${fileName}" below. Every page is marked with its page number — use that exact number in each requirement's source.page.\n\n${text}`,
        },
      ],
      output_config: { format: zodOutputFormat(TenderExtractionSchema) },
    });

    if (!response.parsed_output) {
      throw new Error(`Claude returned no parsable structured output for ${fileName}`);
    }
    return response.parsed_output;
  }
}

const EMPTY_EXTRACTION: Omit<TenderExtraction, "requirements" | "clarification_questions" | "unknowns"> = {
  tender_name: null,
  buyer: null,
  deadline: null,
  clarification_deadline: null,
  pre_bid_meeting: null,
  bid_validity: null,
  contract_duration: null,
  estimated_value: null,
  submission_method: null,
  bid_security: null,
  performance_security: null,
  evaluation_method: null,
};

const DEADLINE_PATTERN = /\b\d{1,2}[/\-. ](?:\d{1,2}|[A-Za-z]+)[/\-. ]\d{2,4}\b/;
const REQUIREMENT_PATTERN = /\b(shall|must)\b/i;
const MAX_STUB_REQUIREMENTS = 50;

/**
 * Heuristic, non-LLM fallback used when ANTHROPIC_API_KEY is unset. Finds
 * "shall/must" sentences and a date-shaped deadline via regex — good enough
 * to exercise the upload → extract → persist pipeline end to end, not a
 * substitute for the real agent. Every requirement it produces says so in
 * its `notes` field.
 */
export class StubExtractionClient implements ExtractionClient {
  readonly engine = "stub";

  async extract(fileName: string, pages: PdfPage[]): Promise<TenderExtraction> {
    const deadlineMatch = pages.flatMap((page) => page.text.match(DEADLINE_PATTERN) ?? []).at(0) ?? null;

    const requirements: Requirement[] = [];
    outer: for (const page of pages) {
      const sentences = page.text.split(/(?<=[.;])\s+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && REQUIREMENT_PATTERN.test(trimmed)) {
          requirements.push({
            requirement_id: `REQ-${String(requirements.length + 1).padStart(3, "0")}`,
            category: "technical",
            requirement: trimmed.slice(0, 500),
            source: { document: fileName, page: page.pageNumber, section: null, clause: null },
            mandatory: REQUIREMENT_PATTERN.test(trimmed),
            response_required: false,
            risk_if_unmet: null,
            clarification_required: false,
            notes: "Stub extraction (heuristic keyword match, not LLM-verified) — set ANTHROPIC_API_KEY to enable the real agent.",
          });
          if (requirements.length >= MAX_STUB_REQUIREMENTS) break outer;
        }
      }
    }

    return {
      ...EMPTY_EXTRACTION,
      deadline: deadlineMatch,
      requirements,
      clarification_questions: [],
      unknowns: [
        "Stub extraction client is active (no ANTHROPIC_API_KEY set) — metadata fields and requirement categorization were not verified by an LLM.",
      ],
    };
  }
}

export function createExtractionClient(): ExtractionClient {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicExtractionClient();
  }
  console.warn(
    "[extraction] ANTHROPIC_API_KEY not set — using the heuristic stub extraction client. See backend/.env.example.",
  );
  return new StubExtractionClient();
}
