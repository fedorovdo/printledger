"use client";

import { useI18n } from "@/lib/i18n";

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {action}
    </div>
  );
}

export function Message({
  loading,
  error,
  success,
  info,
}: {
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  info?: string | null;
}) {
  const { t } = useI18n();
  if (loading) {
    return <Alert type="info">{t.loading}</Alert>;
  }
  if (error) {
    return <Alert type="error">{t.error}: {error}</Alert>;
  }
  if (success) {
    return <Alert type="success">{success}</Alert>;
  }
  if (info) {
    return <Alert type="info">{info}</Alert>;
  }
  return null;
}

export function Alert({
  children,
  type = "info",
}: {
  children: React.ReactNode;
  type?: "success" | "error" | "info";
}) {
  return <div className={`message ${type}`}>{children}</div>;
}

export function EmptyRow({ colSpan }: { colSpan: number }) {
  const { t } = useI18n();
  return (
    <tr>
      <td className="empty" colSpan={colSpan}>
        {t.noData}
      </td>
    </tr>
  );
}
