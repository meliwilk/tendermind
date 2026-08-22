import { CATEGORY_LABELS, DEFAULT_BLOCKING_CATEGORIES } from "./checklist.js";
import {
  LEGAL_CATEGORIES,
  type Finding,
  type LegalCategory,
  type LegalExtractionResult,
  type OverallAssessment,
  type RawFinding,
} from "./types.js";

function hasValidCitation(finding: RawFinding): boolean {
  const { citation } = finding;
  return (
    !!citation &&
    typeof citation.document_id === "string" &&
    citation.document_id.length > 0 &&
    Number.isInteger(citation.page) &&
    citation.page > 0 &&
    typeof citation.excerpt === "string" &&
    citation.excerpt.trim().length > 0
  );
}

/**
 * Applies lawyer.md's non-negotiable rules on top of raw LLM output:
 *   - "Never output a finding without a citation" → uncited findings are dropped.
 *   - "Any finding tagged with [an automatic critical flag] automatically populates
 *     blocking_issues[]... regardless of the confidence score attached to it" →
 *     severity/action are forced to their critical values.
 *   - Severity rubric: critical/high findings in categories 2, 3, or 6 populate
 *     blocking_issues[] by default.
 *   - "Never silently skip a checklist category" → categories with zero findings
 *     get a "not present in package" unknown.
 */
export function enrichAndValidate(
  extraction: LegalExtractionResult,
  droppedForMissingText: string[],
): { findings: Finding[]; unknowns: string[]; blockingIssues: string[]; overallAssessment: OverallAssessment } {
  const citedRaw = extraction.findings.filter(hasValidCitation);
  const droppedUncitedCount = extraction.findings.length - citedRaw.length;

  const findings: Finding[] = citedRaw.map((raw, index) => {
    const id = `LGL-${String(index + 1).padStart(3, "0")}`;
    if (raw.critical_flag) {
      return {
        ...raw,
        id,
        severity: "critical",
        recommended_action: "escalate_to_counsel",
        requires_external_counsel: true,
      };
    }
    return { ...raw, id };
  });

  const blockingIssues = findings
    .filter(
      (f) =>
        !!f.critical_flag ||
        ((f.severity === "critical" || f.severity === "high") &&
          DEFAULT_BLOCKING_CATEGORIES.includes(f.category)),
    )
    .map((f) => f.id);

  const categoriesWithFindings = new Set<LegalCategory>(findings.map((f) => f.category));
  const coverageUnknowns = LEGAL_CATEGORIES.filter((c) => !categoriesWithFindings.has(c)).map(
    (c) => `${CATEGORY_LABELS[c]}: not present in package.`,
  );

  const unknowns = [...extraction.unknowns, ...coverageUnknowns];
  if (droppedForMissingText.length > 0) {
    unknowns.push(
      `${droppedForMissingText.length} document(s) had no extractable text (possibly scanned images): ${droppedForMissingText.join(", ")}.`,
    );
  }
  if (droppedUncitedCount > 0) {
    unknowns.push(`${droppedUncitedCount} finding(s) were dropped for lacking a valid citation.`);
  }

  let overallAssessment = extraction.overall_assessment;
  if (blockingIssues.length > 0 && overallAssessment === "clear") {
    overallAssessment = "conditional";
  }

  return { findings, unknowns, blockingIssues, overallAssessment };
}
