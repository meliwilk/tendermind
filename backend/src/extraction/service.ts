import { extractPdfPages } from "./pdf.js";
import { createExtractionClient, type ExtractionClient } from "./llmClient.js";
import type { TenderExtraction } from "./schema.js";
import type { TenderWorkspace } from "./types.js";

export interface ExtractionSourceFile {
  fileName: string;
  buffer: Buffer;
}

const SCALAR_KEYS = [
  "tender_name",
  "buyer",
  "deadline",
  "clarification_deadline",
  "pre_bid_meeting",
  "bid_validity",
  "contract_duration",
  "estimated_value",
  "submission_method",
  "bid_security",
  "performance_security",
  "evaluation_method",
] as const satisfies readonly (keyof TenderExtraction)[];

/**
 * tender-intake.md's Tender Workspace is one shared object per tender package,
 * even though a package is usually several PDFs. Each document is extracted
 * independently (its own LLM call, its own page numbering), then merged here:
 * first document to state a metadata field wins, requirement ids are made
 * unique with a per-document prefix, and unknowns/clarification questions
 * concatenate.
 */
function mergeExtractions(perFile: { fileName: string; extraction: TenderExtraction }[]): TenderExtraction {
  const merged: TenderExtraction = {
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
    requirements: [],
    clarification_questions: [],
    unknowns: [],
  };

  perFile.forEach(({ fileName, extraction }, docIndex) => {
    for (const key of SCALAR_KEYS) {
      if (merged[key] === null && extraction[key] !== null) {
        merged[key] = extraction[key] as never;
      }
    }
    for (const requirement of extraction.requirements) {
      merged.requirements.push({
        ...requirement,
        requirement_id: `D${docIndex + 1}-${requirement.requirement_id}`,
      });
    }
    merged.clarification_questions.push(...extraction.clarification_questions);
    merged.unknowns.push(...extraction.unknowns.map((unknown) => `[${fileName}] ${unknown}`));
  });

  return merged;
}

export async function runExtraction(
  files: ExtractionSourceFile[],
  client: ExtractionClient = createExtractionClient(),
): Promise<{ workspace: TenderWorkspace; engine: string }> {
  const perFile: { fileName: string; extraction: TenderExtraction }[] = [];
  for (const file of files) {
    const pages = await extractPdfPages(file.buffer);
    const extraction = await client.extract(file.fileName, pages);
    perFile.push({ fileName: file.fileName, extraction });
  }

  const merged = mergeExtractions(perFile);
  const workspace: TenderWorkspace = { agent: "tender_intake", schema_version: "1.0", ...merged };
  return { workspace, engine: client.engine };
}
