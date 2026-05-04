"use client";

import { useEffect, useState } from "react";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { fetchJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { CartridgeTransaction } from "@/lib/types";

export default function OperationsPage() {
  const { t } = useI18n();
  const [operations, setOperations] = useState<CartridgeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      setOperations(await fetchJson<CartridgeTransaction[]>("/api/cartridge-transactions"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <section>
      <PageHeader
        title={t.operations}
        action={<button className="button secondary" onClick={loadData}>{t.refresh}</button>}
      />
      <Message loading={loading} error={error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.date}</th>
              <th>{t.cartridgeModel}</th>
              <th>{t.transactionType}</th>
              <th>{t.quantity}</th>
              <th>{t.condition}</th>
              <th>{t.printerId}</th>
              <th>{t.comment}</th>
            </tr>
          </thead>
          <tbody>
            {operations.length === 0 ? (
              <EmptyRow colSpan={7} />
            ) : (
              operations.map((operation) => (
                <tr key={operation.id}>
                  <td>{new Date(operation.created_at).toLocaleString()}</td>
                  <td>{operation.cartridge_model_id}</td>
                  <td>{operation.transaction_type}</td>
                  <td>{operation.quantity}</td>
                  <td>{operation.item_condition ?? ""}</td>
                  <td>{operation.printer_id ?? ""}</td>
                  <td>{operation.comment ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

