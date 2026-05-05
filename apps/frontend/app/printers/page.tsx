"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, fetchJson, patchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  dash,
  formatPrinterLabel,
  isActivePrinter,
  isArchivedPrinter,
  isRepairPrinter,
  labelPrinterStatus,
  removeActionFlags,
} from "@/lib/labels";
import type {
  CartridgeModel,
  InstalledCartridge,
  Location,
  Printer,
  PrinterModel,
  PrinterRepair,
} from "@/lib/types";

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
  const [cartridgeModels, setCartridgeModels] = useState<CartridgeModel[]>([]);
  const [installed, setInstalled] = useState<InstalledCartridge[]>([]);
  const [repairs, setRepairs] = useState<PrinterRepair[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState("");
  const [modelForm, setModelForm] = useState(initialPrinterModel);
  const [printerForm, setPrinterForm] = useState(initialPrinter);
  const [removeForm, setRemoveForm] = useState({ installed_cartridge_id: "", removal_reason: "", removal_action: "remove_only", comment: "" });
  const [moveForm, setMoveForm] = useState({ printer_id: "", to_location_id: "", reason: "", notes: "" });
  const [repairForm, setRepairForm] = useState({ printer_id: "", service_company: "", reason: "", notes: "" });
  const [returnForm, setReturnForm] = useState({ repair_id: "", result: "", notes: "" });
  const [archiveForm, setArchiveForm] = useState({ printer_id: "", archive_reason: "archived", comment: "" });
  const [printerFilter, setPrinterFilter] = useState<PrinterFilter>("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const printerModelName = useMemo(
    () => new Map(printerModels.map((model) => [model.id, model.name])),
    [printerModels],
  );
  const printerModelMap = useMemo(
    () => new Map(printerModels.map((model) => [model.id, model])),
    [printerModels],
  );
  const locationName = useMemo(
    () => new Map(locations.map((location) => [location.id, location.display_name])),
    [locations],
  );
  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );
  const cartridgeModelName = useMemo(
    () => new Map(cartridgeModels.map((model) => [model.id, model.model_name])),
    [cartridgeModels],
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
      const [printerData, modelData, locationData, cartridgeData] = await Promise.all([
        fetchJson<Printer[]>("/api/printers"),
        fetchJson<PrinterModel[]>("/api/printer-models"),
        fetchJson<Location[]>("/api/locations"),
        fetchJson<CartridgeModel[]>("/api/cartridge-models"),
      ]);
      setPrinters(printerData);
      setPrinterModels(modelData);
      setLocations(locationData);
      setCartridgeModels(cartridgeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function refreshInstalled(printerId = selectedPrinterId) {
    if (!printerId) {
      setInstalled([]);
      setRepairs([]);
      return;
    }
    const [installedData, repairData] = await Promise.all([
      fetchJson<InstalledCartridge[]>(`/api/printers/${printerId}/installed-cartridges`),
      fetchJson<PrinterRepair[]>(`/api/printers/${printerId}/repairs`),
    ]);
    setInstalled(installedData);
    setRepairs(repairData);
  }

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
      <PageHeader title={t.printers} />
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
                  <td>{dash(printerModelName.get(printer.printer_model_id))}</td>
                  <td><Link className="text-link" href={`/printers/${printer.id}`}>{dash(printer.inventory_number)}</Link></td>
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

      <div className="form-grid">
        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/printer-models", compactBody({ ...modelForm, cartridge_slots_count: Number(modelForm.cartridge_slots_count) }));
          setModelForm(initialPrinterModel);
          await loadData();
        }, t.created)}>
          <h2>{t.addPrinterModel}</h2>
          <label>{t.vendor}<input value={modelForm.vendor} onChange={(e) => setModelForm({ ...modelForm, vendor: e.target.value })} /></label>
          <label>{t.modelName}<input required value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} /></label>
          <label>{t.printTechnology}<select value={modelForm.print_technology} onChange={(e) => setModelForm({ ...modelForm, print_technology: e.target.value })}><option value="laser">laser</option><option value="inkjet">inkjet</option><option value="other">other</option></select></label>
          <label>{t.colorMode}<select value={modelForm.color_mode} onChange={(e) => setModelForm({ ...modelForm, color_mode: e.target.value })}><option value="mono">mono</option><option value="color">color</option></select></label>
          <label>{t.slots}<input min="1" type="number" value={modelForm.cartridge_slots_count} onChange={(e) => setModelForm({ ...modelForm, cartridge_slots_count: e.target.value })} /></label>
          <label>{t.notes}<textarea value={modelForm.notes} onChange={(e) => setModelForm({ ...modelForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/printers", compactBody({ ...printerForm, printer_model_id: Number(printerForm.printer_model_id), current_location_id: printerForm.current_location_id ? Number(printerForm.current_location_id) : null }));
          setPrinterForm(initialPrinter);
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
      </div>

      <div className="panel wide">
        <h2>{t.installedCartridges}</h2>
        <div className="inline-controls">
          <label>{t.selectedPrinter}<select value={selectedPrinterId} onChange={(e) => setSelectedPrinterId(e.target.value)}><option value=""></option>{printers.map((printer) => <option key={printer.id} value={printer.id}>{formatPrinterLabel(printer, printerModelMap, locationMap)}</option>)}</select></label>
          <button className="button secondary" type="button" onClick={() => void refreshInstalled()}>{t.showInstalled}</button>
        </div>
        <div className="table-wrap compact">
          <table>
            <thead>
              <tr><th>{t.cartridgeModel}</th><th>{t.slotName}</th><th>{t.colorRole}</th><th>{t.condition}</th><th>{t.date}</th><th>{t.status}</th></tr>
            </thead>
            <tbody>
              {installed.length === 0 ? <EmptyRow colSpan={6} /> : installed.map((item) => (
                <tr key={item.id}>
                  <td>{dash(cartridgeModelName.get(item.cartridge_model_id))}</td>
                  <td>{dash(item.slot_name)}</td>
                  <td>{dash(item.color_role)}</td>
                  <td>{item.item_condition}</td>
                  <td>{new Date(item.installed_at).toLocaleString()}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-grid three">
        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/cartridge-transactions/remove", compactBody({
            installed_cartridge_id: Number(removeForm.installed_cartridge_id),
            removal_reason: removeForm.removal_reason,
            comment: removeForm.comment,
            ...removeActionFlags(removeForm.removal_action),
          }));
          setRemoveForm({ installed_cartridge_id: "", removal_reason: "", removal_action: "remove_only", comment: "" });
          await Promise.all([refreshInstalled(), fetchJson("/api/cartridge-transactions")]);
        }, t.cartridgeRemoved)}>
          <h2>{t.removeCartridge}</h2>
          <label>{t.installedCartridge}<select required value={removeForm.installed_cartridge_id} onChange={(e) => setRemoveForm({ ...removeForm, installed_cartridge_id: e.target.value })}><option value=""></option>{installed.map((item) => <option key={item.id} value={item.id}>{cartridgeModelName.get(item.cartridge_model_id) ?? `#${item.id}`} / {dash(item.slot_name)}</option>)}</select></label>
          <label>{t.removalReason}<input required value={removeForm.removal_reason} onChange={(e) => setRemoveForm({ ...removeForm, removal_reason: e.target.value })} /></label>
          <label>{t.removalAction}<select value={removeForm.removal_action} onChange={(e) => setRemoveForm({ ...removeForm, removal_action: e.target.value })}><option value="return_to_stock">{t.returnToStock}</option><option value="send_to_refill">{t.sendToRefill}</option><option value="write_off">{t.writeOff}</option><option value="remove_only">{t.removeOnly}</option></select></label>
          <label>{t.comment}<textarea value={removeForm.comment} onChange={(e) => setRemoveForm({ ...removeForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson(`/api/printers/${moveForm.printer_id}/move`, compactBody({ to_location_id: Number(moveForm.to_location_id), reason: moveForm.reason, notes: moveForm.notes }));
          setMoveForm({ printer_id: "", to_location_id: "", reason: "", notes: "" });
          await loadData();
        }, t.printerMoved)}>
          <h2>{t.movePrinter}</h2>
          <label>{t.printers}<select required value={moveForm.printer_id} onChange={(e) => setMoveForm({ ...moveForm, printer_id: e.target.value })}><option value=""></option>{printers.map((printer) => <option key={printer.id} value={printer.id}>{formatPrinterLabel(printer, printerModelMap, locationMap)}</option>)}</select></label>
          <label>{t.toLocation}<select required value={moveForm.to_location_id} onChange={(e) => setMoveForm({ ...moveForm, to_location_id: e.target.value })}><option value=""></option>{locations.map((location) => <option key={location.id} value={location.id}>{location.display_name}</option>)}</select></label>
          <label>{t.reason}<input value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} /></label>
          <label>{t.notes}<textarea value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson(`/api/printers/${repairForm.printer_id}/repairs`, compactBody(repairForm));
          setRepairForm({ printer_id: "", service_company: "", reason: "", notes: "" });
          await Promise.all([loadData(), selectedPrinterId ? refreshInstalled() : Promise.resolve()]);
        }, t.repairSent)}>
          <h2>{t.sendToRepair}</h2>
          <label>{t.printers}<select required value={repairForm.printer_id} onChange={(e) => setRepairForm({ ...repairForm, printer_id: e.target.value })}><option value=""></option>{printers.map((printer) => <option key={printer.id} value={printer.id}>{formatPrinterLabel(printer, printerModelMap, locationMap)}</option>)}</select></label>
          <label>{t.serviceCompany}<input value={repairForm.service_company} onChange={(e) => setRepairForm({ ...repairForm, service_company: e.target.value })} /></label>
          <label>{t.reason}<input value={repairForm.reason} onChange={(e) => setRepairForm({ ...repairForm, reason: e.target.value })} /></label>
          <label>{t.notes}<textarea value={repairForm.notes} onChange={(e) => setRepairForm({ ...repairForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await patchJson(`/api/printer-repairs/${returnForm.repair_id}`, compactBody({ repair_status: "returned", result: returnForm.result, notes: returnForm.notes }));
          setReturnForm({ repair_id: "", result: "", notes: "" });
          await Promise.all([loadData(), selectedPrinterId ? refreshInstalled() : Promise.resolve()]);
        }, t.repairReturned)}>
          <h2>{t.returnFromRepair}</h2>
          <label>{t.repairId}<input required value={returnForm.repair_id} onChange={(e) => setReturnForm({ ...returnForm, repair_id: e.target.value })} /></label>
          <label>{t.result}<textarea value={returnForm.result} onChange={(e) => setReturnForm({ ...returnForm, result: e.target.value })} /></label>
          <label>{t.notes}<textarea value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson(`/api/printers/${archiveForm.printer_id}/archive`, compactBody(archiveForm));
          setArchiveForm({ printer_id: "", archive_reason: "archived", comment: "" });
          await loadData();
        }, t.printerArchived)}>
          <h2>{t.archivePrinter}</h2>
          <label>{t.printers}<select required value={archiveForm.printer_id} onChange={(e) => setArchiveForm({ ...archiveForm, printer_id: e.target.value })}><option value=""></option>{printers.map((printer) => <option key={printer.id} value={printer.id}>{formatPrinterLabel(printer, printerModelMap, locationMap)}</option>)}</select></label>
          <label>{t.archiveReason}<select value={archiveForm.archive_reason} onChange={(e) => setArchiveForm({ ...archiveForm, archive_reason: e.target.value })}><option value="archived">archived</option><option value="written_off">written_off</option><option value="lost">lost</option><option value="duplicate">duplicate</option><option value="error">error</option></select></label>
          <label>{t.comment}<textarea value={archiveForm.comment} onChange={(e) => setArchiveForm({ ...archiveForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <div className="panel">
          <h2>{t.repairHistory}</h2>
          <div className="table-wrap compact">
            <table>
              <thead><tr><th>ID</th><th>{t.status}</th><th>{t.serviceCompany}</th><th>{t.result}</th></tr></thead>
              <tbody>
                {repairs.length === 0 ? <EmptyRow colSpan={4} /> : repairs.map((repair) => (
                  <tr key={repair.id}><td>{repair.id}</td><td>{repair.repair_status}</td><td>{dash(repair.service_company)}</td><td>{dash(repair.result)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
