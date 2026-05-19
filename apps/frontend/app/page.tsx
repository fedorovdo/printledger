"use client";

import { useEffect, useState } from "react";

import { RefreshButton } from "@/components/RefreshButton";
import { EmptyRow, PageHeader, Message } from "@/components/Ui";
import { fetchJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dash, isActivePrinter, isRepairPrinter } from "@/lib/labels";
import type { CartridgeModel, CartridgeUsageAnalytics, CartridgeUsageAnalyticsRow, Printer } from "@/lib/types";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

type DashboardState = {
  backend: string;
  database: string;
  cartridgeModels: number;
  printers: number;
  archivedPrinters: number;
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardState | null>(null);
  const [cartridgeModels, setCartridgeModels] = useState<CartridgeModel[]>([]);
  const [usageDays, setUsageDays] = useState(30);
  const [selectedCartridgeModelId, setSelectedCartridgeModelId] = useState("");
  const [includeInactiveModels, setIncludeInactiveModels] = useState(false);
  const [analytics, setAnalytics] = useState<CartridgeUsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [health, db, cartridges, printers, archived] = await Promise.all([
        fetchJson<{ status: string }>("/health"),
        fetchJson<{ database: string }>("/api/db-check"),
        fetchJson<CartridgeModel[]>("/api/cartridge-models"),
        fetchJson<Printer[]>("/api/printers"),
        fetchJson<Printer[]>("/api/printers/archived"),
      ]);
      setCartridgeModels(cartridges);
      setData({
        backend: health.status,
        database: db.database,
        cartridgeModels: cartridges.length,
        printers: printers.filter((printer) => isActivePrinter(printer) || isRepairPrinter(printer)).length,
        archivedPrinters: archived.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const params = new URLSearchParams({ days: String(usageDays) });
      if (selectedCartridgeModelId) {
        params.set("cartridge_model_id", selectedCartridgeModelId);
      }
      if (includeInactiveModels) {
        params.set("include_inactive", "true");
      }
      setAnalytics(await fetchJson<CartridgeUsageAnalytics>(`/api/analytics/cartridge-usage?${params.toString()}`));
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function refreshDashboard() {
    await Promise.all([loadDashboard(), loadAnalytics()]);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [usageDays, selectedCartridgeModelId, includeInactiveModels]);

  useAutoRefresh(refreshDashboard, 30_000);

  useEffect(() => {
    if (includeInactiveModels || !selectedCartridgeModelId) {
      return;
    }
    const selectedModel = cartridgeModels.find((model) => model.id === Number(selectedCartridgeModelId));
    if (selectedModel && !selectedModel.is_active) {
      setSelectedCartridgeModelId("");
    }
  }, [cartridgeModels, includeInactiveModels, selectedCartridgeModelId]);

  return (
    <section>
      <PageHeader
        title={t.dashboard}
        action={
          <RefreshButton
            label={t.refresh}
            loading={loading || analyticsLoading}
            onClick={() => void refreshDashboard()}
          />
        }
      />
      <Message loading={loading} error={error} />
      {data && (
        <div className="metric-grid">
          <div className="metric-card">
            <span>{t.backendStatus}</span>
            <strong>{data.backend === "ok" ? t.ok : data.backend}</strong>
          </div>
          <div className="metric-card">
            <span>{t.databaseStatus}</span>
            <strong>{data.database === "ok" ? t.ok : data.database}</strong>
          </div>
          <div className="metric-card">
            <span>{t.cartridgeModels}</span>
            <strong>{data.cartridgeModels}</strong>
          </div>
          <div className="metric-card">
            <span>{t.printerCount}</span>
            <strong>{data.printers}</strong>
          </div>
          <div className="metric-card">
            <span>{t.archivedPrinters}</span>
            <strong>{data.archivedPrinters}</strong>
          </div>
        </div>
      )}
      <UsageAnalyticsPanel
        analytics={analytics}
        cartridgeModels={cartridgeModels}
        error={analyticsError}
        includeInactiveModels={includeInactiveModels}
        loading={analyticsLoading}
        selectedCartridgeModelId={selectedCartridgeModelId}
        setIncludeInactiveModels={setIncludeInactiveModels}
        setSelectedCartridgeModelId={setSelectedCartridgeModelId}
        setUsageDays={setUsageDays}
        usageDays={usageDays}
      />
    </section>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

function formatMonths(value: number | null) {
  return value === null ? dash(null) : formatNumber(value);
}

function selectedUsageRow(analytics: CartridgeUsageAnalytics | null): CartridgeUsageAnalyticsRow | null {
  return analytics?.rows[0] ?? null;
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function exportCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function csvFilename() {
  return `printledger_cartridge_usage_${new Date().toISOString().slice(0, 10)}.csv`;
}

function UsageAnalyticsPanel({
  analytics,
  cartridgeModels,
  error,
  includeInactiveModels,
  loading,
  selectedCartridgeModelId,
  setIncludeInactiveModels,
  setSelectedCartridgeModelId,
  setUsageDays,
  usageDays,
}: {
  analytics: CartridgeUsageAnalytics | null;
  cartridgeModels: CartridgeModel[];
  error: string | null;
  includeInactiveModels: boolean;
  loading: boolean;
  selectedCartridgeModelId: string;
  setIncludeInactiveModels: (value: boolean) => void;
  setSelectedCartridgeModelId: (value: string) => void;
  setUsageDays: (value: number) => void;
  usageDays: number;
}) {
  const { t } = useI18n();
  const selectedRow = selectedCartridgeModelId ? selectedUsageRow(analytics) : null;
  const noUsageData = Boolean(analytics && (analytics.rows.length === 0 || analytics.total_usage === 0));
  const selectableModels = includeInactiveModels ? cartridgeModels : cartridgeModels.filter((model) => model.is_active);

  function downloadAnalyticsCsv() {
    if (!analytics || analytics.rows.length === 0) {
      return;
    }
    if (selectedRow) {
      exportCsv(csvFilename(), [
        [t.model, selectedRow.model_name],
        [t.sku, selectedRow.purchase_sku],
        [t.usageInPeriod, selectedRow.usage_in_period],
        [t.avgMonthlyUsage, formatNumber(selectedRow.avg_monthly_usage)],
        [t.warehouseStock, selectedRow.current_stock_total],
        [t.stockEnoughFor, formatMonths(selectedRow.months_of_stock_left)],
        [t.purchaseFor3Months, selectedRow.recommended_purchase_3m],
        [],
        [t.month, t.usageShort],
        ...(analytics.monthly_breakdown ?? []).map((item) => [item.month, item.usage]),
      ]);
      return;
    }
    exportCsv(csvFilename(), [
      [
        t.model,
        t.sku,
        t.usageShort,
        t.usagePerMonthShort,
        t.stockLeft,
        t.coversShort,
        t.buy1mShort,
        t.buy3mShort,
        t.buyStatus,
        t.active,
      ],
      ...analytics.rows.map((row) => [
        row.model_name,
        row.purchase_sku,
        row.usage_in_period,
        formatNumber(row.avg_monthly_usage),
        row.current_stock_total,
        formatMonths(row.months_of_stock_left),
        row.recommended_purchase_1m,
        row.recommended_purchase_3m,
        row.needs_purchase_3m ? t.buy : t.ok,
        row.is_active ? t.yes : t.no,
      ]),
    ]);
  }

  return (
    <div className="panel wide">
      <div className="page-header compact-header">
        <h2>{t.cartridgeUsageStats}</h2>
        <div className="page-actions">
          <div className="filter-bar compact-filter">
            {[30, 90, 365].map((days) => (
              <button className={usageDays === days ? "active" : ""} key={days} onClick={() => setUsageDays(days)} type="button">
                {days === 30 ? t.days30 : days === 90 ? t.days90 : t.days365}
              </button>
            ))}
          </div>
          <label className="checkbox-label">
            <input
              checked={includeInactiveModels}
              onChange={(event) => setIncludeInactiveModels(event.target.checked)}
              type="checkbox"
            />
            {t.showInactiveModels}
          </label>
          <select value={selectedCartridgeModelId} onChange={(event) => setSelectedCartridgeModelId(event.target.value)}>
            <option value="">{t.allCartridgeModels}</option>
            {selectableModels.map((model) => (
              <option key={model.id} value={model.id}>{model.model_name}</option>
            ))}
          </select>
          <button
            className="button secondary"
            disabled={loading || !analytics || analytics.rows.length === 0}
            onClick={downloadAnalyticsCsv}
            type="button"
          >
            {t.exportCsv}
          </button>
        </div>
      </div>
      <p className="analytics-hint">{t.analyticsHint}</p>
      <Message loading={loading} error={error} />
      {analytics && !loading && !error && (
        <>
          {noUsageData && <p className="muted">{t.notEnoughAnalyticsData}</p>}
          {selectedRow ? (
            <SelectedModelUsage analytics={analytics} row={selectedRow} />
          ) : (
            <AllModelsUsage analytics={analytics} />
          )}
        </>
      )}
    </div>
  );
}

function rowClass(row: CartridgeUsageAnalyticsRow) {
  return [row.needs_purchase_3m ? "row-warning" : "", !row.is_active ? "row-muted" : ""].filter(Boolean).join(" ");
}

function AllModelsUsage({ analytics }: { analytics: CartridgeUsageAnalytics }) {
  const { t } = useI18n();
  return (
    <>
      <div className="metric-grid compact-metrics">
        <Metric label={t.totalUsage} value={analytics.total_usage} />
        <Metric label={t.warehouseStock} value={analytics.total_current_stock} />
        <Metric label={t.requiredFor3Months} value={analytics.total_recommended_purchase_3m} />
        <Metric label={t.modelsNeedPurchase} value={analytics.models_needing_purchase_3m} />
      </div>
      <div className="table-wrap compact">
        <table>
          <thead>
            <tr>
              <th>{t.model}</th>
              <th>{t.sku}</th>
              <th>{t.usageShort}</th>
              <th>{t.usagePerMonthShort}</th>
              <th>{t.stockLeft}</th>
              <th>{t.coversShort}</th>
              <th>{t.buy1mShort}</th>
              <th>{t.buy3mShort}</th>
              <th>{t.buyStatus}</th>
            </tr>
          </thead>
          <tbody>
            {analytics.rows.length === 0 ? <EmptyRow colSpan={9} /> : analytics.rows.map((row) => (
              <tr className={rowClass(row)} key={row.cartridge_model_id}>
                <td>{row.model_name}</td>
                <td>{dash(row.purchase_sku)}</td>
                <td>{row.usage_in_period}</td>
                <td>{formatNumber(row.avg_monthly_usage)}</td>
                <td>{row.current_stock_total}</td>
                <td>{formatMonths(row.months_of_stock_left)}</td>
                <td>{row.recommended_purchase_1m}</td>
                <td>{row.recommended_purchase_3m}</td>
                <td><span className={row.needs_purchase_3m ? "badge warning" : "badge ok"}>{row.needs_purchase_3m ? t.buy : t.ok}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SelectedModelUsage({ analytics, row }: { analytics: CartridgeUsageAnalytics; row: CartridgeUsageAnalyticsRow }) {
  const { t } = useI18n();
  return (
    <>
      <div className="metric-grid compact-metrics">
        <Metric label={t.usageInPeriod} value={row.usage_in_period} />
        <Metric label={t.avgMonthlyUsage} value={formatNumber(row.avg_monthly_usage)} />
        <Metric label={t.warehouseStock} value={row.current_stock_total} />
        <Metric label={t.stockEnoughFor} value={formatMonths(row.months_of_stock_left)} />
        <Metric label={t.purchaseFor1Month} value={row.recommended_purchase_1m} />
        <Metric label={t.purchaseFor3Months} value={row.recommended_purchase_3m} />
      </div>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>{t.month}</th><th>{t.used}</th></tr></thead>
          <tbody>
            {!analytics.monthly_breakdown || analytics.monthly_breakdown.length === 0 ? (
              <EmptyRow colSpan={2} />
            ) : (
              analytics.monthly_breakdown.map((item) => (
                <tr key={item.month}>
                  <td>{item.month}</td>
                  <td>{item.usage}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric-card small"><span>{label}</span><strong>{value}</strong></div>;
}
