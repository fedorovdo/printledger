"use client";

import { FormEvent, useEffect, useState } from "react";

import { IconButton } from "@/components/IconButton";
import { SidePanel } from "@/components/SidePanel";
import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { fetchJson, patchJson, postJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { AppUser } from "@/lib/types";

const initialCreateForm = {
  username: "",
  password: "",
  role: "user",
  is_active: true,
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadUsers() {
    if (currentUser?.role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchJson<AppUser[]>("/api/users"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [currentUser?.role]);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await postJson<AppUser>("/api/users", { ...createForm });
      setCreateForm(initialCreateForm);
      setShowCreateForm(false);
      setSuccess(t.userCreated);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserActive(targetUser: AppUser) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await patchJson<AppUser>(`/api/users/${targetUser.id}`, { is_active: !targetUser.is_active });
      setSuccess(t.userUpdated);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function resetPasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (!resetUser) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await postJson(`/api/users/${resetUser.id}/reset-password`, { new_password: resetPassword });
      setResetUser(null);
      setResetPassword("");
      setSuccess(t.passwordChanged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (currentUser && currentUser.role !== "admin") {
    return (
      <section>
        <PageHeader title={t.users} />
        <Message error={t.adminOnly} />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        action={<button className="button secondary" onClick={() => setShowCreateForm(true)} type="button">+ {t.addUser}</button>}
        title={t.users}
      />
      <Message loading={loading} error={error} success={success} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.username}</th>
              <th>{t.role}</th>
              <th>{t.active}</th>
              <th>{t.status}</th>
              <th>{t.resetPassword}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <EmptyRow colSpan={5} />
            ) : users.map((item) => (
              <tr className={!item.is_active ? "row-muted" : ""} key={item.id}>
                <td>{item.username}</td>
                <td>{item.role}</td>
                <td>{item.is_active ? t.yes : t.no}</td>
                <td><IconButton disabled={saving} icon={item.is_active ? "⊘" : "↩"} label={item.is_active ? t.deactivate : t.reactivate} onClick={() => void toggleUserActive(item)} variant={item.is_active ? "warning" : "success"} /></td>
                <td><IconButton disabled={saving} icon="↺" label={t.resetPassword} onClick={() => setResetUser(item)} variant="warning" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SidePanel onClose={() => { setShowCreateForm(false); setCreateForm(initialCreateForm); }} open={showCreateForm} title={t.addUser}>
        <form className="panel" onSubmit={createUser}>
          <label>{t.username}<input autoComplete="username" required value={createForm.username} onChange={(event) => setCreateForm({ ...createForm, username: event.target.value })} /></label>
          <label>{t.password}<input autoComplete="new-password" minLength={8} required type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} /></label>
          <label>{t.role}<select value={createForm.role} onChange={(event) => setCreateForm({ ...createForm, role: event.target.value })}><option value="user">user</option><option value="admin">admin</option></select></label>
          <label className="checkbox-row"><input checked={createForm.is_active} onChange={(event) => setCreateForm({ ...createForm, is_active: event.target.checked })} type="checkbox" />{t.active}</label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setShowCreateForm(false); setCreateForm(initialCreateForm); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>

      <SidePanel onClose={() => { setResetUser(null); setResetPassword(""); }} open={resetUser !== null} title={t.resetPassword}>
        <form className="panel" onSubmit={resetPasswordSubmit}>
          <p className="muted">{resetUser?.username}</p>
          <label>{t.newPassword}<input autoComplete="new-password" minLength={8} required type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /></label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setResetUser(null); setResetPassword(""); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>
    </section>
  );
}
