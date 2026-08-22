export type CompanyMemoryDocType =
  | "Company policy"
  | "Pricing / rate card"
  | "Previous tender"
  | "Legal / contract"
  | "Compliance"
  | "Capability statement"
  | "Financial assumptions"
  | "Other";

export const COMPANY_MEMORY_DOC_TYPES: CompanyMemoryDocType[] = [
  "Company policy",
  "Pricing / rate card",
  "Previous tender",
  "Legal / contract",
  "Compliance",
  "Capability statement",
  "Financial assumptions",
  "Other",
];

export type IngestStepStatus = "pending" | "active" | "done";

export interface IngestStep {
  label: string;
  status: IngestStepStatus;
}

export interface IngestSummary {
  fileName: string;
  fileSizeLabel: string;
  steps: IngestStep[];
  newFacts: number;
  updatedFacts: number;
  contradictions: number;
}

export interface ContradictionSource {
  label: string;
  value: string;
}

export interface Contradiction {
  headline: string;
  sources: ContradictionSource[];
  onUseSource: (source: ContradictionSource) => void;
  onReviewSources: () => void;
}

export interface TenderDocumentRef {
  name: string;
  meta: string;
  file: File;
}

export interface NewTenderFormValues {
  name: string;
  deadline: string;
  owner: string;
  documents: TenderDocumentRef[];
}

export interface CompanyMemoryStats {
  factCount: number;
  documentCount: number;
  typicalRunLabel: string;
}
