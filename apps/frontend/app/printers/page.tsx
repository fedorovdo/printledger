"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, deleteJson, fetchJson, patchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  dash,
  formatColorMode,
  formatPrintTechnology,
  isActivePrinter,
  isArchivedPrinter,
  isRepairPrinter,
  labelPrinterStatus,
} from "@/lib/labels";
import type { Branch, Location, Organization, Printer, PrinterModel } from "@/lib/types";

const initialPrinterModel = {
  vendor: "",
  name: "",
  print_technology: "laser",
  color_mode: "mono",
  cartridge_slots_count: "1",
  notes: "",
};

const initialPrinter = {
  printer_model_id: "",
  serial_number: "",
  inventory_number: "",
  ip_address: "",
  mac_address: "",
  current_location_id: "",
  notes: "",
};

type PrinterFilter = "active" | "repair" | "archived" | "all";
type ModelFilter = "active" | "inactive" | "all";

export default function PrintersPage() {
  const { locale, t } = useI18n();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printerModels, setPrinterModels] = useState<PrinterModel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [modelForm, setModelForm] = useState(initialPrinterModel);
  const [printerForm, setPrinterForm] = useState(initialPrinter);
  const [editingPrinterModelId, setEditingPrinterModelId] = useState<number | null>(null);
  const [printerFilter, setPrinterFilter] = useState<PrinterFilter>("active");
  const [modelFilter, setModelFilter] = useState<ModelFilter>("active");
  const [showModelForm, setShowModelForm] = useState(false);
  const [showPrinterForm, setShowPrinterForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const printerModelName = useMemo(
    () => new Map(printerModels.map((model) => [model.id, model.name])),
    [printerModels],
  );
  const locationName = useMemo(
    () => new Map(locations.map((location) => [location.id, location.display_name])),
    [locations],
  );
  const activeOrganizationIds = useMemo(
    () => new Set(organizations.filter((org) => org.is_active).map((org) => org.id)),
    [organizations],
  );
  const activeBranchIds = useMemo(
    () => new Set(branches.filter((branch) => branch.is_active && activeOrganizationIds.has(branch.organization_id)).map((branch) => branch.id)),
    [activeOrganizationIds, branches],
  );
  const activeLocations = useMemo(
    () => locations.filter(
      (location) => location.is_active
        && activeOrganizationIds.has(location.organization_id)
        && (!location.branch_id || activeBranchIds.has(location.branch_id)),
    ),
    [activeBranchIds, activeOrganizationIds, locations],
  );
  const printerCounts = useMemo(() => ({
    active: printers.filter(isActivePrinter).length,
    repair: printers.filter(isRepairPrinter).length,
    archived: printers.filter(isArchivedPrinter).length,
    all: printers.length,
  }), [printers]);
  const filteredPrinters = useMemo(() => {
    if (printerFilter === "active") {
      return printers.filter(isActivePrinter);
    }
    if (printerFilter === "repair") {
      return printers.filter(isRepairPrinter);
    }
    if (printerFilter === "archived") {
      return printers.filter(isArchivedPrinter);
    }
    return printers;
  }, [printerFilter, printers]);
  const activePrinterModels = useMemo(
    () => printerModels.filter((model) => model.is_active),
    [printerModels],
  );
  const printerModelCounts = useMemo(() => ({
    active: printerModels.filter((model) => model.is_active).length,
    inactive: printerModels.filter((model) => !model.is_active).length,
    all: printerModels.length,
  }), [printerModels]);
  const filteredPrinterModels = useMemo(() => {
    if (modelFilter === "active") {
      return printerModels.filter((model) => model.is_active);
    }
    if (modelFilter === "inactive") {
      return printerModels.filter((model) => !model.is_active);
    }
    return printerModels;
  }, [modelFilter, printerModels]);

  const vendorSuggestions = useMemo(
    () => Array.from(
      new Set(printerModels.map((model) => model.vendor).filter((vendor): vendor is string => Boolean(vendor))),
    ).sort(),
    [printerModels],
  );
  const modelCreatedMessage = locale === "ru"
    ? "Модель принтера создана. Теперь добавьте конкретный принтер через кнопку \"+ Принтер\"."
    : "Printer model created. Now add a physical printer using the \"+ Printer\" button.";

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [printerData, modelData, locationData, orgData, branchData] = await Promise.all([
        fetchJson<Printer[]>("/api/printers?limit=500"),
        fetchJson<PrinterModel[]>("/api/printer-models?limit=500"),
        fetchJson<Location[]>("/api/locations?limit=500"),
        fetchJson<Organization[]>("/api/organizations?limit=500"),
        fetchJson<Branch[]>("/api/branches?limit=500"),
      ]);
      setPrinters(printerData);
      setPrinterModels(modelData);
      setLocations(locationData);
      setOrganizations(orgData);
      setBranches(branchData);
      return printerData;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function submitForm(
    event: FormEvent,
    action: () => Promise<{ type: "info"; message: string } | void>,
    successMessage: string,
  ) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    setInfo(null);
    try {
      const result = await action();
      if (result?.type === "info") {
        setInfo(result.message);
      } else {
        setSuccess(successMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function startEditPrinterModel(model: PrinterModel) {
    setEditingPrinterModelId(model.id);
    setModelForm({
      vendor: model.vendor ?? "",
      name: model.name,
      print_technology: model.print_technology,
      color_mode: model.color_mode,
      cartridge_slots_count: String(model.cartridge_slots_count),
      notes: model.notes ?? "",
    });
    setShowModelForm(true);
    setError(null);
    setSuccess(null);
    setInfo(null);
  }

  function cancelEditPrinterModel() {
    setEditingPrinterModelId(null);
    setModelForm(initialPrinterModel);
  }

  async function deletePrinterModel(model: PrinterModel) {
    if (!window.confirm(`${t.delete}: ${model.name}?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    setInfo(null);
    try {
      await deleteJson(`/api/printer-models/${model.id}`);
      setSuccess(t.modelDeleted);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.linkedModelDeleteBlocked);
    } finally {
      setSaving(false);
    }
  }

  async function togglePrinterModelActive(model: PrinterModel) {
    const nextActive = !model.is_active;
    if (!nextActive && !window.confirm(t.deactivateModelConfirm)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    setInfo(null);
    try {
      await patchJson<PrinterModel>(`/api/printer-models/${model.id}`, { is_active: nextActive });
      if (!nextActive && printerForm.printer_model_id === String(model.id)) {
        setPrinterForm({ ...printerForm, printer_model_id: "" });
      }
      setSuccess(nextActive ? t.modelReactivated : t.modelDeactivated);
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
        title={t.printers}
        action={
          <div className="page-actions">
            <button className="button secondary" onClick={() => setShowModelForm((value) => !value)} type="button">
              {showModelForm ? `- ${t.printerModel}` : `+ ${t.printerModel}`}
            </button>
            <button className="button secondary" onClick={() => setShowPrinterForm((value) => !value)} type="button">
              {showPrinterForm ? `- ${t.printer}` : `+ ${t.printer}`}
            </button>
          </div>
        }
      />
      <Message loading={loading} error={error} success={success} info={info} />

      <div className="filter-bar">
        <button className={printerFilter === "active" ? "active" : ""} onClick={() => setPrinterFilter("active")} type="button">{t.activePrinters} ({printerCounts.active})</button>
        <button className={printerFilter === "repair" ? "active" : ""} onClick={() => setPrinterFilter("repair")} type="button">{t.repairPrinters} ({printerCounts.repair})</button>
        <button className={printerFilter === "archived" ? "active" : ""} onClick={() => setPrinterFilter("archived")} type="button">{t.archivedWrittenOff} ({printerCounts.archived})</button>
        <button className={printerFilter === "all" ? "active" : ""} onClick={() => setPrinterFilter("all")} type="button">{t.allPrinters} ({printerCounts.all})</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.printerModel}</th>
              <th>{t.inventoryNumber}</th>
              <th>{t.serialNumber}</th>
              <th>{t.ipAddress}</th>
              <th>{t.location}</th>
              <th>{t.status}</th>
              <th>{t.archived}</th>
              <th>{t.open}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrinters.length === 0 ? (
              <EmptyRow colSpan={8} />
            ) : (
              filteredPrinters.map((printer) => (
                <tr className={isArchivedPrinter(printer) ? "row-muted" : ""} key={printer.id}>
                  <td><Link className="text-link" href={`/printers/${printer.id}`}>{printerModelName.get(printer.printer_model_id) ?? `${t.printer} #${printer.id}`}</Link></td>
                  <td>{dash(printer.inventory_number)}</td>
                  <td>{dash(printer.serial_number)}</td>
                  <td>{dash(printer.ip_address)}</td>
                  <td>{printer.current_location_id ? dash(locationName.get(printer.current_location_id)) : dash(null)}</td>
                  <td>{labelPrinterStatus(printer.status, locale)}</td>
                  <td>{isArchivedPrinter(printer) ? t.yes : t.no}</td>
                  <td><Link className="button tiny secondary" href={`/printers/${printer.id}`}>{t.open}</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(showModelForm || showPrinterForm) && (
        <div className="form-grid">
          {showModelForm && (
            <div className="model-management">
              <form className="panel" onSubmit={(event) => submitForm(event, async () => {
                if (editingPrinterModelId) {
                  await patchJson<PrinterModel>(`/api/printer-models/${editingPrinterModelId}`, compactBody({
                    ...modelForm,
                    cartridge_slots_count: Number(modelForm.cartridge_slots_count),
                  }));
                  setEditingPrinterModelId(null);
                  setModelForm(initialPrinterModel);
                  await loadData();
                  return;
                }
                const createdModel = await postJson<PrinterModel>("/api/printer-models", compactBody({
                  ...modelForm,
                  cartridge_slots_count: Number(modelForm.cartridge_slots_count),
                }));
                setModelForm(initialPrinterModel);
                setShowModelForm(false);
                setShowPrinterForm(true);
                setPrinterForm({ ...initialPrinter, printer_model_id: String(createdModel.id) });
                await loadData();
              }, editingPrinterModelId ? t.modelUpdated : modelCreatedMessage)}>
                <h2>{editingPrinterModelId ? t.editPrinterModel : t.addPrinterModel}</h2>
                <p className="muted">{t.printerModelCatalogHint}</p>
                <label>{t.vendor}<input list="printer-vendor-suggestions" value={modelForm.vendor} onChange={(e) => setModelForm({ ...modelForm, vendor: e.target.value })} /></label>
                <datalist id="printer-vendor-suggestions">{vendorSuggestions.map((vendor) => <option key={vendor} value={vendor} />)}</datalist>
                <label>{t.modelName}<input required value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} /></label>
                <label>{t.printTechnology}<select value={modelForm.print_technology} onChange={(e) => setModelForm({ ...modelForm, print_technology: e.target.value })}><option value="laser">{formatPrintTechnology("laser", locale)}</option><option value="inkjet">{formatPrintTechnology("inkjet", locale)}</option><option value="other">{formatPrintTechnology("other", locale)}</option></select></label>
                <label>{t.colorMode}<select value={modelForm.color_mode} onChange={(e) => setModelForm({ ...modelForm, color_mode: e.target.value })}><option value="mono">{formatColorMode("mono", locale)}</option><option value="color">{formatColorMode("color", locale)}</option></select></label>
                <label>{t.slots}<input min="1" type="number" value={modelForm.cartridge_slots_count} onChange={(e) => setModelForm({ ...modelForm, cartridge_slots_count: e.target.value })} /></label>
                <label>{t.notes}<textarea value={modelForm.notes} onChange={(e) => setModelForm({ ...modelForm, notes: e.target.value })} /></label>
                <div className="inline-actions">
                  <button className="button" disabled={saving} type="submit">{t.save}</button>
                  {editingPrinterModelId && <button className="button secondary" onClick={cancelEditPrinterModel} type="button">{t.cancel}</button>}
                </div>
              </form>
              <section className="catalog-section">
                <h2>{t.printerModelCatalog}</h2>
                <div className="filter-bar compact-filter">
                  <button className={modelFilter === "active" ? "active" : ""} onClick={() => setModelFilter("active")} type="button">{t.activeModels} ({printerModelCounts.active})</button>
                  <button className={modelFilter === "inactive" ? "active" : ""} onClick={() => setModelFilter("inactive")} type="button">{t.inactiveModels} ({printerModelCounts.inactive})</button>
                  <button className={modelFilter === "all" ? "active" : ""} onClick={() => setModelFilter("all")} type="button">{t.allModels} ({printerModelCounts.all})</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.vendor}</th>
                        <th>{t.modelName}</th>
                        <th>{t.printTechnology}</th>
                        <th>{t.colorMode}</th>
                        <th>{t.active}</th>
                        <th>{t.edit}</th>
                        <th>{t.delete}</th>
                        <th>{t.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrinterModels.length === 0 ? (
                        <EmptyRow colSpan={8} />
                      ) : (
                        filteredPrinterModels.map((model) => (
                          <tr className={!model.is_active ? "row-muted" : ""} key={model.id}>
                            <td>{dash(model.vendor)}</td>
                            <td>{model.name}</td>
                            <td>{formatPrintTechnology(model.print_technology, locale)}</td>
                            <td>{formatColorMode(model.color_mode, locale)}</td>
                            <td>{model.is_active ? t.yes : t.no}</td>
                            <td><button className="button tiny secondary" onClick={() => startEditPrinterModel(model)} type="button">{t.edit}</button></td>
                            <td><button className="button tiny danger" disabled={saving} onClick={() => void deletePrinterModel(model)} type="button">{t.delete}</button></td>
                            <td><button className="button tiny secondary" disabled={saving} onClick={() => void togglePrinterModelActive(model)} type="button">{model.is_active ? t.deactivate : t.reactivate}</button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {showPrinterForm && (
            <form className="panel" onSubmit={(event) => submitForm(event, async () => {
              const previousPrinterFilter = printerFilter;
              const createdPrinter = await postJson<Printer>("/api/printers", compactBody({
                ...printerForm,
                printer_model_id: Number(printerForm.printer_model_id),
                current_location_id: printerForm.current_location_id ? Number(printerForm.current_location_id) : null,
              }));
              setPrinterForm(initialPrinter);
              setShowPrinterForm(false);
              const reloadedPrinters = await loadData();
              const createdInList = reloadedPrinters.some((printer) => printer.id === createdPrinter.id);
              if (isActivePrinter(createdPrinter)) {
                setPrinterFilter("active");
              }
              if (!createdInList) {
                return {
                  type: "info",
                  message: locale === "ru"
                    ? "Принтер создан, но не найден в загруженном списке. Обновите страницу или проверьте фильтр."
                    : "Printer was created but was not found in the loaded list. Refresh the page or check the filter.",
                };
              }
              if (isActivePrinter(createdPrinter) && previousPrinterFilter !== "active") {
                return {
                  type: "info",
                  message: locale === "ru"
                    ? "Принтер создан. Переключил фильтр на \"Активные\", чтобы новая запись была видна в таблице."
                    : "Printer created. Switched the filter to \"Active\" so the new record is visible in the table.",
                };
              }
              if (!isActivePrinter(createdPrinter)) {
                return {
                  type: "info",
                  message: locale === "ru"
                    ? "Принтер создан, но скрыт текущим фильтром, потому что он не в статусе \"В работе\"."
                    : "Printer was created but is hidden by the current filter because it is not in work.",
                };
              }
            }, t.created)}>
              <h2>{t.addPrinter}</h2>
              <label>{t.printerModel}<select required value={printerForm.printer_model_id} onChange={(e) => setPrinterForm({ ...printerForm, printer_model_id: e.target.value })}><option value=""></option>{activePrinterModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
              <label>{t.serialNumber}<input value={printerForm.serial_number} onChange={(e) => setPrinterForm({ ...printerForm, serial_number: e.target.value })} /></label>
              <label>{t.inventoryNumber}<input value={printerForm.inventory_number} onChange={(e) => setPrinterForm({ ...printerForm, inventory_number: e.target.value })} /></label>
              <label>{t.ipAddress}<input value={printerForm.ip_address} onChange={(e) => setPrinterForm({ ...printerForm, ip_address: e.target.value })} /></label>
              <label>{t.macAddress}<input value={printerForm.mac_address} onChange={(e) => setPrinterForm({ ...printerForm, mac_address: e.target.value })} /></label>
              <label>{t.location}<select value={printerForm.current_location_id} onChange={(e) => setPrinterForm({ ...printerForm, current_location_id: e.target.value })}><option value=""></option>{activeLocations.map((location) => <option key={location.id} value={location.id}>{location.display_name}</option>)}</select></label>
              <label>{t.notes}<textarea value={printerForm.notes} onChange={(e) => setPrinterForm({ ...printerForm, notes: e.target.value })} /></label>
              <button className="button" disabled={saving} type="submit">{t.save}</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
