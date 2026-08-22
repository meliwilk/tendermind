import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import {
  COMPANY_MEMORY_DOC_TYPES,
  type CompanyMemoryDocType,
  type Contradiction,
  type IngestSummary,
} from "../../types";
import styles from "./AddCompanyKnowledgeDrawer.module.css";

export interface AddCompanyKnowledgeDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called with the raw files a user dropped or picked, for upload handling upstream. */
  onFilesSelected: (files: File[]) => void;
  onConnectSharePoint: () => void;
  onConnectGoogleDrive: () => void;
  onPasteText: () => void;
  selectedDocType: CompanyMemoryDocType | null;
  onSelectDocType: (docType: CompanyMemoryDocType) => void;
  /** Present once at least one file has started ingesting. */
  ingestSummary?: IngestSummary | null;
  contradiction?: Contradiction | null;
}

export function AddCompanyKnowledgeDrawer({
  open,
  onClose,
  onFilesSelected,
  onConnectSharePoint,
  onConnectGoogleDrive,
  onPasteText,
  selectedDocType,
  onSelectDocType,
  ingestSummary,
  contradiction,
}: AddCompanyKnowledgeDrawerProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFilesSelected(files);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onFilesSelected(files);
    event.target.value = "";
  };

  const handleDropzoneKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        aria-label="Close"
        className={styles.overlayDismiss}
        onClick={onClose}
      />
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Add to Company Memory">
        <div className={styles.header}>
          <div className={styles.title}>Add to Company Memory</div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>

        <button
          type="button"
          className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={handleDropzoneKeyDown}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
        >
          <div className={styles.dropzoneTitle}>Drag files here</div>
          <div className={styles.dropzoneHint}>PDF · DOCX · XLSX · PPTX · CSV</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.pptx,.csv"
            className={styles.hiddenInput}
            onChange={handleFileInputChange}
          />
        </button>

        <div className={styles.connectorRow}>
          <button type="button" className={styles.connectorButton} onClick={onConnectSharePoint}>
            Connect SharePoint
          </button>
          <button type="button" className={styles.connectorButton} onClick={onConnectGoogleDrive}>
            Connect Google Drive
          </button>
          <button type="button" className={styles.connectorButton} onClick={onPasteText}>
            Paste text
          </button>
        </div>

        <div className={styles.sectionLabel}>How should TenderMind treat these documents?</div>
        <div className={styles.docTypeRow}>
          {COMPANY_MEMORY_DOC_TYPES.map((docType) => (
            <button
              key={docType}
              type="button"
              className={`${styles.docTypeChip} ${
                selectedDocType === docType ? styles.docTypeChipActive : ""
              }`}
              onClick={() => onSelectDocType(docType)}
              aria-pressed={selectedDocType === docType}
            >
              {docType}
            </button>
          ))}
        </div>

        {ingestSummary && (
          <div className={styles.ingestCard}>
            <div className={styles.ingestHeader}>
              <div className={styles.ingestFileName}>{ingestSummary.fileName}</div>
              <div className={styles.ingestFileSize}>{ingestSummary.fileSizeLabel}</div>
            </div>
            <div className={styles.ingestSteps}>
              {ingestSummary.steps.map((step) => (
                <div className={styles.ingestStep} key={step.label}>
                  <span
                    className={`${styles.ingestStepTick} ${
                      step.status === "done"
                        ? styles.ingestStepTickDone
                        : step.status === "active"
                          ? styles.ingestStepTickActive
                          : styles.ingestStepTickPending
                    }`}
                  >
                    {step.status === "done" ? "✓" : step.status === "active" ? "●" : "○"}
                  </span>
                  <span
                    className={
                      step.status === "done" ? styles.ingestStepLabelDone : styles.ingestStepLabelActive
                    }
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            {ingestSummary.steps.every((step) => step.status === "done") && (
              <div className={styles.ingestSummaryGrid}>
                <div>
                  <div className={styles.ingestStat}>{ingestSummary.newFacts}</div>
                  <div className={styles.ingestStatLabel}>new facts</div>
                </div>
                <div>
                  <div className={styles.ingestStat}>{ingestSummary.updatedFacts}</div>
                  <div className={styles.ingestStatLabel}>updated facts</div>
                </div>
                <div>
                  <div className={`${styles.ingestStat} ${styles.ingestStatBad}`}>
                    {ingestSummary.contradictions}
                  </div>
                  <div className={styles.ingestStatLabel}>contradictions</div>
                </div>
              </div>
            )}
          </div>
        )}

        {contradiction && (
          <div className={styles.contradiction}>
            <div className={styles.contradictionHeadline}>{contradiction.headline}</div>
            <div className={styles.contradictionSources}>
              {contradiction.sources.map((source) => (
                <div className={styles.contradictionSourceRow} key={source.label}>
                  <span className={styles.contradictionSourceLabel}>{source.label}</span>
                  <span className={styles.contradictionSourceValue}>{source.value}</span>
                </div>
              ))}
            </div>
            <div className={styles.contradictionActions}>
              <button
                type="button"
                className={styles.contradictionPrimary}
                onClick={() => contradiction.onUseSource(contradiction.sources[0])}
              >
                Use {contradiction.sources[0]?.label}
              </button>
              <button
                type="button"
                className={styles.contradictionSecondary}
                onClick={contradiction.onReviewSources}
              >
                Review sources
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
