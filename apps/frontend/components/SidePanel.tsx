"use client";

import { ReactNode, useEffect } from "react";

import { useI18n } from "@/lib/i18n";

type SidePanelProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function SidePanel({ open, title, onClose, children, footer }: SidePanelProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div aria-modal="true" className="side-panel-overlay" onClick={onClose} role="dialog">
      <aside className="side-panel" onClick={(event) => event.stopPropagation()}>
        <div className="side-panel-header">
          <h2>{title}</h2>
          <button aria-label={t.close} className="side-panel-close" onClick={onClose} type="button">
            x
          </button>
        </div>
        <div className="side-panel-body">{children}</div>
        {footer ? <div className="side-panel-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
