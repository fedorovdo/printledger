"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Message } from "@/components/Ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t.invalidLogin);
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="panel auth-panel" onSubmit={submitLogin}>
        <h1>{t.login}</h1>
        <p>{t.appDescription}</p>
        <Message loading={loading} error={error} />
        <label>
          {t.username}
          <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          {t.password}
          <input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button className="button" disabled={loading} type="submit">{t.signIn}</button>
      </form>
    </section>
  );
}
