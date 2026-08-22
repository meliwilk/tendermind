import { PDFParse } from "pdf-parse";

export interface PdfPage {
  pageNumber: number;
  text: string;
}

export async function extractPdfPages(buffer: Buffer): Promise<PdfPage[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.pages
      .map((page) => ({ pageNumber: page.num, text: page.text }))
      .sort((a, b) => a.pageNumber - b.pageNumber);
  } finally {
    await parser.destroy();
  }
}
