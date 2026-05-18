"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { clearAuthToken, fetchJson, getAuthToken, postJson, setAuthToken } from "@/lib/api";
import { demoUsers } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/demoMode";

export type AuthUser = {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    if (isDemoMode()) {
      setUser(demoUsers[0]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (!getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const currentUser = await fetchJson<AuthUser>("/api/auth/me");
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username: string, password: string) {
    if (isDemoMode()) {
      setUser(demoUsers[0]);
      return;
    }

    clearAuthToken();
    const token = await postJson<LoginResponse>("/api/auth/login", { username, password });
    setAuthToken(token.access_token);
    await refreshUser();
  }

  async function logout() {
    if (isDemoMode()) {
      setUser(demoUsers[0]);
      return;
    }

    try {
      await postJson("/api/auth/logout", {});
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }

  useEffect(() => {
    void refreshUser();
    window.addEventListener("printledger-auth-changed", refreshUser);
    return () => window.removeEventListener("printledger-auth-changed", refreshUser);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
