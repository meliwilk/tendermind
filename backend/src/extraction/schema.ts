import { z } from "zod";

// Structured output contract for the Tender Intake / Parsing agent —
// see agents/skills/tender-intake.md for the full spec this implements.
// Scalar fields are `.nullable()` rather than optional: the schema is sent to
// Claude as a strict JSON schema, so every key must always be present, with
// `null` standing in for "not stated in this document."

export const RequirementCategory = z.enum([
  "technical",
  "commercial",
  "legal",
  "financial",
  "eligibility",
  "submission",
]);

export const RequirementSourceSchema = z.object({
  document: z.string().describe("Source document file name"),
  page: z.number().int().min(1).describe("1-indexed page number the requirement was found on"),
  section: z.string().nullable().describe("Section heading or number, if identifiable, else null"),
  clause: z.string().nullable().describe("Clause number, if identifiable, else null"),
});

export const RequirementSchema = z.object({
  requirement_id: z.string().describe("Stable id, e.g. REQ-001, unique within this document"),
  category: RequirementCategory,
  requirement: z.string().describe("The requirement, restated clearly in one or two sentences"),
  source: RequirementSourceSchema,
  mandatory: z.boolean(),
  response_required: z
    .boolean()
    .describe("Whether the bidder must submit a specific response or document to satisfy this"),
  risk_if_unmet: z.string().nullable().describe("Consequence of non-compliance, if stated or inferable, else null"),
  clarification_required: z
    .boolean()
    .describe("True if the requirement is ambiguous and worth an RFI to the buyer before pricing"),
  notes: z.string().nullable(),
});

export const MoneyAmountSchema = z.object({
  amount: z.number().nullable(),
  currency: z.string().nullable(),
});

export const SecuritySchema = z.object({
  type: z.string().nullable().describe("e.g. bond, bank guarantee, cash deposit"),
  value_pct: z.number().nullable(),
});

export const TenderExtractionSchema = z.object({
  tender_name: z.string().nullable(),
  buyer: z.string().nullable(),
  deadline: z.string().nullable().describe("Submission deadline — ISO 8601 if a date/time is stated, else the text as written"),
  clarification_deadline: z.string().nullable(),
  pre_bid_meeting: z.string().nullable(),
  bid_validity: z.string().nullable(),
  contract_duration: z.string().nullable(),
  estimated_value: MoneyAmountSchema.nullable(),
  submission_method: z.string().nullable(),
  bid_security: SecuritySchema.nullable(),
  performance_security: SecuritySchema.nullable(),
  evaluation_method: z.string().nullable(),
  requirements: z.array(RequirementSchema),
  clarification_questions: z
    .array(z.string())
    .describe("Ambiguities worth an RFI to the buyer before pricing"),
  unknowns: z
    .array(z.string())
    .describe("Fields this document did not contain enough information to determine"),
});

export type RequirementSource = z.infer<typeof RequirementSourceSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type TenderExtraction = z.infer<typeof TenderExtractionSchema>;
