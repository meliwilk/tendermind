import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  BidRunRecord,
  CompanyMemoryFile,
  Contradiction,
  Coverage,
  IngestResult,
  TenderRecord,
} from "./types.js";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");
const COMPANY_MEMORY_PATH = path.join(DATA_DIR, "company_memory.json");
const CONTRADICTIONS_DIR = path.join(DATA_DIR, "contradictions");
const BID_HISTORY_DIR = path.join(DATA_DIR, "bid_history");
const TENDERS_DIR = path.join(DATA_DIR, "tenders");

/**
 * Seeded from memory/Sample_Company_Profile_TenderMind.pdf (Meridian Infra-EPC),
 * per the fixture mapping table in memory.md §6. Category counts are a rough
 * extraction estimate — legal/registration facts (CIN, GST, PAN, PWD class,
 * litigation declaration) into "contracting"; the 5-year financial table and
 * bonding capacity into "pricing"; company overview, personnel, equipment, and
 * past projects into "operational"; insurance, ISO certs, and safety metrics
 * into "compliance". Cybersecurity is seeded at zero deliberately — the source
 * document has no data-protection, IT security, or incident-response content
 * at all, which is a real coverage gap, not a missed extraction.
 */
const DEFAULT_COMPANY_MEMORY: CompanyMemoryFile = {
  factCount: 77,
  documentCount: 1,
  categoryFactCounts: { contracting: 11, pricing: 18, operational: 28, compliance: 20, cybersecurity: 0 },
  categoryTargets: { contracting: 40, pricing: 25, operational: 30, compliance: 35, cybersecurity: 15 },
};

async function ensureDirs(): Promise<void> {
  await mkdir(CONTRADICTIONS_DIR, { recursive: true });
  await mkdir(BID_HISTORY_DIR, { recursive: true });
  await mkdir(TENDERS_DIR, { recursive: true });
}

async function readCompanyMemory(): Promise<CompanyMemoryFile> {
  await ensureDirs();
  try {
    const raw = await readFile(COMPANY_MEMORY_PATH, "utf-8");
    return JSON.parse(raw) as CompanyMemoryFile;
  } catch {
    await writeFile(COMPANY_MEMORY_PATH, JSON.stringify(DEFAULT_COMPANY_MEMORY, null, 2));
    return DEFAULT_COMPANY_MEMORY;
  }
}

async function writeCompanyMemory(memory: CompanyMemoryFile): Promise<void> {
  await writeFile(COMPANY_MEMORY_PATH, JSON.stringify(memory, null, 2));
}

export async function getCoverage(): Promise<Coverage> {
  const memory = await readCompanyMemory();
  const categories = Object.keys(memory.categoryTargets) as (keyof typeof memory.categoryTargets)[];
  const byCategory = Object.fromEntries(
    categories.map((c) => [
      c,
      Math.min(100, Math.round((memory.categoryFactCounts[c] / memory.categoryTargets[c]) * 100)),
    ]),
  ) as unknown as Coverage["byCategory"];
  const overallPct = Math.round(
    categories.reduce((sum, c) => sum + byCategory[c], 0) / categories.length,
  );
  const gaps = categories
    .filter((c) => byCategory[c] < 60)
    .map((c) => `Low coverage in ${c} (${byCategory[c]}%).`);

  return {
    overallPct,
    byCategory,
    gaps,
    factCount: memory.factCount,
    documentCount: memory.documentCount,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function writeContradiction(contradiction: Contradiction): Promise<void> {
  await writeFile(
    path.join(CONTRADICTIONS_DIR, `${contradiction.id}.json`),
    JSON.stringify(contradiction, null, 2),
  );
}

export async function listOpenContradictions(): Promise<Contradiction[]> {
  await ensureDirs();
  const files = await readdir(CONTRADICTIONS_DIR);
  const all = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => JSON.parse(await readFile(path.join(CONTRADICTIONS_DIR, f), "utf-8")) as Contradiction),
  );
  return all.filter((c) => c.status === "open");
}

