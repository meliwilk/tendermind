import { PDFParse } from "pdf-parse";
import type { DocumentChunk } from "./types.js";

export interface LegalAgentInputDocument {
  documentId: string;
  buffer: Buffer;
}

/**
 * Extracts per-page text from each input PDF into DocumentChunk[], preserving the
 * document_id and 1-indexed page number every finding must cite (TENDER_ASSISTANT.md §3.2).
 * Documents that fail to parse (e.g. scanned-image PDFs with no text layer) are skipped
 * rather than thrown — the caller surfaces that as an `unknowns` entry, not a hard failure.
 */
export async function extractChunks(
  documents: LegalAgentInputDocument[],
): Promise<{ chunks: DocumentChunk[]; failedDocumentIds: string[] }> {
  const chunks: DocumentChunk[] = [];
  const failedDocumentIds: string[] = [];

  for (const doc of documents) {
    const parser = new PDFParse({ data: doc.buffer });
    try {
      const result = await parser.getText();
      for (const page of result.pages) {
        const text = page.text.trim();
        if (text.length > 0) {
          chunks.push({ document_id: doc.documentId, page: page.num, text });
        }
      }
      if (result.pages.every((p) => p.text.trim().length === 0)) {
        failedDocumentIds.push(doc.documentId);
      }
    } catch {
      failedDocumentIds.push(doc.documentId);
    } finally {
      await parser.destroy();
    }
  }

  return { chunks, failedDocumentIds };
}
