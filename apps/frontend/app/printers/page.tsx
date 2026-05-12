"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { IconButton } from "@/components/IconButton";
import { SidePanel } from "@/components/SidePanel";
import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, deleteJson, fetchJson, patchJson, postJson } from "@/lib/api";
import { useI18n, type Locale } from "@/lib/i18n";
import {
  dash,
  formatColorMode,
  formatLocationLabel,
  formatLocationPlaceLabel,
  formatLocationRoom,
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

const initialQuickLocation = {
  organization_id: "",
  branch_id: "",
  department: "",
  room: "",
  notes: "",
};

type PrinterFilter = "active" | "repair" | "archived" | "all";
type ModelFilter = "active" | "inactive" | "all";
type PrinterSortKey = "model" | "inventory" | "serial" | "ip" | "location" | "room" | "status" | "archived";
type SortDirection = "asc" | "desc";

const initialMoveLocation = { to_location_id: "", reason: "", notes: "" };

export default function PrintersPage() {
  const { locale, t } = useI18n();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printerModels, setPrinterModels] = useState<PrinterModel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [modelForm, setModelForm] = useState(initialPrinterModel);
  const [printerForm, setPrinterForm] = useState(initialPrinter);
  const [quickLocationForm, setQuickLocationForm] = useState(initialQuickLocation);
  const [moveLocationForm, setMoveLocationForm] = useState(initialMoveLocation);
  const [locationPanelPrinter, setLocationPanelPrinter] = useState<Printer | null>(null);
  const [editingPrinterModelId, setEditingPrinterModelId] = useState<number | null>(null);
  const [printerFilter, setPrinterFilter] = useState<PrinterFilter>("active");
  const [modelFilter, setModelFilter] = useState<ModelFilter>("active");
  const [printerSearch, setPrinterSearch] = useState("");
  const [printerSortKey, setPrinterSortKey] = useState<PrinterSortKey | null>(null);
  const [printerSortDirection, setPrinterSortDirection] = useState<SortDirection>("asc");
  const [showModelForm, setShowModelForm] = useState(false);
  const [showPrinterForm, setShowPrinterForm] = useState(false);
  const [showQuickLocationForm, setShowQuickLocationForm] = useState(false);
  const [showMoveQuickLocationForm, setShowMoveQuickLocationForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const printerModelName = useMemo(
    () => new Map(printerModels.map((model) => [model.id, model.name])),
    [printerModels],
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
    () => new Map(organizations.map((org) => [org.id, org])),
    [organizations],
  );
  const branchById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch])),
    [branches],
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
        && (location.branch_id === null || activeBranchIds.has(location.branch_id)),
    ),
    [activeBranchIds, activeOrganizationIds, locations],
  );
  const activeOrganizations = useMemo(
    () => organizations.filter((org) => org.is_active),
    [organizations],
  );
  const quickLocationBranches = useMemo(
    () => branches.filter(
      (branch) => branch.is_active
        && activeOrganizationIds.has(branch.organization_id)
        && (!quickLocationForm.organization_id || branch.organization_id === Number(quickLocationForm.organization_id)),
    ),
    [activeOrganizationIds, branches, quickLocationForm.organization_id],
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
  const visiblePrinters = useMemo(() => {
    const query = printerSearch.trim().toLowerCase();
    const searchedPrinters = query
      ? filteredPrinters.filter((printer) => {
        const model = printerModelById.get(printer.printer_model_id);
        const location = printer.current_location_id ? locationById.get(printer.current_location_id) : undefined;
        const searchText = [
          model?.name,
          model?.vendor,
          printer.inventory_number,
          printer.serial_number,
          printer.ip_address,
          printer.mac_address,
          location ? formatLocationLabel(location, organizationById, branchById, locale) : undefined,
          location ? formatLocationPlaceLabel(location, organizationById, branchById) : undefined,
          location?.room,
          location?.department,
          labelPrinterStatus(printer.status, locale),
          isArchivedPrinter(printer) ? t.yes : t.no,
        ].filter(Boolean).join(" ").toLowerCase();

        return searchText.includes(query);
      })
      : filteredPrinters;

    if (!printerSortKey) {
      return searchedPrinters;
    }

    const sortedPrinters = [...searchedPrinters].sort((left, right) => {
      const leftValue = getPrinterSortValue(left, printerSortKey, printerModelById, locationById, organizationById, branchById, locale, t);
      const rightValue = getPrinterSortValue(right, printerSortKey, printerModelById, locationById, organizationById, branchById, locale, t);
      return leftValue.localeCompare(rightValue, locale, { numeric: true, sensitivity: "base" });
    });

    return printerSortDirection === "asc" ? sortedPrinters : sortedPrinters.reverse();
  }, [
    branchById,
    filteredPrinters,
    locale,
    locationById,
    organizationById,
    printerModelById,
    printerSearch,
    printerSortDirection,
    printerSortKey,
    t,
  ]);
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
  const locationPanelCurrentLocation = locationPanelPrinter?.current_location_id
    ? locationById.get(locationPanelPrinter.current_location_id)
    : undefined;
  const locationPanelModel = locationPanelPrinter
    ? printerModelById.get(locationPanelPrinter.printer_model_id)
    : undefined;

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

  function togglePrinterSort(key: PrinterSortKey) {
    if (printerSortKey === key) {
      setPrinterSortDirection((direction) => direction === "asc" ? "desc" : "asc");
      return;
    }
    setPrinterSortKey(key);
    setPrinterSortDirection("asc");
  }

  function openLocationPanel(printer: Printer) {
    setLocationPanelPrinter(printer);
    setMoveLocationForm(initialMoveLocation);
    setShowMoveQuickLocationForm(false);
    setQuickLocationForm(initialQuickLocation);
    setShowModelForm(false);
    setShowPrinterForm(false);
    setError(null);
    setSuccess(null);
    setInfo(null);
  }

  function closeLocationPanel() {
    setLocationPanelPrinter(null);
    setMoveLocationForm(initialMoveLocation);
    setShowMoveQuickLocationForm(false);
    setQuickLocationForm(initialQuickLocation);
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

  async function createQuickLocation(target: "printer" | "move" = "printer") {
    if (!quickLocationForm.organization_id) {
      setError(t.organizationRequired);
      return;
    }
    if (!quickLocationForm.room.trim()) {
      setError(t.roomRequired);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    setInfo(null);
    try {
      const createdLocation = await postJson<Location>("/api/locations", compactBody({
        organization_id: Number(quickLocationForm.organization_id),
        branch_id: quickLocationForm.branch_id ? Number(quickLocationForm.branch_id) : null,
        department: quickLocationForm.department || null,
        room: quickLocationForm.room,
        display_name: null,
        notes: quickLocationForm.notes || null,
      }));
      await loadData();
      if (target === "move") {
        setMoveLocationForm((current) => ({ ...current, to_location_id: String(createdLocation.id) }));
        setShowMoveQuickLocationForm(false);
      } else {
        setPrinterForm((current) => ({ ...current, current_location_id: String(createdLocation.id) }));
        setShowQuickLocationForm(false);
      }
      setQuickLocationForm(initialQuickLocation);
      setSuccess(t.roomAddedAndSelected);
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
            <button className="button secondary" onClick={() => { cancelEditPrinterModel(); setShowModelForm(true); setShowPrinterForm(false); }} type="button">
              + {t.printerModel}
            </button>
            <button className="button secondary" onClick={() => { setShowPrinterForm(true); setShowModelForm(false); }} type="button">
              + {t.printer}
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

      <div className="table-toolbar">
        <input
          aria-label={t.printerSearchPlaceholder}
          onChange={(event) => setPrinterSearch(event.target.value)}
          placeholder={t.printerSearchPlaceholder}
          type="search"
          value={printerSearch}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableHeader direction={printerSortDirection} label={t.printerModel} onSort={() => togglePrinterSort("model")} sortKey="model" activeSortKey={printerSortKey} />
              <SortableHeader direction={printerSortDirection} label={t.inventoryNumber} onSort={() => togglePrinterSort("inventory")} sortKey="inventory" activeSortKey={printerSortKey} />
              <SortableHeader direction={printerSortDirection} label={t.serialNumber} onSort={() => togglePrinterSort("serial")} sortKey="serial" activeSortKey={printerSortKey} />
              <SortableHeader direction={printerSortDirection} label={t.ipAddress} onSort={() => togglePrinterSort("ip")} sortKey="ip" activeSortKey={printerSortKey} />
              <SortableHeader direction={printerSortDirection} label={t.location} onSort={() => togglePrinterSort("location")} sortKey="location" activeSortKey={printerSortKey} />
              <SortableHeader direction={printerSortDirection} label={t.room} onSort={() => togglePrinterSort("room")} sortKey="room" activeSortKey={printerSortKey} />
              <SortableHeader direction={printerSortDirection} label={t.status} onSort={() => togglePrinterSort("status")} sortKey="status" activeSortKey={printerSortKey} />
              <SortableHeader direction={printerSortDirection} label={t.archived} onSort={() => togglePrinterSort("archived")} sortKey="archived" activeSortKey={printerSortKey} />
              <th>{t.locationAction}</th>
              <th>{t.open}</th>
            </tr>
          </thead>
          <tbody>
            {visiblePrinters.length === 0 ? (
              <tr><td className="empty" colSpan={10}>{printerSearch.trim() ? t.nothingFound : t.noData}</td></tr>
            ) : (
              visiblePrinters.map((printer) => (
                <tr className={isArchivedPrinter(printer) ? "row-muted" : ""} key={printer.id}>
                  <td><Link className="text-link" href={`/printers/${printer.id}`}>{printerModelName.get(printer.printer_model_id) ?? `${t.printer} #${printer.id}`}</Link></td>
                  <td>{dash(printer.inventory_number)}</td>
                  <td>{dash(printer.serial_number)}</td>
                  <td>{dash(printer.ip_address)}</td>
                  <td>{printer.current_location_id ? formatLocationPlaceLabel(locationById.get(printer.current_location_id), organizationById, branchById) : dash(null)}</td>
                  <td>{printer.current_location_id ? formatLocationRoom(locationById.get(printer.current_location_id), locale) : dash(null)}</td>
                  <td>{labelPrinterStatus(printer.status, locale)}</td>
                  <td>{isArchivedPrinter(printer) ? t.yes : t.no}</td>
                  <td><IconButton disabled={isArchivedPrinter(printer)} icon="📍" label={t.locationAction} onClick={() => openLocationPanel(printer)} title={isArchivedPrinter(printer) ? t.archivedPrinterMoveDisabled : t.locationAction} /></td>
                  <td><IconButton href={`/printers/${printer.id}`} icon="↗" label={t.open} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                    <td><IconButton icon="✎" label={t.edit} onClick={() => startEditPrinterModel(model)} /></td>
                    <td><IconButton disabled={saving} icon="🗑" label={t.delete} onClick={() => void deletePrinterModel(model)} variant="danger" /></td>
                    <td><IconButton disabled={saving} icon={model.is_active ? "⊘" : "↩"} label={model.is_active ? t.deactivate : t.reactivate} onClick={() => void togglePrinterModelActive(model)} variant={model.is_active ? "warning" : "success"} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SidePanel
        onClose={() => { setShowModelForm(false); cancelEditPrinterModel(); }}
        open={showModelForm}
        title={editingPrinterModelId ? t.editPrinterModel : t.addPrinterModel}
      >
        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          if (editingPrinterModelId) {
            await patchJson<PrinterModel>(`/api/printer-models/${editingPrinterModelId}`, compactBody({
              ...modelForm,
              cartridge_slots_count: Number(modelForm.cartridge_slots_count),
            }));
            setEditingPrinterModelId(null);
            setModelForm(initialPrinterModel);
            setShowModelForm(false);
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
            <button className="button secondary" onClick={() => { setShowModelForm(false); cancelEditPrinterModel(); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>

      <SidePanel
        onClose={() => { setShowPrinterForm(false); setShowQuickLocationForm(false); setQuickLocationForm(initialQuickLocation); }}
        open={showPrinterForm}
        title={t.addPrinter}
      >
        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          const previousPrinterFilter = printerFilter;
          const createdPrinter = await postJson<Printer>("/api/printers", compactBody({
            ...printerForm,
            printer_model_id: Number(printerForm.printer_model_id),
            current_location_id: printerForm.current_location_id ? Number(printerForm.current_location_id) : null,
          }));
          setPrinterForm(initialPrinter);
          setShowPrinterForm(false);
          setShowQuickLocationForm(false);
          setQuickLocationForm(initialQuickLocation);
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
          <label>{t.printerModel}<select required value={printerForm.printer_model_id} onChange={(e) => setPrinterForm({ ...printerForm, printer_model_id: e.target.value })}><option value=""></option>{activePrinterModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
          <label>{t.serialNumber}<input value={printerForm.serial_number} onChange={(e) => setPrinterForm({ ...printerForm, serial_number: e.target.value })} /></label>
          <label>{t.inventoryNumber}<input value={printerForm.inventory_number} onChange={(e) => setPrinterForm({ ...printerForm, inventory_number: e.target.value })} /></label>
          <label>{t.ipAddress}<input value={printerForm.ip_address} onChange={(e) => setPrinterForm({ ...printerForm, ip_address: e.target.value })} /></label>
          <label>{t.macAddress}<input value={printerForm.mac_address} onChange={(e) => setPrinterForm({ ...printerForm, mac_address: e.target.value })} /></label>
          <label>{t.location}<select value={printerForm.current_location_id} onChange={(e) => setPrinterForm({ ...printerForm, current_location_id: e.target.value })}><option value=""></option>{activeLocations.map((location) => <option key={location.id} value={location.id}>{formatLocationLabel(location, organizationById, branchById, locale)}</option>)}</select></label>
          <button className="button secondary" onClick={() => setShowQuickLocationForm((value) => !value)} type="button">
            {showQuickLocationForm ? `- ${t.room}` : `+ ${t.room}`}
          </button>
          {showQuickLocationForm && (
            <div className="subpanel">
              <h3>{t.addRoom}</h3>
              <label>{t.organizations}<select required value={quickLocationForm.organization_id} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, organization_id: e.target.value, branch_id: "" })}><option value=""></option>{activeOrganizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
              <label>{t.branch}<select value={quickLocationForm.branch_id} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, branch_id: e.target.value })}><option value=""></option>{quickLocationBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
              <p className="muted">{t.branchOptionalHint}</p>
              <label>{t.department}<input placeholder={t.departmentOptional} value={quickLocationForm.department} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, department: e.target.value })} /></label>
              <label>{t.room}<input required value={quickLocationForm.room} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, room: e.target.value })} /></label>
              <label>{t.notes}<textarea value={quickLocationForm.notes} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, notes: e.target.value })} /></label>
              <div className="inline-actions">
                <button className="button" disabled={saving} onClick={() => void createQuickLocation()} type="button">{t.createRoom}</button>
                <button className="button secondary" disabled={saving} onClick={() => { setShowQuickLocationForm(false); setQuickLocationForm(initialQuickLocation); }} type="button">{t.cancel}</button>
              </div>
            </div>
          )}
          <label>{t.notes}<textarea value={printerForm.notes} onChange={(e) => setPrinterForm({ ...printerForm, notes: e.target.value })} /></label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setShowPrinterForm(false); setShowQuickLocationForm(false); setQuickLocationForm(initialQuickLocation); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>

      <SidePanel
        onClose={closeLocationPanel}
        open={locationPanelPrinter !== null}
        title={t.changeLocation}
      >
        {locationPanelPrinter && (
          <form className="panel" onSubmit={(event) => submitForm(event, async () => {
            await postJson(`/api/printers/${locationPanelPrinter.id}/move`, compactBody({
              to_location_id: Number(moveLocationForm.to_location_id),
              reason: moveLocationForm.reason || t.quickLocationChangeReason,
              notes: moveLocationForm.notes || null,
            }));
            closeLocationPanel();
            await loadData();
          }, t.printerLocationUpdated)}>
            <dl className="details">
              <dt>{t.printerModel}</dt><dd>{dash(locationPanelModel?.name)}</dd>
              <dt>{t.serialNumber}</dt><dd>{dash(locationPanelPrinter.serial_number)}</dd>
              <dt>{t.inventoryNumber}</dt><dd>{dash(locationPanelPrinter.inventory_number)}</dd>
              <dt>{t.currentLocation}</dt><dd>{formatLocationPlaceLabel(locationPanelCurrentLocation, organizationById, branchById)}</dd>
              <dt>{t.currentRoom}</dt><dd>{formatLocationRoom(locationPanelCurrentLocation, locale)}</dd>
            </dl>
            <label>{t.toLocation}<select required value={moveLocationForm.to_location_id} onChange={(e) => setMoveLocationForm({ ...moveLocationForm, to_location_id: e.target.value })}><option value=""></option>{activeLocations.map((location) => <option key={location.id} value={location.id}>{formatLocationLabel(location, organizationById, branchById, locale)}</option>)}</select></label>
            <button className="button secondary" onClick={() => setShowMoveQuickLocationForm((value) => !value)} type="button">
              {showMoveQuickLocationForm ? `- ${t.room}` : `+ ${t.room}`}
            </button>
            {showMoveQuickLocationForm && (
              <div className="subpanel">
                <h3>{t.addRoom}</h3>
                <label>{t.organizations}<select required value={quickLocationForm.organization_id} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, organization_id: e.target.value, branch_id: "" })}><option value=""></option>{activeOrganizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
                <label>{t.branch}<select value={quickLocationForm.branch_id} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, branch_id: e.target.value })}><option value=""></option>{quickLocationBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                <p className="muted">{t.branchOptionalHint}</p>
                <label>{t.department}<input placeholder={t.departmentOptional} value={quickLocationForm.department} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, department: e.target.value })} /></label>
                <label>{t.room}<input required value={quickLocationForm.room} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, room: e.target.value })} /></label>
                <label>{t.notes}<textarea value={quickLocationForm.notes} onChange={(e) => setQuickLocationForm({ ...quickLocationForm, notes: e.target.value })} /></label>
                <div className="inline-actions">
                  <button className="button" disabled={saving} onClick={() => void createQuickLocation("move")} type="button">{t.createRoom}</button>
                  <button className="button secondary" disabled={saving} onClick={() => { setShowMoveQuickLocationForm(false); setQuickLocationForm(initialQuickLocation); }} type="button">{t.cancel}</button>
                </div>
              </div>
            )}
            <label>{t.reason}<input value={moveLocationForm.reason} onChange={(e) => setMoveLocationForm({ ...moveLocationForm, reason: e.target.value })} /></label>
            <label>{t.notes}<textarea value={moveLocationForm.notes} onChange={(e) => setMoveLocationForm({ ...moveLocationForm, notes: e.target.value })} /></label>
            <div className="inline-actions">
              <button className="button" disabled={saving} type="submit">{t.save}</button>
              <button className="button secondary" onClick={closeLocationPanel} type="button">{t.cancel}</button>
            </div>
          </form>
        )}
      </SidePanel>
    </section>
  );
}

