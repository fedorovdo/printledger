"use client";

import { useEffect, useState } from "react";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { downloadBlob, fetchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dash } from "@/lib/labels";
import type { BackupFile } from "@/lib/types";

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupPage() {
  const { t } = useI18n();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadBackups() {
    setLoading(true);
    setError(null);
    try {
      setBackups(await fetchJson<BackupFile[]>("/api/backups"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await postJson<BackupFile>("/api/backups/create", {});
      setSuccess(t.backupCreated);
      await loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function downloadBackup(backup: BackupFile) {
    setError(null);
    try {
      const blob = await downloadBlob(backup.download_url);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    void loadBackups();
  }, []);

  return (
    <section>
      <PageHeader
        title={t.backup}
        action={<button className="button" disabled={saving} onClick={createBackup} type="button">{t.createBackup}</button>}
      />
      <Message loading={loading || saving} error={error} success={success} info={t.restoreScriptsOnly} />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.filename}</th>
              <th>{t.date}</th>
              <th>{t.size}</th>
              <th>{t.download}</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <EmptyRow colSpan={4} />
            ) : (
              backups.map((backup) => (
                <tr key={backup.filename}>
                  <td>{backup.filename}</td>
                  <td>{backup.modified_at ? new Date(backup.modified_at).toLocaleString() : dash(null)}</td>
                  <td>{formatSize(backup.size_bytes)}</td>
                  <td>
                    <button className="button tiny secondary" onClick={() => void downloadBackup(backup)} type="button">
                      {t.download}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
