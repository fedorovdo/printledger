"use client";

import { ChangeEvent, useCallback, useRef, useState } from "react";

import { SidePanel } from "@/components/SidePanel";
import { ApiError, postFormData } from "@/lib/api";
import { demoReadOnlyMessage, isDemoMode } from "@/lib/demoMode";
import { useI18n } from "@/lib/i18n";
import type {
  CartridgeInventoryImportApplyResponse,
  CartridgeInventoryImportPreviewResponse,
  CartridgeInventoryImportPreviewRow,
} from "@/lib/types";

const MAX_XLSX_SIZE = 5 * 1024 * 1024;

type CartridgeInventoryExcelPanelProps = {
  open: boolean;
  onApplied: () => Promise<boolean>;
  onClose: () => void;
};

export function CartridgeInventoryExcelPanel({ open, onApplied, onClose }: CartridgeInventoryExcelPanelProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const applyRequestActive = useRef(false);
  const previewRequestActive = useRef(false);
  const previewRequestId = useRef(0);
  const workflowVersion = useRef(0);
  const selectedFileRef = useRef<File | null>(null);
  const previewedFileRef = useRef<File | null>(null);
  const snapshotHashRef = useRef<string | null>(null);
  const panelOpenRef = useRef(open);
  panelOpenRef.current = open;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CartridgeInventoryImportPreviewResponse | null>(null);
  const [snapshotHash, setSnapshotHash] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<CartridgeInventoryImportApplyResponse | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const demoMode = isDemoMode();
  const busy = previewing || applying;

  const resetWorkflow = useCallback(() => {
    workflowVersion.current += 1;
    previewRequestId.current += 1;
    selectedFileRef.current = null;
    previewedFileRef.current = null;
    snapshotHashRef.current = null;
    setSelectedFile(null);
    setPreview(null);
    setSnapshotHash(null);
    setApplyResult(null);
    setWorkflowError(null);
    setRefreshWarning(null);
    setStale(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = useCallback(() => {
    if (previewRequestActive.current || applyRequestActive.current) {
      return;
    }
    resetWorkflow();
    onClose();
  }, [onClose, resetWorkflow]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (applyRequestActive.current) {
      return;
    }
    const file = event.target.files?.[0] ?? null;
    workflowVersion.current += 1;
    previewRequestId.current += 1;
    selectedFileRef.current = null;
    previewedFileRef.current = null;
    snapshotHashRef.current = null;
    setSelectedFile(null);
    setPreview(null);
    setSnapshotHash(null);
    setApplyResult(null);
    setWorkflowError(null);
    setRefreshWarning(null);
    setStale(false);

    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setWorkflowError(t.inventoryXlsxOnly);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_XLSX_SIZE) {
      setWorkflowError(t.inventoryFileTooLarge);
      event.target.value = "";
      return;
    }
    selectedFileRef.current = file;
    setSelectedFile(file);
  }

  async function requestPreview() {
    const fileToPreview = selectedFileRef.current;
    if (!fileToPreview || previewRequestActive.current || applyRequestActive.current || demoMode) {
      if (!fileToPreview) {
        setWorkflowError(t.inventorySelectFileFirst);
      }
      return;
    }

    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    const requestWorkflowVersion = workflowVersion.current;
    previewRequestActive.current = true;
    setPreviewing(true);
    setWorkflowError(null);
    setRefreshWarning(null);
    setApplyResult(null);
    setPreview(null);
    previewedFileRef.current = null;
    snapshotHashRef.current = null;
    setSnapshotHash(null);
    setStale(false);
    try {
      const formData = new FormData();
      formData.append("file", fileToPreview, fileToPreview.name);
      const result = await postFormData<CartridgeInventoryImportPreviewResponse>(
        "/api/cartridge-inventory/import/preview",
        formData,
      );
      if (
        !panelOpenRef.current
        || previewRequestId.current !== requestId
        || workflowVersion.current !== requestWorkflowVersion
        || selectedFileRef.current !== fileToPreview
      ) {
        return;
      }
      previewedFileRef.current = fileToPreview;
      snapshotHashRef.current = result.summary.snapshot_hash;
      setPreview(result);
      setSnapshotHash(result.summary.snapshot_hash);
    } catch (error) {
      if (
        panelOpenRef.current
        && previewRequestId.current === requestId
        && workflowVersion.current === requestWorkflowVersion
        && selectedFileRef.current === fileToPreview
      ) {
        setWorkflowError(error instanceof Error ? error.message : t.error);
      }
    } finally {
      previewRequestActive.current = false;
      setPreviewing(false);
    }
  }

  async function applyInventory() {
    const fileToApply = previewedFileRef.current;
    const hashToApply = snapshotHashRef.current;
    if (
      !fileToApply
      || selectedFileRef.current !== fileToApply
      || !preview
      || !hashToApply
      || snapshotHash !== hashToApply
      || preview.summary.error_rows > 0
      || stale
      || applyRequestActive.current
      || previewRequestActive.current
      || demoMode
    ) {
      return;
    }

    const predictedTransactions = preview.rows.reduce(
      (count, row) => count + Number(row.delta_new !== null && row.delta_new !== 0)
        + Number(row.delta_refilled !== null && row.delta_refilled !== 0),
      0,
    );
    const confirmation = t.inventoryApplyConfirm
      .replace("{models}", String(preview.summary.changed_rows))
      .replace("{transactions}", String(predictedTransactions));
    if (!window.confirm(confirmation)) {
      return;
    }
    if (
      selectedFileRef.current !== fileToApply
      || previewedFileRef.current !== fileToApply
      || snapshotHashRef.current !== hashToApply
    ) {
      return;
    }

    const applyWorkflowVersion = workflowVersion.current;
    applyRequestActive.current = true;
    setApplying(true);
    setWorkflowError(null);
    setRefreshWarning(null);
    setApplyResult(null);
    let result: CartridgeInventoryImportApplyResponse;
    try {
      const formData = new FormData();
      formData.append("file", fileToApply, fileToApply.name);
      formData.append("snapshot_hash", hashToApply);
      result = await postFormData<CartridgeInventoryImportApplyResponse>(
        "/api/cartridge-inventory/import/apply",
        formData,
      );
    } catch (error) {
      previewedFileRef.current = null;
      snapshotHashRef.current = null;
      setSnapshotHash(null);
      setStale(true);
      if (error instanceof ApiError && error.status === 409) {
        setWorkflowError(t.inventoryStalePreview);
      } else if (error instanceof ApiError && error.status === 400) {
        setWorkflowError(error.message);
      } else {
        setWorkflowError(error instanceof Error ? error.message : t.error);
      }
      return;
    } finally {
      applyRequestActive.current = false;
      setApplying(false);
    }

    previewedFileRef.current = null;
    snapshotHashRef.current = null;
    setApplyResult(result);
    setPreview(null);
    setSnapshotHash(null);
    setStale(false);

    try {
      const refreshed = await onApplied();
      if (!refreshed && panelOpenRef.current && workflowVersion.current === applyWorkflowVersion) {
        setRefreshWarning(t.inventoryAppliedRefreshFailed);
      }
    } catch {
      if (panelOpenRef.current && workflowVersion.current === applyWorkflowVersion) {
        setRefreshWarning(t.inventoryAppliedRefreshFailed);
      }
    }
  }

  const canApply = Boolean(
    selectedFile
    && selectedFile === selectedFileRef.current
    && selectedFile === previewedFileRef.current
    && preview
    && snapshotHash
    && snapshotHash === snapshotHashRef.current
    && preview.summary.error_rows === 0
    && !stale
    && !busy
    && !demoMode,
  );

  return (
    <SidePanel onClose={handleClose} open={open} size="wide" title={t.excelInventory}>
      <div className="inventory-excel-panel">
        {demoMode ? <div className="message info" role="status">{demoReadOnlyMessage()}</div> : null}
        {workflowError ? <div className="message error" role="alert">{workflowError}</div> : null}
        {refreshWarning ? <div className="message info" role="status">{refreshWarning}</div> : null}
        {stale ? <p className="inventory-workflow-note">{t.inventoryNewPreviewRequired}</p> : null}
        {applyResult ? (
          <section aria-live="polite" className="inventory-success-summary">
            <h3>{t.inventoryApplied}</h3>
            <dl>
              <div><dt>{t.inventoryChangedModels}</dt><dd>{applyResult.changed_models}</dd></div>
              <div><dt>{t.inventoryTransactionsCreated}</dt><dd>{applyResult.transactions_created}</dd></div>
              <div><dt>{t.inventoryCorrectionPlus}</dt><dd>{applyResult.correction_plus_total}</dd></div>
              <div><dt>{t.inventoryCorrectionMinus}</dt><dd>{applyResult.correction_minus_total}</dd></div>
            </dl>
          </section>
        ) : null}

        <section className="inventory-file-section">
          <label htmlFor="inventory-xlsx-file">{t.inventorySelectFile}</label>
          <input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy || demoMode}
            id="inventory-xlsx-file"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          {selectedFile ? <p className="inventory-file-name">{t.filename}: <strong>{selectedFile.name}</strong></p> : null}
          <p className="inventory-workflow-note">{t.inventoryFileCheckHint}</p>
          <div className="inline-actions inventory-panel-actions">
            <button className="button secondary" disabled={!selectedFile || busy || demoMode} onClick={() => void requestPreview()} type="button">
              {previewing ? t.loading : t.inventoryPreview}
            </button>
            <button className="button" disabled={!canApply} onClick={() => void applyInventory()} type="button">
              {applying ? t.loading : t.inventoryApply}
            </button>
            <button className="button secondary" disabled={busy} onClick={handleClose} type="button">{t.cancel}</button>
          </div>
        </section>

        {preview ? (
          <>
            <section aria-label={t.inventoryPreviewSummary} className="inventory-summary">
              <InventoryMetric label={t.inventoryTotalRows} value={preview.summary.total_rows} />
              <InventoryMetric label={t.inventoryMatchedRows} value={preview.summary.matched_rows} />
              <InventoryMetric label={t.inventoryChangedRows} value={preview.summary.changed_rows} tone="warning" />
              <InventoryMetric label={t.inventoryUnchangedRows} value={preview.summary.unchanged_rows} />
              <InventoryMetric label={t.inventoryErrorRows} value={preview.summary.error_rows} tone={preview.summary.error_rows > 0 ? "danger" : undefined} />
            </section>
            {preview.summary.error_rows > 0 ? (
              <div className="message error" role="alert">{t.inventoryFileHasErrors}</div>
            ) : null}
            <p className="inventory-installed-note">{t.inventoryInstalledReferenceHint}</p>
            <div className="table-wrap inventory-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>{t.inventoryRow}</th>
                    <th>{t.model}</th>
                    <th>{t.inventoryCurrentNew}</th>
                    <th>{t.inventoryActualNew}</th>
                    <th>{t.inventoryDeltaNew}</th>
                    <th>{t.inventoryCurrentRefilled}</th>
                    <th>{t.inventoryActualRefilled}</th>
                    <th>{t.inventoryDeltaRefilled}</th>
                    <th>{t.installed}</th>
                    <th>{t.status}</th>
                    <th>{t.inventoryErrorsWarnings}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => <PreviewRow key={row.row_number} row={row} />)}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </SidePanel>
  );
}

function InventoryMetric({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" }) {
  return (
    <div className={`inventory-summary-item${tone ? ` ${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PreviewRow({ row }: { row: CartridgeInventoryImportPreviewRow }) {
  const { t } = useI18n();
  const statusLabels = {
    change: t.inventoryStatusChange,
    unchanged: t.inventoryStatusUnchanged,
    error: t.inventoryStatusError,
  };
  const messages = [
    ...row.errors.map((message) => ({ message, type: "error" })),
    ...row.warnings.map((message) => ({ message, type: "warning" })),
  ];
  const modelLabel = [row.vendor, row.model_name].filter(Boolean).join(" ") || "—";

  return (
    <tr className={`inventory-row-${row.status}`}>
      <td>{row.row_number}</td>
      <td>
        <strong>{modelLabel}</strong>
        {row.purchase_sku ? <small>{row.purchase_sku}</small> : null}
        {row.comment ? <small>{t.comment}: {row.comment}</small> : null}
      </td>
      <td>{displayNumber(row.current_new)}</td>
      <td>{displayNumber(row.actual_new)}</td>
      <td className={deltaClass(row.delta_new)}>{displayDelta(row.delta_new)}</td>
      <td>{displayNumber(row.current_refilled)}</td>
      <td>{displayNumber(row.actual_refilled)}</td>
      <td className={deltaClass(row.delta_refilled)}>{displayDelta(row.delta_refilled)}</td>
      <td>{displayNumber(row.installed_total)}</td>
      <td><span className={`badge ${row.status === "error" ? "danger" : row.status === "change" ? "warning" : "ok"}`}>{statusLabels[row.status]}</span></td>
      <td>
        {messages.length > 0 ? (
          <ul className="inventory-row-messages">
            {messages.map(({ message, type }, index) => <li className={type} key={`${type}-${index}`}>{message}</li>)}
          </ul>
        ) : "—"}
      </td>
    </tr>
  );
}

function displayNumber(value: number | null) {
  return value === null ? "—" : value;
}

function displayDelta(value: number | null) {
  if (value === null) {
    return "—";
  }
  return value > 0 ? `+${value}` : String(value);
}

function deltaClass(value: number | null) {
  if (value === null || value === 0) {
    return "";
  }
  return value > 0 ? "delta-positive" : "delta-negative";
}
