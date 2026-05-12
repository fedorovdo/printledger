export type VisibleColumns = Record<string, boolean>;

export function loadVisibleColumns(storageKey: string, defaults: VisibleColumns) {
  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as VisibleColumns;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveVisibleColumns(storageKey: string, visibleColumns: VisibleColumns) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
}
