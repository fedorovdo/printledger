"use client";

import { FormEvent, useEffect, useState } from "react";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, fetchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { CartridgeModel, CartridgeStock } from "@/lib/types";

const initialModel = {
  vendor: "",
  model_name: "",
  purchase_sku: "",
  cartridge_type: "toner",
  min_stock_level: "0",
  notes: "",
};

const initialStockIn = {
  cartridge_model_id: "",
  quantity: "1",
  item_condition: "new",
  reason: "",
  comment: "",
};

export default function CartridgesPage() {
  const { t } = useI18n();
  const [stock, setStock] = useState<CartridgeStock[]>([]);
  const [models, setModels] = useState<CartridgeModel[]>([]);
  const [modelForm, setModelForm] = useState(initialModel);
  const [stockInForm, setStockInForm] = useState(initialStockIn);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [stockData, modelData] = await Promise.all([
        fetchJson<CartridgeStock[]>("/api/cartridge-stock"),
        fetchJson<CartridgeModel[]>("/api/cartridge-models"),
      ]);
      setStock(stockData);
      setModels(modelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createModel(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJson("/api/cartridge-models", compactBody({
        ...modelForm,
        min_stock_level: Number(modelForm.min_stock_level),
      }));
      setModelForm(initialModel);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function stockIn(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJson("/api/cartridge-transactions/stock-in", compactBody({
        ...stockInForm,
        cartridge_model_id: Number(stockInForm.cartridge_model_id),
        quantity: Number(stockInForm.quantity),
      }));
      setStockInForm(initialStockIn);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader title={t.cartridges} />
      <Message loading={loading} error={error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.model}</th>
              <th>{t.sku}</th>
              <th>{t.stockNew}</th>
              <th>{t.stockRefilled}</th>
              <th>{t.installed}</th>
              <th>{t.total}</th>
              <th>{t.minStock}</th>
            </tr>
          </thead>
          <tbody>
            {stock.length === 0 ? (
              <EmptyRow colSpan={7} />
            ) : (
              stock.map((item) => (
                <tr key={item.cartridge_model_id}>
                  <td>{item.model_name}</td>
                  <td>{item.purchase_sku ?? ""}</td>
                  <td>{item.stock_new}</td>
                  <td>{item.stock_refilled}</td>
                  <td>{item.installed_total}</td>
                  <td>{item.total}</td>
                  <td>{item.min_stock_level}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="form-grid">
        <form className="panel" onSubmit={createModel}>
          <h2>{t.addCartridgeModel}</h2>
          <label>{t.vendor}<input value={modelForm.vendor} onChange={(e) => setModelForm({ ...modelForm, vendor: e.target.value })} /></label>
          <label>{t.modelName}<input required value={modelForm.model_name} onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })} /></label>
          <label>{t.sku}<input value={modelForm.purchase_sku} onChange={(e) => setModelForm({ ...modelForm, purchase_sku: e.target.value })} /></label>
          <label>{t.cartridgeType}<select value={modelForm.cartridge_type} onChange={(e) => setModelForm({ ...modelForm, cartridge_type: e.target.value })}><option value="toner">toner</option><option value="ink">ink</option><option value="other">other</option></select></label>
          <label>{t.minStockLevel}<input min="0" type="number" value={modelForm.min_stock_level} onChange={(e) => setModelForm({ ...modelForm, min_stock_level: e.target.value })} /></label>
          <label>{t.notes}<textarea value={modelForm.notes} onChange={(e) => setModelForm({ ...modelForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={stockIn}>
          <h2>{t.stockIn}</h2>
          <label>{t.cartridgeModel}<select required value={stockInForm.cartridge_model_id} onChange={(e) => setStockInForm({ ...stockInForm, cartridge_model_id: e.target.value })}><option value=""></option>{models.map((model) => <option key={model.id} value={model.id}>{model.model_name}</option>)}</select></label>
          <label>{t.quantity}<input min="1" required type="number" value={stockInForm.quantity} onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })} /></label>
          <label>{t.condition}<select value={stockInForm.item_condition} onChange={(e) => setStockInForm({ ...stockInForm, item_condition: e.target.value })}><option value="new">new</option><option value="refilled">refilled</option></select></label>
          <label>{t.reason}<input value={stockInForm.reason} onChange={(e) => setStockInForm({ ...stockInForm, reason: e.target.value })} /></label>
          <label>{t.comment}<textarea value={stockInForm.comment} onChange={(e) => setStockInForm({ ...stockInForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>
      </div>
    </section>
  );
}

