import type { Contradiction, IngestSummary } from "../types";

export interface Coverage {
  overallPct: number;
  byCategory: {
    contracting: number;
    pricing: number;
    operational: number;
    compliance: number;
    cybersecurity: number;
  };
  gaps: string[];
  factCount: number;
  documentCount: number;
}

interface IngestResponse {
  fileName: string;
  fileSizeLabel: string;
  newFacts: number;
  updatedFacts: number;
  contradictions: { id: string; headline: string; sources: { label: string; value: string }[] }[];
}

export async function getCoverage(): Promise<Coverage> {
  const res = await fetch("/api/memory/coverage");
  if (!res.ok) throw new Error("Failed to load coverage");
  return res.json();
}

export async function ingestDocument(file: File, docType: string | null): Promise<{
  summary: IngestSummary;
  contradiction: Contradiction | null;
}> {
  const res = await fetch("/api/memory/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size, docType }),
  });
  if (!res.ok) throw new Error("Ingestion failed");
  const data: IngestResponse = await res.json();

  const summary: IngestSummary = {
    fileName: data.fileName,
    fileSizeLabel: data.fileSizeLabel,
    steps: [
      { label: "Reading document", status: "done" },
      { label: "Extracting commitments", status: "done" },
      { label: "Cross-checking existing company memory", status: "done" },
    ],
    newFacts: data.newFacts,
    updatedFacts: data.updatedFacts,
    contradictions: data.contradictions.length,
  };

  const firstOpen = data.contradictions[0];
  const contradiction: Contradiction | null = firstOpen
    ? {
        headline: firstOpen.headline,
        sources: firstOpen.sources,
        onUseSource: async (source) => {
          await resolveContradiction(firstOpen.id, source.label);
        },
        onReviewSources: () => {},
      }
    : null;

  return { summary, contradiction };
}

export async function resolveContradiction(id: string, chosenSourceLabel: string): Promise<void> {
  const res = await fetch(`/api/memory/contradictions/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosenSourceLabel }),
  });
  if (!res.ok) throw new Error("Failed to resolve contradiction");
}

export interface BidRunInput {
  name: string;
  deadline: string;
  owner: string;
  documents: { name: string; meta: string }[];
}

export async function recordBidRun(input: BidRunInput): Promise<{ id: string }> {
  const res = await fetch("/api/bid-runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to record bid run");
  return res.json();
}
