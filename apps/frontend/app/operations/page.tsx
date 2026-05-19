"use client";

import { useEffect, useMemo, useState } from "react";

import { RefreshButton } from "@/components/RefreshButton";
import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { fetchJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dash, formatCartridgeCondition, labelTransaction } from "@/lib/labels";
import type { CartridgeModel, CartridgeTransaction, Printer } from "@/lib/types";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

export default function OperationsPage() {
  const { locale, t } = useI18n();
  const [operations, setOperations] = useState<CartridgeTransaction[]>([]);
  const [cartridgeModels, setCartridgeModels] = useState<CartridgeModel[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cartridgeModelName = useMemo(
    () => new Map(cartridgeModels.map((model) => [model.id, model.model_name])),
    [cartridgeModels],
  );
  const printerName = useMemo(
    () => new Map(printers.map((printer) => [printer.id, printer.inventory_number ?? `#${printer.id}`])),
    [printers],
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [operationData, cartridgeData, printerData] = await Promise.all([
        fetchJson<CartridgeTransaction[]>("/api/cartridge-transactions"),
        fetchJson<CartridgeModel[]>("/api/cartridge-models"),
        fetchJson<Printer[]>("/api/printers"),
      ]);
      setOperations(operationData);
      setCartridgeModels(cartridgeData);
      setPrinters(printerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useAutoRefresh(loadData, 30_000);

  return (
    <section>
      <PageHeader
        title={t.operations}
        action={<RefreshButton label={t.refresh} loading={loading} onClick={() => void loadData()} />}
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
                  <td>{dash(cartridgeModelName.get(operation.cartridge_model_id))}</td>
                  <td>{labelTransaction(operation.transaction_type, locale)}</td>
                  <td>{operation.quantity}</td>
                  <td>{formatCartridgeCondition(operation.item_condition, locale)}</td>
                  <td>{operation.printer_id ? dash(printerName.get(operation.printer_id)) : dash(null)}</td>
                  <td>{dash(operation.comment)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
