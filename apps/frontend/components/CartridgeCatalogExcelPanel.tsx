"use client";

import { ChangeEvent, useCallback, useRef, useState } from "react";

import { SidePanel } from "@/components/SidePanel";
import { ApiError, postFormData } from "@/lib/api";
import { demoReadOnlyMessage, isDemoMode } from "@/lib/demoMode";
import { useI18n } from "@/lib/i18n";
import { formatCartridgeType } from "@/lib/labels";
import type {
  CartridgeCatalogImportApplyResponse,
  CartridgeCatalogImportPreviewResponse,
  CartridgeCatalogImportPreviewRow,
} from "@/lib/types";

const MAX_XLSX_SIZE = 5 * 1024 * 1024;

type CartridgeCatalogExcelPanelProps = {
  open: boolean;
  onApplied: () => Promise<boolean>;
  onClose: () => void;
};

export function CartridgeCatalogExcelPanel({ open, onApplied, onClose }: CartridgeCatalogExcelPanelProps) {
  const { locale, t } = useI18n();
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
  const [preview, setPreview] = useState<CartridgeCatalogImportPreviewResponse | null>(null);
  const [snapshotHash, setSnapshotHash] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<CartridgeCatalogImportApplyResponse | null>(null);
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
    if (previewRequestActive.current || applyRequestActive.current) {
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
      const result = await postFormData<CartridgeCatalogImportPreviewResponse>(
        "/api/cartridge-catalog/import/preview",
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

  async function applyCatalog() {
    const fileToApply = previewedFileRef.current;
    const hashToApply = snapshotHashRef.current;
    const previewToApply = preview;
    if (
      !fileToApply
      || selectedFileRef.current !== fileToApply
      || !previewToApply
      || !hashToApply
      || snapshotHash !== hashToApply
      || previewToApply.summary.error_rows > 0
      || previewToApply.summary.create_rows <= 0
      || stale
      || applyRequestActive.current
      || previewRequestActive.current
      || demoMode
    ) {
      return;
    }

    const confirmation = t.catalogImportApplyConfirm
      .replace("{create}", String(previewToApply.summary.create_rows))
      .replace("{existing}", String(previewToApply.summary.existing_rows));
    if (!window.confirm(confirmation)) {
      return;
    }
    if (
      selectedFileRef.current !== fileToApply
      || previewedFileRef.current !== fileToApply
      || snapshotHashRef.current !== hashToApply
      || preview !== previewToApply
    ) {
      return;
    }

    const applyWorkflowVersion = workflowVersion.current;
    applyRequestActive.current = true;
    setApplying(true);
    setWorkflowError(null);
    setRefreshWarning(null);
    setApplyResult(null);
    let result: CartridgeCatalogImportApplyResponse;

    try {
      const formData = new FormData();
      formData.append("file", fileToApply, fileToApply.name);
      formData.append("snapshot_hash", hashToApply);
      result = await postFormData<CartridgeCatalogImportApplyResponse>(
        "/api/cartridge-catalog/import/apply",
        formData,
      );
    } catch (error) {
      if (
        panelOpenRef.current
        && workflowVersion.current === applyWorkflowVersion
        && selectedFileRef.current === fileToApply
      ) {
        if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
          previewedFileRef.current = null;
          snapshotHashRef.current = null;
          setSnapshotHash(null);
          setStale(true);
          setWorkflowError(error.status === 409 ? t.catalogImportStalePreview : error.message);
        } else {
          setWorkflowError(error instanceof Error ? error.message : t.error);
        }
      }
      return;
    } finally {
      applyRequestActive.current = false;
      setApplying(false);
    }

    if (
      !panelOpenRef.current
      || workflowVersion.current !== applyWorkflowVersion
      || selectedFileRef.current !== fileToApply
    ) {
      return;
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
        setRefreshWarning(t.catalogImportAppliedRefreshFailed);
      }
    } catch {
      if (panelOpenRef.current && workflowVersion.current === applyWorkflowVersion) {
        setRefreshWarning(t.catalogImportAppliedRefreshFailed);
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
    && preview.summary.create_rows > 0
    && !stale
    && !busy
    && !demoMode,
  );

  return (
    <SidePanel onClose={handleClose} open={open} size="wide" title={t.catalogImportTitle}>
      <div className="inventory-excel-panel">
        {demoMode ? <div className="message info" role="status">{demoReadOnlyMessage()}</div> : null}
        {workflowError ? <div className="message error" role="alert">{workflowError}</div> : null}
        {refreshWarning ? <div className="message info" role="status">{refreshWarning}</div> : null}
        {stale ? <p className="inventory-workflow-note">{t.catalogImportNewPreviewRequired}</p> : null}
        {applyResult ? (
          <>
            <section aria-live="polite" className="inventory-success-summary catalog-import-success">
              <h3>{t.catalogImportApplied}</h3>
              <dl>
                <div><dt>{t.catalogImportModelsCreated}</dt><dd>{applyResult.models_created}</dd></div>
                <div><dt>{t.catalogImportExistingRows}</dt><dd>{applyResult.existing_models}</dd></div>
                <div><dt>{t.catalogImportModelsProcessed}</dt><dd>{applyResult.models_processed}</dd></div>
              </dl>
            </section>
            <div className="message info" role="status">{t.catalogImportNextInventoryHint}</div>
          </>
        ) : null}

        <section className="inventory-file-section">
          <label htmlFor="catalog-xlsx-file">{t.catalogImportSelectFile}</label>
          <input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy || demoMode}
            id="catalog-xlsx-file"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          {selectedFile ? <p className="inventory-file-name">{t.filename}: <strong>{selectedFile.name}</strong></p> : null}
          <p className="inventory-workflow-note">{t.catalogImportFileCheckHint}</p>
          <div className="inline-actions inventory-panel-actions">
            <button className="button secondary" disabled={!selectedFile || busy || demoMode} onClick={() => void requestPreview()} type="button">
              {previewing ? t.loading : t.inventoryPreview}
            </button>
            <button className="button" disabled={!canApply} onClick={() => void applyCatalog()} type="button">
              {applying ? t.loading : t.catalogImportApply}
            </button>
            <button className="button secondary" disabled={busy} onClick={handleClose} type="button">{t.cancel}</button>
          </div>
        </section>

        {preview ? (
          <>
            <section aria-label={t.catalogImportPreviewSummary} className="inventory-summary catalog-import-summary">
              <CatalogMetric label={t.inventoryTotalRows} value={preview.summary.total_rows} />
              <CatalogMetric label={t.catalogImportExistingRows} value={preview.summary.existing_rows} />
              <CatalogMetric label={t.catalogImportCreateRows} tone="warning" value={preview.summary.create_rows} />
              <CatalogMetric label={t.inventoryErrorRows} tone={preview.summary.error_rows > 0 ? "danger" : undefined} value={preview.summary.error_rows} />
            </section>
            {preview.summary.error_rows > 0 ? (
              <div className="message error" role="alert">{t.catalogImportFileHasErrors}</div>
            ) : preview.summary.create_rows === 0 ? (
              <div className="message info" role="status">{t.catalogImportNothingToCreate}</div>
            ) : null}
            <div className="table-wrap inventory-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>{t.inventoryRow}</th>
                    <th>{t.vendor}</th>
                    <th>{t.model}</th>
                    <th>{t.sku}</th>
                    <th>{t.cartridgeType}</th>
                    <th>{t.minStock}</th>
                    <th>{t.status}</th>
                    <th>{t.inventoryErrorsWarnings}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => <CatalogPreviewRow key={row.row_number} locale={locale} row={row} />)}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </SidePanel>
  );
}

function CatalogMetric({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" }) {
  return (
    <div className={`inventory-summary-item${tone ? ` ${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CatalogPreviewRow({ locale, row }: { locale: "ru" | "en"; row: CartridgeCatalogImportPreviewRow }) {
  const { t } = useI18n();
  const statusLabels = {
    create: t.catalogImportStatusCreate,
    existing: t.catalogImportStatusExisting,
    error: t.inventoryStatusError,
  };
  const messages = [
    ...row.errors.map((message) => ({ message, type: "error" })),
    ...row.warnings.map((message) => ({ message, type: "warning" })),
  ];
  const rowClass = row.status === "create" ? "inventory-row-change" : row.status === "existing" ? "inventory-row-unchanged" : "inventory-row-error";
  const badgeClass = row.status === "error" ? "danger" : row.status === "create" ? "warning" : "ok";

  return (
    <tr className={rowClass}>
      <td>{row.row_number}</td>
      <td>{row.vendor ?? "—"}</td>
      <td>
        <strong>{row.model_name ?? "—"}</strong>
        {row.notes ? <small>{t.notes}: {row.notes}</small> : null}
      </td>
      <td>{row.purchase_sku ?? "—"}</td>
      <td>{row.cartridge_type ? formatCartridgeType(row.cartridge_type, locale) : "—"}</td>
      <td>{row.min_stock_level ?? "—"}</td>
      <td><span className={`badge ${badgeClass}`}>{statusLabels[row.status]}</span></td>
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
