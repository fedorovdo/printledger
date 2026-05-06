"use client";

import { useEffect, useState } from "react";

import { EmptyRow, PageHeader, Message } from "@/components/Ui";
import { fetchJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dash, isActivePrinter, isRepairPrinter } from "@/lib/labels";
import type { CartridgeModel, CartridgeUsageAnalytics, CartridgeUsageAnalyticsRow, Printer } from "@/lib/types";

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
      setAnalytics(await fetchJson<CartridgeUsageAnalytics>(`/api/analytics/cartridge-usage?${params.toString()}`));
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function refreshDashboard() {
    void loadDashboard();
    void loadAnalytics();
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [usageDays, selectedCartridgeModelId]);

  return (
    <section>
      <PageHeader
        title={t.dashboard}
        action={<button className="button secondary" onClick={refreshDashboard}>{t.refresh}</button>}
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
        loading={analyticsLoading}
        selectedCartridgeModelId={selectedCartridgeModelId}
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

function usageAverage(analytics: CartridgeUsageAnalytics) {
  return analytics.total_usage / (analytics.period_days / 30);
}

function selectedUsageRow(analytics: CartridgeUsageAnalytics | null): CartridgeUsageAnalyticsRow | null {
  return analytics?.rows[0] ?? null;
}

function UsageAnalyticsPanel({
  analytics,
  cartridgeModels,
  error,
  loading,
  selectedCartridgeModelId,
  setSelectedCartridgeModelId,
  setUsageDays,
  usageDays,
}: {
  analytics: CartridgeUsageAnalytics | null;
  cartridgeModels: CartridgeModel[];
  error: string | null;
  loading: boolean;
  selectedCartridgeModelId: string;
  setSelectedCartridgeModelId: (value: string) => void;
  setUsageDays: (value: number) => void;
  usageDays: number;
}) {
  const { t } = useI18n();
  const selectedRow = selectedCartridgeModelId ? selectedUsageRow(analytics) : null;
  const purchase3m = selectedRow
    ? selectedRow.recommended_purchase_3m
    : analytics?.rows.reduce((sum, row) => sum + row.recommended_purchase_3m, 0) ?? 0;
  const noUsageData = Boolean(analytics && analytics.total_usage === 0);

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
          <select value={selectedCartridgeModelId} onChange={(event) => setSelectedCartridgeModelId(event.target.value)}>
            <option value="">{t.allCartridgeModels}</option>
            {cartridgeModels.map((model) => (
              <option key={model.id} value={model.id}>{model.model_name}</option>
            ))}
          </select>
        </div>
      </div>
      <Message loading={loading} error={error} />
      {analytics && !loading && !error && (
        <>
          {noUsageData && <p className="muted">{t.notEnoughAnalyticsData}</p>}
          {selectedRow ? (
            <SelectedModelUsage analytics={analytics} row={selectedRow} />
          ) : (
            <AllModelsUsage analytics={analytics} purchase3m={purchase3m} />
          )}
        </>
      )}
    </div>
  );
}

function AllModelsUsage({ analytics, purchase3m }: { analytics: CartridgeUsageAnalytics; purchase3m: number }) {
  const { t } = useI18n();
  return (
    <>
      <div className="metric-grid compact-metrics">
        <Metric label={t.totalUsage} value={analytics.total_usage} />
        <Metric label={t.avgMonthlyUsage} value={formatNumber(usageAverage(analytics))} />
        <Metric label={t.warehouseStock} value={analytics.total_current_stock} />
        <Metric label={t.requiredFor3Months} value={purchase3m} />
      </div>
      <div className="table-wrap compact">
        <table>
          <thead>
            <tr>
              <th>{t.model}</th>
              <th>{t.sku}</th>
              <th>{t.used}</th>
              <th>{t.avgUsagePerMonth}</th>
              <th>{t.stockLeft}</th>
              <th>{t.stockEnoughFor}</th>
              <th>{t.purchaseFor1Month}</th>
              <th>{t.purchaseFor3Months}</th>
            </tr>
          </thead>
          <tbody>
            {analytics.rows.length === 0 ? <EmptyRow colSpan={8} /> : analytics.rows.map((row) => (
              <tr key={row.cartridge_model_id}>
                <td>{row.model_name}</td>
                <td>{dash(row.purchase_sku)}</td>
                <td>{row.usage_in_period}</td>
                <td>{formatNumber(row.avg_monthly_usage)}</td>
                <td>{row.current_stock_total}</td>
                <td>{formatMonths(row.months_of_stock_left)}</td>
                <td>{row.recommended_purchase_1m}</td>
                <td>{row.recommended_purchase_3m}</td>
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
