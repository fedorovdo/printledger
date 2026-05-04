"use client";

import { FormEvent, useEffect, useState } from "react";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, fetchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
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

export default function PrintersPage() {
  const { t } = useI18n();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printerModels, setPrinterModels] = useState<PrinterModel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [modelForm, setModelForm] = useState(initialPrinterModel);
  const [printerForm, setPrinterForm] = useState(initialPrinter);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function createPrinterModel(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJson("/api/printer-models", compactBody({
        ...modelForm,
        cartridge_slots_count: Number(modelForm.cartridge_slots_count),
      }));
      setModelForm(initialPrinterModel);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function createPrinter(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJson("/api/printers", compactBody({
        ...printerForm,
        printer_model_id: Number(printerForm.printer_model_id),
        current_location_id: printerForm.current_location_id
          ? Number(printerForm.current_location_id)
          : null,
      }));
      setPrinterForm(initialPrinter);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader title={t.printers} />
      <Message loading={loading} error={error} />
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
            </tr>
          </thead>
          <tbody>
            {printers.length === 0 ? (
              <EmptyRow colSpan={7} />
            ) : (
              printers.map((printer) => (
                <tr key={printer.id}>
                  <td>{printer.printer_model_id}</td>
                  <td>{printer.inventory_number ?? ""}</td>
                  <td>{printer.serial_number ?? ""}</td>
                  <td>{printer.ip_address ?? ""}</td>
                  <td>{printer.current_location_id ?? ""}</td>
                  <td>{printer.status}</td>
                  <td>{printer.is_archived ? "yes" : "no"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="form-grid">
        <form className="panel" onSubmit={createPrinterModel}>
          <h2>{t.addPrinterModel}</h2>
          <label>{t.vendor}<input value={modelForm.vendor} onChange={(e) => setModelForm({ ...modelForm, vendor: e.target.value })} /></label>
          <label>{t.modelName}<input required value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} /></label>
          <label>{t.printTechnology}<select value={modelForm.print_technology} onChange={(e) => setModelForm({ ...modelForm, print_technology: e.target.value })}><option value="laser">laser</option><option value="inkjet">inkjet</option><option value="other">other</option></select></label>
          <label>{t.colorMode}<select value={modelForm.color_mode} onChange={(e) => setModelForm({ ...modelForm, color_mode: e.target.value })}><option value="mono">mono</option><option value="color">color</option></select></label>
          <label>{t.slots}<input min="1" type="number" value={modelForm.cartridge_slots_count} onChange={(e) => setModelForm({ ...modelForm, cartridge_slots_count: e.target.value })} /></label>
          <label>{t.notes}<textarea value={modelForm.notes} onChange={(e) => setModelForm({ ...modelForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={createPrinter}>
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
    </section>
  );
}

