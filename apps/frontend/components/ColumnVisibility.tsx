"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import type { VisibleColumns } from "@/lib/tablePrefs";

type ColumnVisibilityProps = {
  columns: Array<{ key: string; label: string; required?: boolean }>;
  visibleColumns: VisibleColumns;
  onChange: (next: VisibleColumns) => void;
  title?: string;
};

export function ColumnVisibility({ columns, visibleColumns, onChange, title }: ColumnVisibilityProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  function setColumnVisible(key: string, visible: boolean) {
    const column = columns.find((item) => item.key === key);
    if (column?.required && !visible) {
      return;
    }
    onChange({ ...visibleColumns, [key]: visible });
  }

  function showAll() {
    onChange(Object.fromEntries(columns.map((column) => [column.key, true])));
  }

  return (
    <div className="column-visibility">
      <button className="button secondary" onClick={() => setOpen((value) => !value)} type="button">
        {t.columns}
      </button>
      {open && (
        <div className="column-visibility-menu" role="dialog" aria-label={title ?? t.columnSettings}>
          <h3>{title ?? t.columnSettings}</h3>
          {columns.map((column) => {
            const checked = visibleColumns[column.key] ?? true;
            return (
              <label className="column-visibility-item" key={column.key} title={column.required ? t.requiredColumnCannotBeHidden : undefined}>
                <input
                  checked={checked}
                  disabled={column.required}
                  onChange={(event) => setColumnVisible(column.key, event.target.checked)}
                  type="checkbox"
                />
                <span>{column.label}</span>
              </label>
            );
          })}
          <div className="inline-actions compact">
            <button className="button tiny secondary" onClick={showAll} type="button">{t.showAll}</button>
            <button className="button tiny secondary" onClick={showAll} type="button">{t.resetColumns}</button>
          </div>
        </div>
      )}
    </div>
  );
}
