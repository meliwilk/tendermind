import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import type { CompanyMemoryStats, NewTenderFormValues } from "../../types";
import styles from "./NewTenderModal.module.css";

export interface NewTenderModalProps {
  open: boolean;
  onClose: () => void;
  values: NewTenderFormValues;
  onNameChange: (name: string) => void;
  onDeadlineChange: (deadline: string) => void;
  onOwnerChange: (owner: string) => void;
  onFilesSelected: (files: File[]) => void;
  onRemoveDocument: (index: number) => void;
  companyMemoryStats: CompanyMemoryStats;
  onAnalyze: () => void;
}

export function NewTenderModal({
  open,
  onClose,
  values,
  onNameChange,
  onDeadlineChange,
  onOwnerChange,
  onFilesSelected,
  onRemoveDocument,
  companyMemoryStats,
  onAnalyze,
}: NewTenderModalProps) {
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

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onFilesSelected(files);
    event.target.value = "";
  };

  const canAnalyze = values.name.trim().length > 0 && values.documents.length > 0;

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        aria-label="Close"
        className={styles.overlayDismiss}
        onClick={onClose}
      />
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="New tender">
        <div className={styles.header}>
          <div className={styles.title}>New tender</div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>Tender / opportunity name</div>
          <input
            className={styles.textInput}
            type="text"
            value={values.name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Network Rail — Southern Region Maintenance Framework"
          />
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>Tender documents</div>
          <div className={styles.documentList}>
            {values.documents.map((doc, index) => (
              <div className={styles.documentRow} key={`${doc.name}-${index}`}>
                <span>{doc.name}</span>
                <span className={styles.documentMeta}>{doc.meta}</span>
                <button
                  type="button"
                  className={styles.documentRemove}
                  onClick={() => onRemoveDocument(index)}
                  aria-label={`Remove ${doc.name}`}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.addDocsButton}
              onClick={() => fileInputRef.current?.click()}
            >
              + Add documents
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.xlsx,.pptx,.csv"
              className={styles.hiddenInput}
              onChange={handleFileInputChange}
            />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div>
            <div className={styles.fieldLabel}>Submission deadline</div>
            <input
              className={styles.monoInput}
              type="datetime-local"
              value={values.deadline}
              onChange={(event) => onDeadlineChange(event.target.value)}
            />
          </div>
          <div>
            <div className={styles.fieldLabel}>Owner</div>
            <input
              className={styles.textInput}
              type="text"
              value={values.owner}
              onChange={(event) => onOwnerChange(event.target.value)}
              placeholder="Sarah Mitchell"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.analyzeButton}
            onClick={onAnalyze}
            disabled={!canAnalyze}
          >
            Analyze against Company Memory
          </button>
          <div className={styles.footerMeta}>
            {companyMemoryStats.factCount.toLocaleString()} facts ·{" "}
            {companyMemoryStats.documentCount.toLocaleString()} documents
            <br />
            {companyMemoryStats.typicalRunLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
