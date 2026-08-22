import { DETECTORS } from "./detectors.js";
import type { DocumentChunk, LegalExtractionResult, OverallAssessment, RawFinding } from "./types.js";

export interface LegalLLMExtractionInput {
  chunks: DocumentChunk[];
  jurisdictionAssumed: string;
}

/**
 * Swappable seam for the extraction step. A real implementation (e.g. backed by the
 * Claude API) would prompt over `chunks` using the checklist in agents/skills/lawyer.md
 * and return the same shape. MockLegalLLMClient below is the only implementation for now.
 */
export interface LegalLLMClient {
  extractFindings(input: LegalLLMExtractionInput): Promise<LegalExtractionResult>;
}

const EXCERPT_RADIUS_BEFORE = 80;
const EXCERPT_RADIUS_AFTER = 220;

function buildExcerpt(text: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - EXCERPT_RADIUS_BEFORE);
  const end = Math.min(text.length, matchIndex + matchLength + EXCERPT_RADIUS_AFTER);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

/**
 * Deterministic, keyword-pattern-based stand-in for a real LLM extraction call.
 * It only ever emits a finding when a detector pattern actually matches text in a
 * chunk, so every finding carries a real citation grounded in the source document —
 * consistent with the "never output a finding without a citation" rule in lawyer.md.
 * Dedupes to at most one finding per (document, clause_type) so a clause repeated
 * across a page or template boilerplate doesn't flood the output.
 */
export class MockLegalLLMClient implements LegalLLMClient {
  async extractFindings(input: LegalLLMExtractionInput): Promise<LegalExtractionResult> {
    const findings: RawFinding[] = [];
    const seen = new Set<string>();

    for (const chunk of input.chunks) {
      for (const detector of DETECTORS) {
        const dedupeKey = `${chunk.document_id}::${detector.clauseType}`;
        if (seen.has(dedupeKey)) continue;

        const match = detector.pattern.exec(chunk.text);
        if (!match) continue;
        seen.add(dedupeKey);

        findings.push({
          category: detector.category,
          clause_type: detector.clauseType,
          critical_flag: detector.criticalFlag,
          severity: detector.severity,
          summary: detector.summary,
          why_it_matters: detector.whyItMatters,
          legal_exposure: detector.legalExposure,
          company_position: detector.companyPosition,
          citation: {
            document_id: chunk.document_id,
            page: chunk.page,
            excerpt: buildExcerpt(chunk.text, match.index, match[0].length),
          },
          confidence: detector.confidence,
          recommended_action: detector.recommendedAction,
          requires_external_counsel: detector.requiresExternalCounsel,
        });
      }
    }

    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const highCount = findings.filter((f) => f.severity === "high").length;

    let overall_assessment: OverallAssessment;
    if (input.chunks.length === 0) {
      overall_assessment = "insufficient_information";
    } else if (criticalCount >= 2) {
      overall_assessment = "do_not_bid";
    } else if (criticalCount >= 1 || highCount >= 1) {
      overall_assessment = "conditional";
    } else {
      overall_assessment = "clear";
    }

    return { findings, unknowns: [], overall_assessment };
  }
}
