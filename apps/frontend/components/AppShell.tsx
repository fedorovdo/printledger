"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n";

const navItems = [
  { href: "/", key: "dashboard" },
  { href: "/cartridges", key: "cartridges" },
  { href: "/printers", key: "printers" },
  { href: "/locations", key: "locations" },
  { href: "/operations", key: "operations" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">PL</span>
          <span>PrintLedger</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              className={pathname === item.href ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
            >
              {t[item.key]}
            </Link>
          ))}
        </nav>
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
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

