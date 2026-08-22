import { useState } from "react";
import { AddCompanyKnowledgeDrawer } from "./components/AddCompanyKnowledgeDrawer/AddCompanyKnowledgeDrawer";
import { NewTenderModal } from "./components/NewTenderModal/NewTenderModal";
import type {
  CompanyMemoryDocType,
  Contradiction,
  IngestSummary,
  NewTenderFormValues,
} from "./types";
import styles from "./App.module.css";

type DrawerKind = "knowledge" | "newtender" | null;

const COMPANY_MEMORY_STATS = {
  factCount: 2841,
  documentCount: 147,
  typicalRunLabel: "Typical run 6–9 minutes",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const [openDrawer, setOpenDrawer] = useState<DrawerKind>(null);

  const [selectedDocType, setSelectedDocType] = useState<CompanyMemoryDocType | null>(null);
  const [ingestSummary, setIngestSummary] = useState<IngestSummary | null>(null);
  const [contradiction, setContradiction] = useState<Contradiction | null>(null);

  const [tenderForm, setTenderForm] = useState<NewTenderFormValues>({
    name: "",
    deadline: "",
    owner: "",
    documents: [],
  });

  const closeDrawer = () => setOpenDrawer(null);

  const handleKnowledgeFilesSelected = (files: File[]) => {
    const [first] = files;
    if (!first) return;
    setIngestSummary({
      fileName: first.name,
      fileSizeLabel: formatFileSize(first.size),
      steps: [
        { label: "Reading document", status: "done" },
        { label: "Extracting commitments", status: "done" },
        { label: "Cross-checking existing company memory", status: "done" },
      ],
      newFacts: 31,
      updatedFacts: 6,
      contradictions: 2,
    });
    setContradiction({
      headline: "Payment terms appear inconsistent.",
      sources: [
        { label: "2025 Commercial Policy", value: "maximum 45 days" },
        { label: "2026 Standard Terms", value: "maximum 60 days" },
      ],
      onUseSource: (source) => {
        console.log("Use source:", source);
        setContradiction(null);
      },
      onReviewSources: () => console.log("Review sources"),
    });
  };

  const handleTenderFilesSelected = (files: File[]) => {
    setTenderForm((prev) => ({
      ...prev,
      documents: [
        ...prev.documents,
        ...files.map((file) => ({ name: file.name, meta: formatFileSize(file.size) })),
      ],
    }));
  };

  const handleRemoveDocument = (index: number) => {
    setTenderForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleAnalyze = () => {
    console.log("Analyzing tender:", tenderForm);
    closeDrawer();
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setOpenDrawer("knowledge")}
        >
          + Add company knowledge
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setOpenDrawer("newtender")}
        >
          Analyze new tender
        </button>
      </div>

      <AddCompanyKnowledgeDrawer
        open={openDrawer === "knowledge"}
        onClose={closeDrawer}
        onFilesSelected={handleKnowledgeFilesSelected}
        onConnectSharePoint={() => console.log("Connect SharePoint")}
        onConnectGoogleDrive={() => console.log("Connect Google Drive")}
        onPasteText={() => console.log("Paste text")}
        selectedDocType={selectedDocType}
        onSelectDocType={setSelectedDocType}
        ingestSummary={ingestSummary}
        contradiction={contradiction}
      />

      <NewTenderModal
        open={openDrawer === "newtender"}
        onClose={closeDrawer}
        values={tenderForm}
        onNameChange={(name) => setTenderForm((prev) => ({ ...prev, name }))}
        onDeadlineChange={(deadline) => setTenderForm((prev) => ({ ...prev, deadline }))}
        onOwnerChange={(owner) => setTenderForm((prev) => ({ ...prev, owner }))}
        onFilesSelected={handleTenderFilesSelected}
        onRemoveDocument={handleRemoveDocument}
        companyMemoryStats={COMPANY_MEMORY_STATS}
        onAnalyze={handleAnalyze}
      />
    </div>
  );
}
