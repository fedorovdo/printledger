"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const navItems = [
  { href: "/", key: "dashboard" },
  { href: "/cartridges", key: "cartridges" },
  { href: "/printers", key: "printers" },
  { href: "/locations", key: "locations" },
  { href: "/operations", key: "operations" },
  { href: "/backup", key: "backup", adminOnly: true },
  { href: "/users", key: "users", adminOnly: true },
  { href: "/profile", key: "profile" },
  { href: "/about", key: "about" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const isLoginPage = pathname === "/login";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.replace("/login");
    }
    if (!loading && user && isLoginPage) {
      router.replace("/");
    }
  }, [isLoginPage, loading, router, user]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">PL</span>
          <span>PrintLedger</span>
        </div>
        {!isLoginPage && user ? (
          <nav className="nav">
            {navItems.filter((item) => !("adminOnly" in item) || user.role === "admin").map((item) => (
              <Link
                className={pathname === item.href ? "nav-link active" : "nav-link"}
                href={item.href}
                key={item.href}
              >
                {t[item.key]}
              </Link>
            ))}
          </nav>
        ) : <div />}
        <div className="topbar-actions">
          {user && !isLoginPage && (
            <div className="user-block">
              <span>{user.username}</span>
              <button className="button tiny secondary" onClick={handleLogout} type="button">{t.logout}</button>
            </div>
          )}
          <div className="language-switcher" aria-label="Language switcher">
            <button
              className={locale === "ru" ? "active" : ""}
              type="button"
              onClick={() => setLocale("ru")}
            >
              RU
            </button>
            <button
              className={locale === "en" ? "active" : ""}
              type="button"
              onClick={() => setLocale("en")}
            >
              EN
            </button>
          </div>
        </div>
      </header>
      <main className="main">{!isLoginPage && (loading || !user) ? null : children}</main>
    </div>
  );
}
