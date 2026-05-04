"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { ApiError, compactBody, fetchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dash, labelTransaction } from "@/lib/labels";
import type { CartridgeModel, CartridgeStock, CartridgeTransaction, Printer } from "@/lib/types";

export default function CartridgeCardPage() {
  const params = useParams<{ id: string }>();
  const cartridgeId = Number(params.id);
  const { locale, t } = useI18n();
  const [model, setModel] = useState<CartridgeModel | null>(null);
  const [stock, setStock] = useState<CartridgeStock | null>(null);
  const [history, setHistory] = useState<CartridgeTransaction[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stockInForm, setStockInForm] = useState({ quantity: "1", item_condition: "new", reason: "", comment: "" });
  const [installForm, setInstallForm] = useState({ printer_id: "", item_condition: "new", slot_name: "Black", color_role: "black", comment: "" });
  const [correctionForm, setCorrectionForm] = useState({ quantity: "1", direction: "plus", item_condition: "new", reason: "", comment: "" });
  const [refillForm, setRefillForm] = useState({ quantity: "1", reason: "", comment: "" });

  const printerName = useMemo(
    () => new Map(printers.map((printer) => [printer.id, printer.inventory_number ?? `#${printer.id}`])),
    [printers],
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [modelData, stockData, historyData, printerData] = await Promise.all([
        fetchJson<CartridgeModel>(`/api/cartridge-models/${cartridgeId}`),
        fetchJson<CartridgeStock[]>("/api/cartridge-stock"),
        fetchJson<CartridgeTransaction[]>(`/api/cartridge-models/${cartridgeId}/history`),
        fetchJson<Printer[]>("/api/printers"),
      ]);
      setModel(modelData);
      setStock(stockData.find((item) => item.cartridge_model_id === cartridgeId) ?? null);
      setHistory(historyData);
      setPrinters(printerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [cartridgeId]);

  async function submitForm(event: FormEvent, action: () => Promise<void>, message: string) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(message);
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t.slotConflict);
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setSaving(false);
    }
  }

  const warehouseTotal = (stock?.stock_new ?? 0) + (stock?.stock_refilled ?? 0);
  const isLow = stock ? warehouseTotal < stock.min_stock_level : false;

  return (
    <section>
      <PageHeader
        title={model?.model_name ?? t.cartridgeCard}
        action={<Link className="button secondary" href="/cartridges">{t.back}</Link>}
      />
      <Message loading={loading} error={error} success={success} />

      {model && (
        <div className="detail-grid">
          <div className="panel">
            <h2>{t.cartridgeCard}</h2>
            <dl className="details">
              <dt>{t.model}</dt><dd>{model.model_name}</dd>
              <dt>{t.vendor}</dt><dd>{dash(model.vendor)}</dd>
              <dt>{t.sku}</dt><dd>{dash(model.purchase_sku)}</dd>
              <dt>{t.cartridgeType}</dt><dd>{model.cartridge_type}</dd>
              <dt>{t.minStock}</dt><dd>{model.min_stock_level}</dd>
              <dt>{t.notes}</dt><dd>{dash(model.notes)}</dd>
            </dl>
          </div>
          <div className="panel">
            <h2>{t.stockSummary}</h2>
            <div className="metric-grid compact-metrics">
              <Metric label={t.stockNew} value={stock?.stock_new ?? 0} />
              <Metric label={t.stockRefilled} value={stock?.stock_refilled ?? 0} />
              <Metric label={t.installed} value={stock?.installed_total ?? 0} />
              <Metric label={t.total} value={stock?.total ?? 0} />
            </div>
            <p><span className={isLow ? "badge warning" : "badge ok"}>{isLow ? t.lowStock : t.ok}</span></p>
          </div>
        </div>
      )}

      <div className="form-grid four">
        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/cartridge-transactions/stock-in", compactBody({
            cartridge_model_id: cartridgeId,
            quantity: Number(stockInForm.quantity),
            item_condition: stockInForm.item_condition,
            reason: stockInForm.reason,
            comment: stockInForm.comment,
          }));
          setStockInForm({ quantity: "1", item_condition: "new", reason: "", comment: "" });
        }, t.operationSaved)}>
          <h2>{t.stockIn}</h2>
          <label>{t.quantity}<input min="1" type="number" value={stockInForm.quantity} onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })} /></label>
          <label>{t.condition}<select value={stockInForm.item_condition} onChange={(e) => setStockInForm({ ...stockInForm, item_condition: e.target.value })}><option value="new">new</option><option value="refilled">refilled</option></select></label>
          <label>{t.reason}<input value={stockInForm.reason} onChange={(e) => setStockInForm({ ...stockInForm, reason: e.target.value })} /></label>
          <label>{t.comment}<textarea value={stockInForm.comment} onChange={(e) => setStockInForm({ ...stockInForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/cartridge-transactions/install", compactBody({
            cartridge_model_id: cartridgeId,
            printer_id: Number(installForm.printer_id),
            quantity: 1,
            item_condition: installForm.item_condition,
            slot_name: installForm.slot_name,
            color_role: installForm.color_role,
            comment: installForm.comment,
          }));
          setInstallForm({ printer_id: "", item_condition: "new", slot_name: "Black", color_role: "black", comment: "" });
        }, t.cartridgeInstalled)}>
          <h2>{t.installCartridge}</h2>
          <label>{t.printers}<select required value={installForm.printer_id} onChange={(e) => setInstallForm({ ...installForm, printer_id: e.target.value })}><option value=""></option>{printers.filter((printer) => !printer.is_archived).map((printer) => <option key={printer.id} value={printer.id}>{printer.inventory_number ?? `#${printer.id}`}</option>)}</select></label>
          <label>{t.condition}<select value={installForm.item_condition} onChange={(e) => setInstallForm({ ...installForm, item_condition: e.target.value })}><option value="new">new</option><option value="refilled">refilled</option></select></label>
          <label>{t.slotName}<input value={installForm.slot_name} onChange={(e) => setInstallForm({ ...installForm, slot_name: e.target.value })} /></label>
          <label>{t.colorRole}<select value={installForm.color_role} onChange={(e) => setInstallForm({ ...installForm, color_role: e.target.value })}><option value="black">black</option><option value="cyan">cyan</option><option value="magenta">magenta</option><option value="yellow">yellow</option><option value="other">other</option></select></label>
          <label>{t.comment}<textarea value={installForm.comment} onChange={(e) => setInstallForm({ ...installForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/cartridge-transactions/correction", compactBody({
            cartridge_model_id: cartridgeId,
            quantity: Number(correctionForm.quantity),
            direction: correctionForm.direction,
            item_condition: correctionForm.item_condition,
            reason: correctionForm.reason,
            comment: correctionForm.comment,
          }));
          setCorrectionForm({ quantity: "1", direction: "plus", item_condition: "new", reason: "", comment: "" });
        }, t.operationSaved)}>
          <h2>{t.correction}</h2>
          <label>{t.quantity}<input min="1" type="number" value={correctionForm.quantity} onChange={(e) => setCorrectionForm({ ...correctionForm, quantity: e.target.value })} /></label>
          <label>{t.direction}<select value={correctionForm.direction} onChange={(e) => setCorrectionForm({ ...correctionForm, direction: e.target.value })}><option value="plus">plus</option><option value="minus">minus</option></select></label>
          <label>{t.condition}<select value={correctionForm.item_condition} onChange={(e) => setCorrectionForm({ ...correctionForm, item_condition: e.target.value })}><option value="new">new</option><option value="refilled">refilled</option></select></label>
          <label>{t.reason}<input required value={correctionForm.reason} onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })} /></label>
          <label>{t.comment}<textarea value={correctionForm.comment} onChange={(e) => setCorrectionForm({ ...correctionForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/cartridge-transactions/refill-return", compactBody({
            cartridge_model_id: cartridgeId,
            quantity: Number(refillForm.quantity),
            reason: refillForm.reason,
            comment: refillForm.comment,
          }));
          setRefillForm({ quantity: "1", reason: "", comment: "" });
        }, t.operationSaved)}>
          <h2>{t.refillReturn}</h2>
          <label>{t.quantity}<input min="1" type="number" value={refillForm.quantity} onChange={(e) => setRefillForm({ ...refillForm, quantity: e.target.value })} /></label>
          <label>{t.reason}<input value={refillForm.reason} onChange={(e) => setRefillForm({ ...refillForm, reason: e.target.value })} /></label>
          <label>{t.comment}<textarea value={refillForm.comment} onChange={(e) => setRefillForm({ ...refillForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>
      </div>

      <HistoryTable history={history} locale={locale} printerName={printerName} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric-card small"><span>{label}</span><strong>{value}</strong></div>;
}

function HistoryTable({
  history,
  locale,
  printerName,
}: {
  history: CartridgeTransaction[];
  locale: "ru" | "en";
  printerName: Map<number, string>;
}) {
  const { t } = useI18n();
  return (
    <div className="panel wide">
      <h2>{t.history}</h2>
      <div className="table-wrap compact">
        <table>
          <thead>
            <tr><th>{t.date}</th><th>{t.transactionType}</th><th>{t.quantity}</th><th>{t.condition}</th><th>{t.printerId}</th><th>{t.reason}</th><th>{t.comment}</th></tr>
          </thead>
          <tbody>
            {history.length === 0 ? <EmptyRow colSpan={7} /> : history.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.created_at).toLocaleString()}</td>
                <td>{labelTransaction(item.transaction_type, locale)}</td>
                <td>{item.quantity}</td>
                <td>{dash(item.item_condition)}</td>
                <td>{item.printer_id ? dash(printerName.get(item.printer_id)) : dash(null)}</td>
                <td>{dash(item.reason)}</td>
                <td>{dash(item.comment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