export async function resolveContradiction(id: string, chosenSourceLabel: string): Promise<void> {
  const filePath = path.join(CONTRADICTIONS_DIR, `${id}.json`);
  const raw = await readFile(filePath, "utf-8");
  const contradiction = JSON.parse(raw) as Contradiction;
  contradiction.status = "resolved";
  contradiction.resolvedSourceLabel = chosenSourceLabel;
  await writeFile(filePath, JSON.stringify(contradiction, null, 2));
}

/**
 * No document-extraction pipeline exists yet (that's tender-intake.md's unbuilt LLM
 * agent). This persists real ingestion state — fact/document counts, an open
 * contradiction on disk — using a simulated diff result, so the storage half of
 * memory.md's contract is real even though the extraction half isn't built.
 */
export async function ingestDocument(
  fileName: string,
  fileSizeBytes: number,
  docType: string | null,
): Promise<IngestResult> {
  const memory = await readCompanyMemory();

  const newFacts = 31;
  const updatedFacts = 6;
  memory.factCount += newFacts + updatedFacts;
  memory.documentCount += 1;

  const category = docTypeToCategory(docType);
  memory.categoryFactCounts[category] += newFacts;
  await writeCompanyMemory(memory);

  const contradiction: Contradiction = {
    id: randomUUID(),
    headline: "Payment terms appear inconsistent.",
    sources: [
      { label: "2025 Commercial Policy", value: "maximum 45 days" },
      { label: "2026 Standard Terms", value: "maximum 60 days" },
    ],
    status: "open",
    createdAt: new Date().toISOString(),
  };
  await writeContradiction(contradiction);

  return {
    fileName,
    fileSizeLabel: formatFileSize(fileSizeBytes),
    newFacts,
    updatedFacts,
    contradictions: [contradiction],
  };
}

function docTypeToCategory(docType: string | null): keyof CompanyMemoryFile["categoryFactCounts"] {
  switch (docType) {
    case "Pricing / rate card":
    case "Financial assumptions":
      return "pricing";
    case "Legal / contract":
    case "Company policy":
      return "contracting";
    case "Compliance":
      return "compliance";
    case "Capability statement":
      return "operational";
    default:
      return "operational";
  }
}

export async function recordBidRun(
  input: Omit<BidRunRecord, "id" | "createdAt">,
): Promise<BidRunRecord> {
  await ensureDirs();
  const record: BidRunRecord = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await writeFile(path.join(BID_HISTORY_DIR, `${record.id}.json`), JSON.stringify(record, null, 2));
  return record;
}

export async function listBidRuns(): Promise<BidRunRecord[]> {
  await ensureDirs();
  const files = await readdir(BID_HISTORY_DIR);
  const all = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => JSON.parse(await readFile(path.join(BID_HISTORY_DIR, f), "utf-8")) as BidRunRecord),
  );
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBidRun(id: string): Promise<BidRunRecord | null> {
  try {
    const raw = await readFile(path.join(BID_HISTORY_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as BidRunRecord;
  } catch {
    return null;
  }
}

export async function saveTenderRecord(
  input: Omit<TenderRecord, "id" | "createdAt">,
): Promise<TenderRecord> {
  await ensureDirs();
  const record: TenderRecord = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await writeFile(path.join(TENDERS_DIR, `${record.id}.json`), JSON.stringify(record, null, 2));
  return record;
}

export async function listTenderRecords(): Promise<TenderRecord[]> {
  await ensureDirs();
  const files = await readdir(TENDERS_DIR);
  const all = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => JSON.parse(await readFile(path.join(TENDERS_DIR, f), "utf-8")) as TenderRecord),
  );
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTenderRecord(id: string): Promise<TenderRecord | null> {
  try {
    const raw = await readFile(path.join(TENDERS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as TenderRecord;
  } catch {
    return null;
  }
}
