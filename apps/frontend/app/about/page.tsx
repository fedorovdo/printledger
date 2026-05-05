"use client";

import { useEffect, useState } from "react";

import { Message, PageHeader } from "@/components/Ui";
import { fetchJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type SystemInfo = {
  app_name: string;
  version: string;
  environment: string;
  auth_enabled: boolean;
};

export default function AboutPage() {
  const { t } = useI18n();
  const [health, setHealth] = useState<string | null>(null);
  const [database, setDatabase] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAbout() {
    setLoading(true);
    setError(null);
    try {
      const [healthData, dbData, infoData] = await Promise.all([
        fetchJson<{ status: string }>("/health"),
        fetchJson<{ database: string }>("/api/db-check"),
        fetchJson<SystemInfo>("/api/system/info"),
      ]);
      setHealth(healthData.status);
      setDatabase(dbData.database);
      setSystemInfo(infoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAbout();
  }, []);

  return (
    <section>
      <PageHeader
        title={t.about}
        action={<button className="button secondary" onClick={loadAbout} type="button">{t.refresh}</button>}
      />
      <Message loading={loading} error={error} />

      <div className="detail-grid">
        <div className="panel">
          <h2>PrintLedger</h2>
          <p>{t.appDescription}</p>
          <dl className="details">
            <dt>{t.version}</dt><dd>{systemInfo?.version ?? "0.1.0"}</dd>
            <dt>{t.environment}</dt><dd>{systemInfo?.environment ?? "local"}</dd>
            <dt>{t.backendStatus}</dt><dd>{health === "ok" ? t.ok : health ?? "—"}</dd>
            <dt>{t.databaseStatus}</dt><dd>{database === "ok" ? t.ok : database ?? "—"}</dd>
            <dt>{t.frontendMode}</dt><dd>{process.env.NODE_ENV}</dd>
            <dt>{t.authEnabled}</dt><dd>{systemInfo?.auth_enabled ? t.yes : t.no}</dd>
          </dl>
        </div>
        <div className="panel">
          <h2>README</h2>
          <p>{t.docsHint}</p>
        </div>
      </div>
    </section>
  );
}
