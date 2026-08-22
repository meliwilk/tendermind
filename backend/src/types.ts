import type { TenderWorkspace } from "./extraction/types.js";

export interface ContradictionSource {
  label: string;
  value: string;
}

export interface Contradiction {
  id: string;
  headline: string;
  sources: ContradictionSource[];
  status: "open" | "resolved";
  resolvedSourceLabel?: string;
  createdAt: string;
}

export interface CoverageByCategory {
  contracting: number;
  pricing: number;
  operational: number;
  compliance: number;
  cybersecurity: number;
}

export interface Coverage {
  overallPct: number;
  byCategory: CoverageByCategory;
  gaps: string[];
  factCount: number;
  documentCount: number;
}

export interface IngestResult {
  fileName: string;
  fileSizeLabel: string;
  newFacts: number;
  updatedFacts: number;
  contradictions: Contradiction[];
}

export interface CompanyMemoryFile {
  factCount: number;
  documentCount: number;
  categoryFactCounts: CoverageByCategory;
  categoryTargets: CoverageByCategory;
}

export interface BidRunDocument {
  name: string;
  meta: string;
}

export interface BidRunRecord {
  id: string;
  name: string;
  deadline: string;
  owner: string;
  documents: BidRunDocument[];
  createdAt: string;
  outcome?: "won" | "lost" | "declined" | "no_bid";
  outcomeDetails?: string;
}

export interface TenderRecord {
  id: string;
  name: string;
  deadline: string;
  owner: string;
  documents: BidRunDocument[];
  createdAt: string;
  extractionEngine: string;
  workspace: TenderWorkspace;
}
