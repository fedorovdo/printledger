"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, fetchJson, postJson } from "@/lib/api";
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
import type { Location, Printer, PrinterModel } from "@/lib/types";

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

export default function PrintersPage() {
  const { locale, t } = useI18n();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printerModels, setPrinterModels] = useState<PrinterModel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [modelForm, setModelForm] = useState(initialPrinterModel);
  const [printerForm, setPrinterForm] = useState(initialPrinter);
  const [printerFilter, setPrinterFilter] = useState<PrinterFilter>("active");
  const [showModelForm, setShowModelForm] = useState(false);
  const [showPrinterForm, setShowPrinterForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const printerModelName = useMemo(
    () => new Map(printerModels.map((model) => [model.id, model.name])),
    [printerModels],
  );
  const locationName = useMemo(
    () => new Map(locations.map((location) => [location.id, location.display_name])),
    [locations],
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

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [printerData, modelData, locationData] = await Promise.all([
        fetchJson<Printer[]>("/api/printers"),
        fetchJson<PrinterModel[]>("/api/printer-models"),
        fetchJson<Location[]>("/api/locations"),
      ]);
      setPrinters(printerData);
      setPrinterModels(modelData);
      setLocations(locationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function submitForm(
    event: FormEvent,
    action: () => Promise<void>,
    successMessage: string,
  ) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(successMessage);
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
      <Message loading={loading} error={error} success={success} />

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
            <form className="panel" onSubmit={(event) => submitForm(event, async () => {
              await postJson("/api/printer-models", compactBody({
                ...modelForm,
                cartridge_slots_count: Number(modelForm.cartridge_slots_count),
              }));
              setModelForm(initialPrinterModel);
              setShowModelForm(false);
              await loadData();
            }, t.created)}>
              <h2>{t.addPrinterModel}</h2>
              <label>{t.vendor}<input value={modelForm.vendor} onChange={(e) => setModelForm({ ...modelForm, vendor: e.target.value })} /></label>
              <label>{t.modelName}<input required value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} /></label>
              <label>{t.printTechnology}<select value={modelForm.print_technology} onChange={(e) => setModelForm({ ...modelForm, print_technology: e.target.value })}><option value="laser">{formatPrintTechnology("laser", locale)}</option><option value="inkjet">{formatPrintTechnology("inkjet", locale)}</option><option value="other">{formatPrintTechnology("other", locale)}</option></select></label>
              <label>{t.colorMode}<select value={modelForm.color_mode} onChange={(e) => setModelForm({ ...modelForm, color_mode: e.target.value })}><option value="mono">{formatColorMode("mono", locale)}</option><option value="color">{formatColorMode("color", locale)}</option></select></label>
              <label>{t.slots}<input min="1" type="number" value={modelForm.cartridge_slots_count} onChange={(e) => setModelForm({ ...modelForm, cartridge_slots_count: e.target.value })} /></label>
              <label>{t.notes}<textarea value={modelForm.notes} onChange={(e) => setModelForm({ ...modelForm, notes: e.target.value })} /></label>
              <button className="button" disabled={saving} type="submit">{t.save}</button>
            </form>
          )}

          {showPrinterForm && (
            <form className="panel" onSubmit={(event) => submitForm(event, async () => {
              await postJson("/api/printers", compactBody({
                ...printerForm,
                printer_model_id: Number(printerForm.printer_model_id),
                current_location_id: printerForm.current_location_id ? Number(printerForm.current_location_id) : null,
              }));
              setPrinterForm(initialPrinter);
              setShowPrinterForm(false);
              await loadData();
            }, t.created)}>
              <h2>{t.addPrinter}</h2>
              <label>{t.printerModel}<select required value={printerForm.printer_model_id} onChange={(e) => setPrinterForm({ ...printerForm, printer_model_id: e.target.value })}><option value=""></option>{printerModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
              <label>{t.serialNumber}<input value={printerForm.serial_number} onChange={(e) => setPrinterForm({ ...printerForm, serial_number: e.target.value })} /></label>
              <label>{t.inventoryNumber}<input value={printerForm.inventory_number} onChange={(e) => setPrinterForm({ ...printerForm, inventory_number: e.target.value })} /></label>
              <label>{t.ipAddress}<input value={printerForm.ip_address} onChange={(e) => setPrinterForm({ ...printerForm, ip_address: e.target.value })} /></label>
              <label>{t.macAddress}<input value={printerForm.mac_address} onChange={(e) => setPrinterForm({ ...printerForm, mac_address: e.target.value })} /></label>
              <label>{t.location}<select value={printerForm.current_location_id} onChange={(e) => setPrinterForm({ ...printerForm, current_location_id: e.target.value })}><option value=""></option>{locations.map((location) => <option key={location.id} value={location.id}>{location.display_name}</option>)}</select></label>
              <label>{t.notes}<textarea value={printerForm.notes} onChange={(e) => setPrinterForm({ ...printerForm, notes: e.target.value })} /></label>
              <button className="button" disabled={saving} type="submit">{t.save}</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
