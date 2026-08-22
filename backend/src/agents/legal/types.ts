import { z } from "zod";

/**
 * Mirrors the "Output schema" section of agents/skills/lawyer.md exactly.
 * Category keys correspond 1:1 to the ten "Assessment checklist" sections in that spec.
 */
export const LEGAL_CATEGORIES = [
  "payment_cash_flow",
  "damages_liability",
  "indemnification_insurance",
  "warranty_defects",
  "termination_suspension",
  "change_management_claims",
  "dispute_resolution_governing_law",
  "compliance_eligibility",
  "ip_confidentiality_assignment",
  "third_party_step_in",
] as const;

export const LegalCategorySchema = z.enum(LEGAL_CATEGORIES);
export type LegalCategory = z.infer<typeof LegalCategorySchema>;

/** Per lawyer.md "Automatic critical flags" — always `critical` regardless of context. */
export const AUTOMATIC_CRITICAL_FLAGS = [
  "UNLIMITED_LIABILITY",
  "UNLIMITED_INDEMNITY",
  "MANDATORY_REQUIREMENT_NOT_MET",
  "UNACCEPTABLE_JURISDICTION",
  "MISSING_LICENSE",
  "JOINT_VENTURE_REQUIREMENT",
  "BLACKLISTING_DECLARATION_ISSUE",
] as const;

export const CriticalFlagSchema = z.enum(AUTOMATIC_CRITICAL_FLAGS);
export type CriticalFlag = z.infer<typeof CriticalFlagSchema>;

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const RecommendedActionSchema = z.enum([
  "escalate_to_counsel",
  "negotiate_before_bid",
  "note_only",
  "accept",
]);
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

export const OverallAssessmentSchema = z.enum([
  "clear",
  "conditional",
  "do_not_bid",
  "insufficient_information",
]);
export type OverallAssessment = z.infer<typeof OverallAssessmentSchema>;

export const CitationSchema = z.object({
  document_id: z.string(),
  page: z.number().int().positive(),
  excerpt: z.string().min(1),
});
export type Citation = z.infer<typeof CitationSchema>;

/** A finding as produced by an LLM client, before ids are assigned and enrichment runs. */
export const RawFindingSchema = z.object({
  category: LegalCategorySchema,
  clause_type: z.string(),
  critical_flag: CriticalFlagSchema.optional(),
  severity: SeveritySchema,
  summary: z.string(),
  why_it_matters: z.string(),
  legal_exposure: z.string(),
  company_position: z.string().optional(),
  citation: CitationSchema,
  confidence: z.number().min(0).max(1),
  recommended_action: RecommendedActionSchema,
  requires_external_counsel: z.boolean(),
});
export type RawFinding = z.infer<typeof RawFindingSchema>;

/** A finding as it appears in the final agent output, with an assigned id. */
export const FindingSchema = RawFindingSchema.extend({
  id: z.string(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const LegalAgentOutputSchema = z.object({
  agent: z.literal("legal"),
  schema_version: z.literal("1.0"),
  jurisdiction_assumed: z.string(),
  findings: z.array(FindingSchema),
  unknowns: z.array(z.string()),
  blocking_issues: z.array(z.string()),
  overall_assessment: OverallAssessmentSchema,
});
export type LegalAgentOutput = z.infer<typeof LegalAgentOutputSchema>;

/** A single page of extracted text from an in-scope tender document. */
export interface DocumentChunk {
  document_id: string;
  page: number;
  text: string;
}

/** What an LLM client (mock or real) returns before ids/enrichment are applied. */
export interface LegalExtractionResult {
  findings: RawFinding[];
  unknowns: string[];
  overall_assessment: OverallAssessment;
}
