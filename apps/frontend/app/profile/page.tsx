"use client";

import { FormEvent, useState } from "react";

import { Message, PageHeader } from "@/components/Ui";
import { postJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const initialPasswordForm = {
  current_password: "",
  new_password: "",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await postJson("/api/auth/change-password", { ...passwordForm });
      setPasswordForm(initialPasswordForm);
      setSuccess(t.passwordChanged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader title={t.profile} />
      <Message error={error} success={success} />
      <div className="panel">
        <h2>{t.currentUser}</h2>
        <dl className="details">
          <dt>{t.username}</dt><dd>{user?.username}</dd>
          <dt>{t.role}</dt><dd>{user?.role}</dd>
        </dl>
      </div>
      <form className="panel" onSubmit={changePassword}>
        <h2>{t.changePassword}</h2>
        <label>{t.currentPassword}<input autoComplete="current-password" required type="password" value={passwordForm.current_password} onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })} /></label>
        <label>{t.newPassword}<input autoComplete="new-password" minLength={8} required type="password" value={passwordForm.new_password} onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })} /></label>
        <button className="button" disabled={saving} type="submit">{t.save}</button>
      </form>
    </section>
  );
}
