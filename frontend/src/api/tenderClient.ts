import type { TenderDocumentRef } from "../types";

export interface TenderAnalysisResult {
  id: string;
  requirementCount: number;
  unknownCount: number;
  clarificationQuestionCount: number;
  engine: string;
}

interface TenderRecordResponse {
  id: string;
  extractionEngine: string;
  workspace: {
    requirements: unknown[];
    unknowns: unknown[];
    clarification_questions: unknown[];
  };
}

export async function analyzeTender(input: {
  name: string;
  deadline: string;
  owner: string;
  documents: TenderDocumentRef[];
}): Promise<TenderAnalysisResult> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("deadline", input.deadline);
  formData.append("owner", input.owner);
  for (const doc of input.documents) {
    formData.append("files", doc.file, doc.name);
  }

  const res = await fetch("/api/tenders", { method: "POST", body: formData });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Tender analysis failed");
  }
  const record = (await res.json()) as TenderRecordResponse;

  return {
    id: record.id,
    requirementCount: record.workspace.requirements.length,
    unknownCount: record.workspace.unknowns.length,
    clarificationQuestionCount: record.workspace.clarification_questions.length,
    engine: record.extractionEngine,
  };
}
