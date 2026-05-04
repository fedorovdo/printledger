"use client";

import { useState } from "react";

const copy = {
  ru: {
    eyebrow: "Стартовая основа",
    title: "PrintLedger",
    lead: "Веб-система учета картриджей, расходников и принтеров для внутреннего использования.",
    backend: "Backend",
    frontend: "Frontend",
    database: "Database",
    ready: "FastAPI готов",
    running: "Next.js запущен",
    planned: "PostgreSQL подключен через Compose",
  },
  en: {
    eyebrow: "Project scaffold",
    title: "PrintLedger",
    lead: "Internal web system for tracking printer cartridges, consumables, and printers.",
    backend: "Backend",
    frontend: "Frontend",
    database: "Database",
    ready: "FastAPI is ready",
    running: "Next.js is running",
    planned: "PostgreSQL is wired through Compose",
  },
};

type Locale = keyof typeof copy;

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ru");
  const t = copy[locale];

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">PL</span>
            <span>PrintLedger</span>
          </div>
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

      <main className="main">
        <section className="intro">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="lead">{t.lead}</p>
        </section>

        <section className="status-row" aria-label="Project status">
          <div className="status-item">
            <p className="status-label">{t.backend}</p>
            <p className="status-value">{t.ready}</p>
          </div>
          <div className="status-item">
            <p className="status-label">{t.frontend}</p>
            <p className="status-value">{t.running}</p>
          </div>
          <div className="status-item">
            <p className="status-label">{t.database}</p>
            <p className="status-value">{t.planned}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

