"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SidePanel } from "@/components/SidePanel";
import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, deleteJson, fetchJson, patchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dash, formatCartridgeCondition, formatCartridgeType } from "@/lib/labels";
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

type ModelFilter = "active" | "inactive" | "all";

export default function CartridgesPage() {
  const { locale, t } = useI18n();
  const [stock, setStock] = useState<CartridgeStock[]>([]);
  const [models, setModels] = useState<CartridgeModel[]>([]);
  const [modelForm, setModelForm] = useState(initialModel);
  const [stockInForm, setStockInForm] = useState(initialStockIn);
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [modelFilter, setModelFilter] = useState<ModelFilter>("active");
  const [showModelForm, setShowModelForm] = useState(false);
  const [showStockInForm, setShowStockInForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const vendorSuggestions = useMemo(
    () => Array.from(
      new Set(models.map((model) => model.vendor).filter((vendor): vendor is string => Boolean(vendor))),
    ).sort(),
    [models],
  );
  const activeModels = useMemo(
    () => models.filter((model) => model.is_active),
    [models],
  );
  const modelCounts = useMemo(() => ({
    active: models.filter((model) => model.is_active).length,
    inactive: models.filter((model) => !model.is_active).length,
    all: models.length,
  }), [models]);
  const filteredModels = useMemo(() => {
    if (modelFilter === "active") {
      return models.filter((model) => model.is_active);
    }
    if (modelFilter === "inactive") {
      return models.filter((model) => !model.is_active);
    }
    return models;
  }, [modelFilter, models]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [stockData, modelData] = await Promise.all([
        fetchJson<CartridgeStock[]>("/api/cartridge-stock"),
        fetchJson<CartridgeModel[]>("/api/cartridge-models?limit=500"),
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
    setSuccess(null);
    try {
      if (editingModelId) {
        await patchJson(`/api/cartridge-models/${editingModelId}`, compactBody({
          ...modelForm,
          min_stock_level: Number(modelForm.min_stock_level),
        }));
        setEditingModelId(null);
        setSuccess(t.modelUpdated);
      } else {
        await postJson("/api/cartridge-models", compactBody({
          ...modelForm,
          min_stock_level: Number(modelForm.min_stock_level),
        }));
        setSuccess(t.created);
      }
      setModelForm(initialModel);
      setShowModelForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function startEditModel(model: CartridgeModel) {
    setEditingModelId(model.id);
    setModelForm({
      vendor: model.vendor ?? "",
      model_name: model.model_name,
      purchase_sku: model.purchase_sku ?? "",
      cartridge_type: model.cartridge_type,
      min_stock_level: String(model.min_stock_level),
      notes: model.notes ?? "",
    });
    setShowModelForm(true);
    setError(null);
    setSuccess(null);
  }

  function cancelEditModel() {
    setEditingModelId(null);
    setModelForm(initialModel);
  }

  async function deleteModel(model: CartridgeModel) {
    if (!window.confirm(`${t.delete}: ${model.model_name}?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteJson(`/api/cartridge-models/${model.id}`);
      setSuccess(t.modelDeleted);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.linkedModelDeleteBlocked);
    } finally {
      setSaving(false);
    }
  }

  async function toggleModelActive(model: CartridgeModel) {
    const nextActive = !model.is_active;
    if (!nextActive && !window.confirm(t.deactivateModelConfirm)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await patchJson<CartridgeModel>(`/api/cartridge-models/${model.id}`, { is_active: nextActive });
      if (!nextActive && stockInForm.cartridge_model_id === String(model.id)) {
        setStockInForm({ ...stockInForm, cartridge_model_id: "" });
      }
      setSuccess(nextActive ? t.modelReactivated : t.modelDeactivated);
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
    setSuccess(null);
    try {
      await postJson("/api/cartridge-transactions/stock-in", compactBody({
        ...stockInForm,
        cartridge_model_id: Number(stockInForm.cartridge_model_id),
        quantity: Number(stockInForm.quantity),
      }));
      setStockInForm(initialStockIn);
      setShowStockInForm(false);
      setSuccess(t.operationSaved);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader
        action={(
          <div className="page-actions">
            <button className="button secondary" onClick={() => { cancelEditModel(); setShowModelForm(true); setShowStockInForm(false); }} type="button">
              + {t.cartridgeModel}
            </button>
            <button className="button secondary" onClick={() => { setShowStockInForm(true); setShowModelForm(false); }} type="button">
              + {t.stockIn}
            </button>
          </div>
        )}
        title={t.cartridges}
      />
      <Message loading={loading} error={error} success={success} />
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
              <th>{t.stockStatus}</th>
              <th>{t.open}</th>
            </tr>
          </thead>
          <tbody>
            {stock.length === 0 ? (
              <EmptyRow colSpan={9} />
            ) : (
              stock.map((item) => {
                const warehouseTotal = item.stock_new + item.stock_refilled;
                const isLow = warehouseTotal < item.min_stock_level;
                return (
                  <tr className={isLow ? "row-warning" : ""} key={item.cartridge_model_id}>
                    <td><Link className="text-link" href={`/cartridges/${item.cartridge_model_id}`}>{item.model_name}</Link></td>
                    <td>{dash(item.purchase_sku)}</td>
                    <td>{item.stock_new}</td>
                    <td>{item.stock_refilled}</td>
                    <td>{item.installed_total}</td>
                    <td>{item.total}</td>
                    <td>{item.min_stock_level}</td>
                    <td><span className={isLow ? "badge warning" : "badge ok"}>{isLow ? t.lowStock : t.ok}</span></td>
                    <td><Link className="button tiny secondary" href={`/cartridges/${item.cartridge_model_id}`}>{t.open}</Link></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <section className="catalog-section">
        <h2>{t.cartridgeModelCatalog}</h2>
        <div className="filter-bar compact-filter">
          <button className={modelFilter === "active" ? "active" : ""} onClick={() => setModelFilter("active")} type="button">{t.activeModels} ({modelCounts.active})</button>
          <button className={modelFilter === "inactive" ? "active" : ""} onClick={() => setModelFilter("inactive")} type="button">{t.inactiveModels} ({modelCounts.inactive})</button>
          <button className={modelFilter === "all" ? "active" : ""} onClick={() => setModelFilter("all")} type="button">{t.allModels} ({modelCounts.all})</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.vendor}</th>
                <th>{t.modelName}</th>
                <th>{t.sku}</th>
                <th>{t.cartridgeType}</th>
                <th>{t.minStockLevel}</th>
                <th>{t.active}</th>
                <th>{t.edit}</th>
                <th>{t.delete}</th>
                <th>{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.length === 0 ? (
                <EmptyRow colSpan={9} />
              ) : (
                filteredModels.map((model) => (
                  <tr className={!model.is_active ? "row-muted" : ""} key={model.id}>
                    <td>{dash(model.vendor)}</td>
                    <td>{model.model_name}</td>
                    <td>{dash(model.purchase_sku)}</td>
                    <td>{formatCartridgeType(model.cartridge_type, locale)}</td>
                    <td>{model.min_stock_level}</td>
                    <td>{model.is_active ? t.yes : t.no}</td>
                    <td><button className="button tiny secondary" onClick={() => startEditModel(model)} type="button">{t.edit}</button></td>
                    <td><button className="button tiny danger" disabled={saving} onClick={() => void deleteModel(model)} type="button">{t.delete}</button></td>
                    <td><button className="button tiny secondary" disabled={saving} onClick={() => void toggleModelActive(model)} type="button">{model.is_active ? t.deactivate : t.reactivate}</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SidePanel
        onClose={() => { setShowModelForm(false); cancelEditModel(); }}
        open={showModelForm}
        title={editingModelId ? t.editCartridgeModel : t.addCartridgeModel}
      >
        <form className="panel" onSubmit={createModel}>
          <p className="muted">{t.cartridgeModelCatalogHint}</p>
          <label>{t.vendor}<input list="cartridge-vendor-suggestions" value={modelForm.vendor} onChange={(e) => setModelForm({ ...modelForm, vendor: e.target.value })} /></label>
          <datalist id="cartridge-vendor-suggestions">{vendorSuggestions.map((vendor) => <option key={vendor} value={vendor} />)}</datalist>
          <label>{t.modelName}<input required value={modelForm.model_name} onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })} /></label>
          <label>{t.sku}<input value={modelForm.purchase_sku} onChange={(e) => setModelForm({ ...modelForm, purchase_sku: e.target.value })} /></label>
          <label>{t.cartridgeType}<select value={modelForm.cartridge_type} onChange={(e) => setModelForm({ ...modelForm, cartridge_type: e.target.value })}><option value="toner">{formatCartridgeType("toner", locale)}</option><option value="ink">{formatCartridgeType("ink", locale)}</option><option value="other">{formatCartridgeType("other", locale)}</option></select></label>
          <label>{t.minStockLevel}<input min="0" type="number" value={modelForm.min_stock_level} onChange={(e) => setModelForm({ ...modelForm, min_stock_level: e.target.value })} /></label>
          <label>{t.notes}<textarea value={modelForm.notes} onChange={(e) => setModelForm({ ...modelForm, notes: e.target.value })} /></label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setShowModelForm(false); cancelEditModel(); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>

      <SidePanel
        onClose={() => { setShowStockInForm(false); setStockInForm(initialStockIn); }}
        open={showStockInForm}
        title={t.stockIn}
      >
        <form className="panel" onSubmit={stockIn}>
          <label>{t.cartridgeModel}<select required value={stockInForm.cartridge_model_id} onChange={(e) => setStockInForm({ ...stockInForm, cartridge_model_id: e.target.value })}><option value=""></option>{activeModels.map((model) => <option key={model.id} value={model.id}>{model.model_name}</option>)}</select></label>
          <label>{t.quantity}<input min="1" required type="number" value={stockInForm.quantity} onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })} /></label>
          <label>{t.condition}<select value={stockInForm.item_condition} onChange={(e) => setStockInForm({ ...stockInForm, item_condition: e.target.value })}><option value="new">{formatCartridgeCondition("new", locale)}</option><option value="refilled">{formatCartridgeCondition("refilled", locale)}</option></select></label>
          <label>{t.reason}<input value={stockInForm.reason} onChange={(e) => setStockInForm({ ...stockInForm, reason: e.target.value })} /></label>
          <label>{t.comment}<textarea value={stockInForm.comment} onChange={(e) => setStockInForm({ ...stockInForm, comment: e.target.value })} /></label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setShowStockInForm(false); setStockInForm(initialStockIn); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>
    </section>
  );
}
