import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { runLegalAgent } from "./agents/legal/index.js";
import { runExtraction } from "./extraction/service.js";
import {
  getBidRun,
  getCoverage,
  getTenderRecord,
  ingestDocument,
  listBidRuns,
  listOpenContradictions,
  listTenderRecords,
  recordBidRun,
  resolveContradiction,
  saveTenderRecord,
} from "./store.js";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function uniqueDocumentId(fileName: string, index: number, used: Set<string>): string {
  const base = fileName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]+/g, "_") || `doc_${index}`;
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  used.add(candidate);
  return candidate;
}

app.post("/api/agents/legal", upload.array("documents"), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    res.status(400).json({ error: "at least one PDF document is required (field: documents)" });
    return;
  }

  const used = new Set<string>();
  const documents = files.map((file, index) => ({
    documentId: uniqueDocumentId(file.originalname, index, used),
    buffer: file.buffer,
  }));

  const jurisdictionAssumed =
    typeof req.body?.jurisdiction === "string" && req.body.jurisdiction.trim().length > 0
      ? req.body.jurisdiction.trim()
      : undefined;

  try {
    const result = await runLegalAgent(documents, { jurisdictionAssumed });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "legal agent run failed" });
  }
});

app.get("/api/memory/coverage", async (_req, res) => {
  res.json(await getCoverage());
});

app.get("/api/memory/contradictions", async (_req, res) => {
  res.json(await listOpenContradictions());
});

app.post("/api/memory/contradictions/:id/resolve", async (req, res) => {
  const { chosenSourceLabel } = req.body as { chosenSourceLabel?: string };
  if (!chosenSourceLabel) {
    res.status(400).json({ error: "chosenSourceLabel is required" });
    return;
  }
  await resolveContradiction(req.params.id, chosenSourceLabel);
  res.status(204).end();
});

app.post("/api/memory/ingest", async (req, res) => {
  const { fileName, fileSizeBytes, docType } = req.body as {
    fileName?: string;
    fileSizeBytes?: number;
    docType?: string | null;
  };
  if (!fileName || typeof fileSizeBytes !== "number") {
    res.status(400).json({ error: "fileName and fileSizeBytes are required" });
    return;
  }
  res.json(await ingestDocument(fileName, fileSizeBytes, docType ?? null));
});

app.get("/api/bid-runs", async (_req, res) => {
  res.json(await listBidRuns());
});

app.get("/api/bid-runs/:id", async (req, res) => {
  const run = await getBidRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(run);
});

app.post("/api/bid-runs", async (req, res) => {
  const { name, deadline, owner, documents } = req.body as {
    name?: string;
    deadline?: string;
    owner?: string;
    documents?: { name: string; meta: string }[];
  };
  if (!name || !documents) {
    res.status(400).json({ error: "name and documents are required" });
    return;
  }
  const run = await recordBidRun({ name, deadline: deadline ?? "", owner: owner ?? "", documents });
  res.status(201).json(run);
});

app.get("/api/tenders", async (_req, res) => {
  res.json(await listTenderRecords());
});

app.get("/api/tenders/:id", async (req, res) => {
  const record = await getTenderRecord(req.params.id);
  if (!record) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(record);
});

// Tender Intake / Parsing agent (agents/skills/tender-intake.md): PDF upload
// in, structured Tender Workspace out. See backend/src/extraction/.
app.post("/api/tenders", upload.array("files"), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const { name, deadline, owner } = req.body as { name?: string; deadline?: string; owner?: string };
  if (!name || files.length === 0) {
    res.status(400).json({ error: "name and at least one PDF file (field: files) are required" });
    return;
  }

  try {
    const { workspace, engine } = await runExtraction(
      files.map((file) => ({ fileName: file.originalname, buffer: file.buffer })),
    );
    const record = await saveTenderRecord({
      name,
      deadline: deadline ?? "",
      owner: owner ?? "",
      documents: files.map((file) => ({
        name: file.originalname,
        meta: `${(file.size / 1024).toFixed(0)} KB`,
      })),
      extractionEngine: engine,
      workspace,
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "tender extraction failed" });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`Temporary memory service listening on http://localhost:${PORT}`);
});
