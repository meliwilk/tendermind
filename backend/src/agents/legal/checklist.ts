import type { LegalCategory } from "./types.js";

/**
 * Human-readable labels and the "not present in package" unknown text for each
 * checklist category in agents/skills/lawyer.md §Assessment checklist.
 * §3.4 of TENDER_ASSISTANT.md requires every category to be reported on, never
 * silently skipped — this table is what drives that coverage check.
 */
export const CATEGORY_LABELS: Record<LegalCategory, string> = {
  payment_cash_flow: "Payment & cash flow",
  damages_liability: "Damages & liability",
  indemnification_insurance: "Indemnification & insurance",
  warranty_defects: "Warranty & defects",
  termination_suspension: "Termination & suspension",
  change_management_claims: "Change management & claims",
  dispute_resolution_governing_law: "Dispute resolution & governing law",
  compliance_eligibility: "Compliance & eligibility to bid",
  ip_confidentiality_assignment: "IP, confidentiality & assignment",
  third_party_step_in: "Third-party & step-in arrangements",
};

/**
 * lawyer.md §Severity rubric: "A finding of `critical` or `high` on any clause in
 * categories 2, 3, or 6 should populate `blocking_issues[]` by default."
 */
export const DEFAULT_BLOCKING_CATEGORIES: LegalCategory[] = [
  "damages_liability",
  "indemnification_insurance",
  "change_management_claims",
];

/** Document types this agent is scoped to read, per lawyer.md §Scope. */
export const IN_SCOPE_DOC_ROLES = [
  "general_conditions",
  "special_conditions",
  "instructions_to_tenderers",
  "insurance_bonding_schedule",
  "form_of_agreement",
  "addendum",
  "third_party_agreement",
  "other",
] as const;
export type DocRole = (typeof IN_SCOPE_DOC_ROLES)[number];
