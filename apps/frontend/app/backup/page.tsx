"use client";

import { useEffect, useState } from "react";

import { IconButton } from "@/components/IconButton";
import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { deleteJson, downloadBlob, fetchJson, postJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { dash } from "@/lib/labels";
import type { BackupDeleteResult, BackupFile, BackupRestoreResult } from "@/lib/types";

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
  const { user, loading: authLoading } = useAuth();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedRestore, setSelectedRestore] = useState<BackupFile | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadBackups() {
    if (user?.role !== "admin") {
      setBackups([]);
      setLoading(false);
      return;
    }

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

  async function restoreBackup() {
    if (!selectedRestore || restoreConfirmation !== "RESTORE") {
      return;
    }
    setRestoring(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await postJson<BackupRestoreResult>(
        `/api/backups/${encodeURIComponent(selectedRestore.filename)}/restore`,
        { confirmation: restoreConfirmation },
      );
      setSuccess(`${t.backupRestored}. ${t.preRestoreBackup}: ${result.pre_restore_backup}. ${t.refreshAndLoginAfterRestore}`);
      setSelectedRestore(null);
      setRestoreConfirmation("");
      await loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRestoring(false);
    }
  }

  async function deleteBackup(backup: BackupFile) {
    const confirmMessage = `${t.confirmDeleteBackup} ${backup.filename}? ${t.actionCannotBeUndone}`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteJson<BackupDeleteResult>(`/api/backups/${encodeURIComponent(backup.filename)}`);
      setSuccess(t.backupDeleted);
      if (selectedRestore?.filename === backup.filename) {
        setSelectedRestore(null);
        setRestoreConfirmation("");
      }
      await loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }
    void loadBackups();
  }, [authLoading, user?.role]);

  if (!authLoading && user?.role !== "admin") {
    return (
      <section>
        <PageHeader title={t.backup} />
        <Message info={t.backupsAdminOnly} />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title={t.backup}
        action={<button className="button" disabled={saving} onClick={createBackup} type="button">{t.createBackup}</button>}
      />
      <Message loading={loading || saving || restoring} error={error} success={success} info={t.restoreScriptsOnly} />

      {selectedRestore && (
        <div className="panel danger-panel">
          <h2>{t.restore}: {selectedRestore.filename}</h2>
          <p>{t.restoreOverwritesDatabase}</p>
          <p>{t.preRestoreBackupWillBeCreated}</p>
          <p>{t.restoreAdminOnly}</p>
          <label>
            {t.enterRestore}
            <input value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} />
          </label>
          <div className="page-actions">
            <button
              className="button"
              disabled={restoring || restoreConfirmation !== "RESTORE"}
              onClick={() => void restoreBackup()}
              type="button"
            >
              {t.confirmRestore}
            </button>
            <button
              className="button secondary"
              disabled={restoring}
              onClick={() => {
                setSelectedRestore(null);
                setRestoreConfirmation("");
              }}
              type="button"
            >
              {t.back}
            </button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.filename}</th>
              <th>{t.date}</th>
              <th>{t.size}</th>
              <th>{t.download}</th>
              <th>{t.restore}</th>
              <th>{t.delete}</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <EmptyRow colSpan={6} />
            ) : (
              backups.map((backup) => (
                <tr key={backup.filename}>
                  <td>{backup.filename}</td>
                  <td>{backup.modified_at ? new Date(backup.modified_at).toLocaleString() : dash(null)}</td>
                  <td>{formatSize(backup.size_bytes)}</td>
                  <td><IconButton icon="↓" label={t.download} onClick={() => void downloadBackup(backup)} /></td>
                  <td>
                    <IconButton
                      icon="♻"
                      label={t.restore}
                      onClick={() => {
                        setSelectedRestore(backup);
                        setRestoreConfirmation("");
                        setSuccess(null);
                        setError(null);
                      }}
                      variant="warning"
                    />
                  </td>
                  <td><IconButton icon="🗑" label={t.delete} onClick={() => void deleteBackup(backup)} variant="danger" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