function getPrinterSortValue(
  printer: Printer,
  key: PrinterSortKey,
  printerModelById: ReadonlyMap<number, PrinterModel>,
  locationById: ReadonlyMap<number, Location>,
  organizationById: ReadonlyMap<number, Organization>,
  branchById: ReadonlyMap<number, Branch>,
  locale: Locale,
  labels: { yes: string; no: string },
) {
  const model = printerModelById.get(printer.printer_model_id);
  const location = printer.current_location_id ? locationById.get(printer.current_location_id) : undefined;

  if (key === "model") {
    return [model?.name, model?.vendor].filter(Boolean).join(" ");
  }
  if (key === "inventory") {
    return printer.inventory_number ?? "";
  }
  if (key === "serial") {
    return printer.serial_number ?? "";
  }
  if (key === "ip") {
    return printer.ip_address ?? "";
  }
  if (key === "location") {
    return location ? formatLocationPlaceLabel(location, organizationById, branchById) : "";
  }
  if (key === "room") {
    return location?.room ?? "";
  }
  if (key === "status") {
    return labelPrinterStatus(printer.status, locale);
  }
  return isArchivedPrinter(printer) ? labels.yes : labels.no;
}

function SortableHeader({
  activeSortKey,
  direction,
  label,
  onSort,
  sortKey,
}: {
  activeSortKey: PrinterSortKey | null;
  direction: SortDirection;
  label: string;
  onSort: () => void;
  sortKey: PrinterSortKey;
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
