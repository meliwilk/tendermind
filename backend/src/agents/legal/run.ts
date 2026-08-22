import { extractChunks, type LegalAgentInputDocument } from "./extract.js";
import { MockLegalLLMClient, type LegalLLMClient } from "./llmClient.js";
import { LegalAgentOutputSchema, type LegalAgentOutput } from "./types.js";
import { enrichAndValidate } from "./validate.js";

export type { LegalAgentInputDocument } from "./extract.js";

export interface RunLegalAgentOptions {
  /** Per lawyer.md §Jurisdiction handling — stated in every output. Defaults to the spec's own example. */
  jurisdictionAssumed?: string;
  /** Defaults to MockLegalLLMClient; swap in a real LLM-backed client once one exists. */
  llmClient?: LegalLLMClient;
}

/**
 * Runs the Legal Agent end to end: PDF -> per-page text -> LLM extraction -> validated,
 * schema-conformant output per agents/skills/lawyer.md.
 */
export async function runLegalAgent(
  documents: LegalAgentInputDocument[],
  options: RunLegalAgentOptions = {},
): Promise<LegalAgentOutput> {
  const jurisdictionAssumed = options.jurisdictionAssumed ?? "England & Wales";
  const llmClient = options.llmClient ?? new MockLegalLLMClient();

  const { chunks, failedDocumentIds } = await extractChunks(documents);
  const extraction = await llmClient.extractFindings({ chunks, jurisdictionAssumed });
  const { findings, unknowns, blockingIssues, overallAssessment } = enrichAndValidate(
    extraction,
    failedDocumentIds,
  );

  const output: LegalAgentOutput = {
    agent: "legal",
    schema_version: "1.0",
    jurisdiction_assumed: jurisdictionAssumed,
    findings,
    unknowns,
    blocking_issues: blockingIssues,
    overall_assessment: overallAssessment,
  };

  return LegalAgentOutputSchema.parse(output);
}
