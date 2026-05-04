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
}: {
  loading?: boolean;
  error?: string | null;
}) {
  const { t } = useI18n();
  if (loading) {
    return <div className="message">{t.loading}</div>;
  }
  if (error) {
    return <div className="message error">{t.error}: {error}</div>;
  }
  return null;
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

