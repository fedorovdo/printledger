"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { fetchJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { CartridgeModel, CartridgeTransaction, Printer } from "@/lib/types";

const operationLabels = {
  ru: {
    stock_in_new: "Приход нового",
    stock_in_refilled: "Приход заправленного",
    correction_plus: "Корректировка +",
    correction_minus: "Корректировка -",
    install: "Установка",
    remove: "Снятие",
    send_to_refill: "На заправку",
    receive_from_refill: "Возврат из заправки",
    write_off: "Списание",
  },
  en: {
    stock_in_new: "Stock-in new",
    stock_in_refilled: "Stock-in refilled",
    correction_plus: "Correction +",
    correction_minus: "Correction -",
    install: "Install",
    remove: "Remove",
    send_to_refill: "Send to refill",
    receive_from_refill: "Return from refill",
    write_off: "Write off",
  },
};

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

  function labelTransaction(type: string) {
    return operationLabels[locale][type as keyof typeof operationLabels.ru] ?? type;
  }

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
                  <td>{cartridgeModelName.get(operation.cartridge_model_id) ?? "—"}</td>
                  <td>{labelTransaction(operation.transaction_type)}</td>
                  <td>{operation.quantity}</td>
                  <td>{operation.item_condition ?? "—"}</td>
                  <td>{operation.printer_id ? printerName.get(operation.printer_id) ?? "—" : "—"}</td>
                  <td>{operation.comment ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

