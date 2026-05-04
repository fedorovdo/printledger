"use client";

import { useEffect, useState } from "react";

import { PageHeader, Message } from "@/components/Ui";
import { fetchJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { CartridgeModel, Printer } from "@/lib/types";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setData({
        backend: health.status,
        database: db.database,
        cartridgeModels: cartridges.length,
        printers: printers.length,
        archivedPrinters: archived.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <section>
      <PageHeader
        title={t.dashboard}
        action={<button className="button secondary" onClick={loadDashboard}>{t.refresh}</button>}
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
    </section>
  );
}

