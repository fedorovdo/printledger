"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { IconButton } from "@/components/IconButton";
import { SidePanel } from "@/components/SidePanel";
import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, deleteJson, fetchJson, patchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  dash,
  formatCartridgeCondition,
  formatCartridgeType,
  formatColorRole,
  formatPrinterLabel,
  isActivePrinter,
} from "@/lib/labels";
import type { Branch, CartridgeModel, CartridgeStock, Location, Organization, Printer, PrinterModel } from "@/lib/types";

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

const initialInstall = {
  cartridge_model_id: "",
  printer_id: "",
  item_condition: "new",
  slot_name: "",
  color_role: "black",
  comment: "",
};

type ModelFilter = "active" | "inactive" | "all";
type StockSortKey = "model" | "sku" | "stock_new" | "stock_refilled" | "installed" | "total" | "min_stock" | "status";
type SortDirection = "asc" | "desc";

export default function CartridgesPage() {
  const { locale, t } = useI18n();
  const [stock, setStock] = useState<CartridgeStock[]>([]);
  const [models, setModels] = useState<CartridgeModel[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printerModels, setPrinterModels] = useState<PrinterModel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [modelForm, setModelForm] = useState(initialModel);
  const [stockInForm, setStockInForm] = useState(initialStockIn);
  const [installForm, setInstallForm] = useState(initialInstall);
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [modelFilter, setModelFilter] = useState<ModelFilter>("active");
  const [stockSearch, setStockSearch] = useState("");
  const [stockSortKey, setStockSortKey] = useState<StockSortKey | null>(null);
  const [stockSortDirection, setStockSortDirection] = useState<SortDirection>("asc");
  const [showModelForm, setShowModelForm] = useState(false);
  const [showStockInForm, setShowStockInForm] = useState(false);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const modelById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );
  const printerModelById = useMemo(
    () => new Map(printerModels.map((model) => [model.id, model])),
    [printerModels],
  );
  const locationById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations],
  );
  const branchById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch])),
    [branches],
  );
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
  const activePrinters = useMemo(
    () => printers.filter((printer) => isActivePrinter(printer)),
    [printers],
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
  const visibleStock = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    const searchedStock = query
      ? stock.filter((item) => {
        const warehouseTotal = item.stock_new + item.stock_refilled;
        const isLow = warehouseTotal < item.min_stock_level;
        const model = modelById.get(item.cartridge_model_id);
        const searchText = [
          item.model_name,
          item.purchase_sku,
          model?.vendor,
          item.stock_new,
          item.stock_refilled,
          item.installed_total,
          item.total,
          item.min_stock_level,
          isLow ? t.lowStock : t.ok,
          model?.is_active ? t.active : t.inactiveModels,
        ]
          .filter((value) => value !== undefined && value !== null)
          .join(" ")
          .toLowerCase();
        return searchText.includes(query);
      })
      : stock;

    if (!stockSortKey) {
      return searchedStock;
    }

    const sortedStock = [...searchedStock].sort((left, right) => {
      const leftValue = getStockSortValue(left, stockSortKey, t);
      const rightValue = getStockSortValue(right, stockSortKey, t);
      return leftValue.localeCompare(rightValue, locale, { numeric: true, sensitivity: "base" });
    });

    return stockSortDirection === "asc" ? sortedStock : sortedStock.reverse();
  }, [locale, modelById, stock, stockSearch, stockSortDirection, stockSortKey, t]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [stockData, modelData, printerData, printerModelData, locationData, orgData, branchData] = await Promise.all([
        fetchJson<CartridgeStock[]>("/api/cartridge-stock"),
        fetchJson<CartridgeModel[]>("/api/cartridge-models?limit=500"),
        fetchJson<Printer[]>("/api/printers?limit=500"),
        fetchJson<PrinterModel[]>("/api/printer-models?limit=500"),
        fetchJson<Location[]>("/api/locations?limit=500"),
        fetchJson<Organization[]>("/api/organizations?limit=500"),
        fetchJson<Branch[]>("/api/branches?limit=500"),
      ]);
      setStock(stockData);
      setModels(modelData);
      setPrinters(printerData);
      setPrinterModels(printerModelData);
      setLocations(locationData);
      setOrganizations(orgData);
      setBranches(branchData);
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
      if (!nextActive && installForm.cartridge_model_id === String(model.id)) {
        setInstallForm({ ...installForm, cartridge_model_id: "" });
      }
      setSuccess(nextActive ? t.modelReactivated : t.modelDeactivated);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function openGenericStockInPanel() {
    setStockInForm(initialStockIn);
    setShowStockInForm(true);
    setShowModelForm(false);
    setShowInstallForm(false);
  }

  function openStockInPanel(item: CartridgeStock) {
    setStockInForm({
      ...initialStockIn,
      cartridge_model_id: String(item.cartridge_model_id),
    });
    setShowStockInForm(true);
    setShowModelForm(false);
    setShowInstallForm(false);
  }

  function openInstallPanel(item: CartridgeStock) {
    setInstallForm({
      ...initialInstall,
      cartridge_model_id: String(item.cartridge_model_id),
    });
    setShowInstallForm(true);
    setShowModelForm(false);
    setShowStockInForm(false);
  }

  function toggleStockSort(key: StockSortKey) {
    if (stockSortKey === key) {
      setStockSortDirection((direction) => direction === "asc" ? "desc" : "asc");
      return;
    }
    setStockSortKey(key);
    setStockSortDirection("asc");
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
      setSuccess(t.stockInAdded);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function installCartridge(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await postJson("/api/cartridge-transactions/install", compactBody({
        ...installForm,
        cartridge_model_id: Number(installForm.cartridge_model_id),
        printer_id: Number(installForm.printer_id),
        quantity: 1,
      }));
      setInstallForm(initialInstall);
      setShowInstallForm(false);
      setSuccess(t.cartridgeInstalled);
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
            <button className="button secondary" onClick={() => { cancelEditModel(); setShowModelForm(true); setShowStockInForm(false); setShowInstallForm(false); }} type="button">
              + {t.cartridgeModel}
            </button>
            <button className="button secondary" onClick={openGenericStockInPanel} type="button">
              + {t.stockIn}
            </button>
          </div>
        )}
        title={t.cartridges}
      />
      <Message loading={loading} error={error} success={success} />
      <div className="table-toolbar">
        <input
          aria-label={t.cartridgeSearchPlaceholder}
          placeholder={t.cartridgeSearchPlaceholder}
          value={stockSearch}
          onChange={(event) => setStockSearch(event.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader activeSortKey={stockSortKey} direction={stockSortDirection} label={t.model} onSort={() => toggleStockSort("model")} sortKey="model" />
              <SortableHeader activeSortKey={stockSortKey} direction={stockSortDirection} label={t.sku} onSort={() => toggleStockSort("sku")} sortKey="sku" />
              <SortableHeader activeSortKey={stockSortKey} direction={stockSortDirection} label={t.stockNew} onSort={() => toggleStockSort("stock_new")} sortKey="stock_new" />
              <SortableHeader activeSortKey={stockSortKey} direction={stockSortDirection} label={t.stockRefilled} onSort={() => toggleStockSort("stock_refilled")} sortKey="stock_refilled" />
              <SortableHeader activeSortKey={stockSortKey} direction={stockSortDirection} label={t.installed} onSort={() => toggleStockSort("installed")} sortKey="installed" />
              <SortableHeader activeSortKey={stockSortKey} direction={stockSortDirection} label={t.total} onSort={() => toggleStockSort("total")} sortKey="total" />
              <SortableHeader activeSortKey={stockSortKey} direction={stockSortDirection} label={t.minStock} onSort={() => toggleStockSort("min_stock")} sortKey="min_stock" />
              <SortableHeader activeSortKey={stockSortKey} direction={stockSortDirection} label={t.stockStatus} onSort={() => toggleStockSort("status")} sortKey="status" />
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {stock.length === 0 ? (
              <EmptyRow colSpan={9} />
            ) : visibleStock.length === 0 ? (
              <tr><td colSpan={9}>{t.nothingFound}</td></tr>
            ) : (
              visibleStock.map((item) => {
                const warehouseTotal = item.stock_new + item.stock_refilled;
                const isLow = warehouseTotal < item.min_stock_level;
                const model = modelById.get(item.cartridge_model_id);
                const modelInactive = model?.is_active === false;
                const replacementDisabled = modelInactive || warehouseTotal <= 0;
                const disabledTitle = modelInactive ? t.inactiveModel : warehouseTotal <= 0 ? t.noStockForInstall : undefined;
                return (
                  <tr className={`${isLow ? "row-warning" : ""} ${modelInactive ? "row-muted" : ""}`} key={item.cartridge_model_id}>
                    <td><Link className="text-link" href={`/cartridges/${item.cartridge_model_id}`}>{item.model_name}</Link></td>
                    <td>{dash(item.purchase_sku)}</td>
                    <td>{item.stock_new}</td>
                    <td>{item.stock_refilled}</td>
                    <td>{item.installed_total}</td>
                    <td>{item.total}</td>
                    <td>{item.min_stock_level}</td>
                    <td><span className={isLow ? "badge warning" : "badge ok"}>{isLow ? t.lowStock : t.ok}</span></td>
                    <td>
                      <div className="icon-actions">
                        <IconButton href={`/cartridges/${item.cartridge_model_id}`} icon="↗" label={t.open} />
                        <IconButton disabled={modelInactive} icon="📦" label={t.stockIn} onClick={() => openStockInPanel(item)} title={modelInactive ? t.inactiveModel : t.stockIn} />
                        <IconButton disabled={replacementDisabled} icon="⇄" label={t.replacement} onClick={() => openInstallPanel(item)} title={disabledTitle ?? t.replacement} />
                      </div>
                    </td>
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
                    <td><IconButton icon="✎" label={t.edit} onClick={() => startEditModel(model)} /></td>
                    <td><IconButton disabled={saving} icon="🗑" label={t.delete} onClick={() => void deleteModel(model)} variant="danger" /></td>
                    <td><IconButton disabled={saving} icon={model.is_active ? "⊘" : "↩"} label={model.is_active ? t.deactivate : t.reactivate} onClick={() => void toggleModelActive(model)} variant={model.is_active ? "warning" : "success"} /></td>
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

      <SidePanel
        onClose={() => { setShowInstallForm(false); setInstallForm(initialInstall); }}
        open={showInstallForm}
        title={t.installOrReplaceCartridge}
      >
        <form className="panel" onSubmit={installCartridge}>
          <label>{t.cartridgeModel}<select required value={installForm.cartridge_model_id} onChange={(e) => setInstallForm({ ...installForm, cartridge_model_id: e.target.value })}><option value=""></option>{activeModels.map((model) => <option key={model.id} value={model.id}>{model.model_name}</option>)}</select></label>
          <label>{t.printer}<select required value={installForm.printer_id} onChange={(e) => setInstallForm({ ...installForm, printer_id: e.target.value })}><option value=""></option>{activePrinters.map((printer) => <option key={printer.id} value={printer.id}>{formatPrinterLabel(printer, printerModelById, locationById, organizationById, branchById, locale)}</option>)}</select></label>
          <label>{t.condition}<select value={installForm.item_condition} onChange={(e) => setInstallForm({ ...installForm, item_condition: e.target.value })}><option value="new">{formatCartridgeCondition("new", locale)}</option><option value="refilled">{formatCartridgeCondition("refilled", locale)}</option></select></label>
          <label>{t.slotName}<input value={installForm.slot_name} onChange={(e) => setInstallForm({ ...installForm, slot_name: e.target.value })} /></label>
          <label>{t.colorRole}<select value={installForm.color_role} onChange={(e) => setInstallForm({ ...installForm, color_role: e.target.value })}><option value="black">{formatColorRole("black", locale)}</option><option value="cyan">{formatColorRole("cyan", locale)}</option><option value="magenta">{formatColorRole("magenta", locale)}</option><option value="yellow">{formatColorRole("yellow", locale)}</option><option value="other">{formatColorRole("other", locale)}</option></select></label>
          <label>{t.comment}<textarea value={installForm.comment} onChange={(e) => setInstallForm({ ...installForm, comment: e.target.value })} /></label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setShowInstallForm(false); setInstallForm(initialInstall); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>
    </section>
  );
}

function getStockSortValue(item: CartridgeStock, key: StockSortKey, labels: { lowStock: string; ok: string }) {
  const warehouseTotal = item.stock_new + item.stock_refilled;
  const isLow = warehouseTotal < item.min_stock_level;
  if (key === "model") {
    return item.model_name;
  }
  if (key === "sku") {
    return item.purchase_sku ?? "";
  }
  if (key === "stock_new") {
    return String(item.stock_new);
  }
  if (key === "stock_refilled") {
    return String(item.stock_refilled);
  }
  if (key === "installed") {
    return String(item.installed_total);
  }
  if (key === "total") {
    return String(item.total);
  }
  if (key === "min_stock") {
    return String(item.min_stock_level);
  }
  return isLow ? labels.lowStock : labels.ok;
}

function SortableHeader({
  activeSortKey,
  direction,
  label,
  onSort,
  sortKey,
}: {
  activeSortKey: StockSortKey | null;
  direction: SortDirection;
  label: string;
  onSort: () => void;
  sortKey: StockSortKey;
}) {
  const active = activeSortKey === sortKey;
  return (
    <th>
      <button className="table-sort-button" onClick={onSort} type="button">
        <span>{label}</span>
        {active ? <span aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  );
}
