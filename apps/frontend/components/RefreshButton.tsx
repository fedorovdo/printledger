"use client";

import { RefreshCw } from "lucide-react";

export function RefreshButton({
  disabled,
  label,
  loading,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-busy={loading ? "true" : undefined}
      className="button secondary refresh-button"
      disabled={disabled || loading}
      onClick={onClick}
      type="button"
    >
      <RefreshCw aria-hidden="true" className={`refresh-button-icon${loading ? " is-spinning" : ""}`} size={16} />
      <span>{label}</span>
    </button>
  );
}
