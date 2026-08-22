import { useEffect, useState } from "react";
import { AddCompanyKnowledgeDrawer } from "./components/AddCompanyKnowledgeDrawer/AddCompanyKnowledgeDrawer";
import { NewTenderModal } from "./components/NewTenderModal/NewTenderModal";
import { getCoverage, ingestDocument } from "./api/memoryClient";
import { analyzeTender, type TenderAnalysisResult } from "./api/tenderClient";
import type {
  CompanyMemoryDocType,
  Contradiction,
  IngestSummary,
  NewTenderFormValues,
} from "./types";
import styles from "./App.module.css";

type DrawerKind = "knowledge" | "newtender" | null;

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<TenderAnalysisResult | null>(null);

  const [companyMemoryStats, setCompanyMemoryStats] = useState({
    factCount: 0,
    documentCount: 0,
    typicalRunLabel: "Typical run 6–9 minutes",
  });

  useEffect(() => {
    getCoverage()
      .then((coverage) =>
        setCompanyMemoryStats((prev) => ({
          ...prev,
          factCount: coverage.factCount,
          documentCount: coverage.documentCount,
        })),
      )
      .catch((err) => console.error("Failed to load Company Memory coverage:", err));
  }, []);

  const closeDrawer = () => setOpenDrawer(null);

  const handleKnowledgeFilesSelected = async (files: File[]) => {
    const [first] = files;
    if (!first) return;
    try {
      const { summary, contradiction: newContradiction } = await ingestDocument(
        first,
        selectedDocType,
      );
      setIngestSummary(summary);
      setContradiction(newContradiction);
      const coverage = await getCoverage();
      setCompanyMemoryStats((prev) => ({
        ...prev,
        factCount: coverage.factCount,
        documentCount: coverage.documentCount,
      }));
    } catch (err) {
      console.error("Ingestion failed:", err);
    }
  };

  const handleTenderFilesSelected = (files: File[]) => {
    setTenderForm((prev) => ({
      ...prev,
      documents: [
        ...prev.documents,
        ...files.map((file) => ({
          name: file.name,
          meta: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          file,
        })),
      ],
    }));
  };

  const handleRemoveDocument = (index: number) => {
    setTenderForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const openNewTender = () => {
    setAnalyzeError(null);
    setAnalyzeResult(null);
    setOpenDrawer("newtender");
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeTender(tenderForm);
      setAnalyzeResult(result);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Tender analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
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
        <button type="button" className={styles.primaryButton} onClick={openNewTender}>
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
        companyMemoryStats={companyMemoryStats}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        analyzeError={analyzeError}
        analyzeResult={analyzeResult}
      />
    </div>
  );
}
