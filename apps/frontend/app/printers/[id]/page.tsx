"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { ApiError, compactBody, fetchJson, patchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  dash,
  formatArchiveReason,
  formatCartridgeCondition,
  formatColorMode,
  formatColorRole,
  formatInstalledCartridgeStatus,
  formatLocationLabel,
  formatPrintTechnology,
  formatRemoveAction,
  formatRepairStatus,
  isArchivedPrinter,
  labelPrinterStatus,
  removeActionFlags,
} from "@/lib/labels";
import type {
  Branch,
  CartridgeModel,
  InstalledCartridge,
  Location,
  Organization,
  Printer,
  PrinterArchiveHistory,
  PrinterCartridgeHistory,
  PrinterLocationHistory,
  PrinterModel,
  PrinterRepair,
} from "@/lib/types";

export default function PrinterCardPage() {
  const params = useParams<{ id: string }>();
  const printerId = Number(params.id);
  const { locale, t } = useI18n();
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [printerModels, setPrinterModels] = useState<PrinterModel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cartridgeModels, setCartridgeModels] = useState<CartridgeModel[]>([]);
  const [installed, setInstalled] = useState<InstalledCartridge[]>([]);
  const [cartridgeHistory, setCartridgeHistory] = useState<PrinterCartridgeHistory[]>([]);
  const [locationHistory, setLocationHistory] = useState<PrinterLocationHistory[]>([]);
  const [repairs, setRepairs] = useState<PrinterRepair[]>([]);
  const [archiveHistory, setArchiveHistory] = useState<PrinterArchiveHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [installForm, setInstallForm] = useState({ cartridge_model_id: "", item_condition: "new", slot_name: "Black", color_role: "black", comment: "" });
  const [removeForm, setRemoveForm] = useState({ installed_cartridge_id: "", removal_reason: "", removal_action: "remove_only", comment: "" });
  const [moveForm, setMoveForm] = useState({ to_location_id: "", reason: "", notes: "" });
  const [repairForm, setRepairForm] = useState({ service_company: "", reason: "", notes: "" });
  const [returnForm, setReturnForm] = useState({ repair_id: "", result: "", notes: "" });
  const [archiveForm, setArchiveForm] = useState({ archive_reason: "archived", comment: "" });

  const printerModelById = useMemo(
    () => new Map(printerModels.map((model) => [model.id, model])),
    [printerModels],
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((org) => [org.id, org])),
    [organizations],
  );
  const branchById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch])),
    [branches],
  );
  const locationName = useMemo(
    () => new Map(locations.map((location) => [
      location.id,
      formatLocationLabel(location, organizationById, branchById, locale, "short"),
    ])),
    [branchById, locale, locations, organizationById],
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
        && location.branch_id !== null
        && activeBranchIds.has(location.branch_id),
    ),
    [activeBranchIds, activeOrganizationIds, locations],
  );
  const cartridgeModelName = useMemo(
    () => new Map(cartridgeModels.map((model) => [model.id, model.model_name])),
    [cartridgeModels],
  );
  const activeCartridgeModels = useMemo(
    () => cartridgeModels.filter((model) => model.is_active),
    [cartridgeModels],
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [
        printerData,
        printerModelData,
        locationData,
        orgData,
        branchData,
        cartridgeModelData,
        installedData,
        cartridgeHistoryData,
        locationHistoryData,
        repairData,
        archiveHistoryData,
      ] = await Promise.all([
        fetchJson<Printer>(`/api/printers/${printerId}`),
        fetchJson<PrinterModel[]>("/api/printer-models"),
        fetchJson<Location[]>("/api/locations"),
        fetchJson<Organization[]>("/api/organizations"),
        fetchJson<Branch[]>("/api/branches"),
        fetchJson<CartridgeModel[]>("/api/cartridge-models"),
        fetchJson<InstalledCartridge[]>(`/api/printers/${printerId}/installed-cartridges`),
        fetchJson<PrinterCartridgeHistory[]>(`/api/printers/${printerId}/cartridge-history`),
        fetchJson<PrinterLocationHistory[]>(`/api/printers/${printerId}/location-history`),
        fetchJson<PrinterRepair[]>(`/api/printers/${printerId}/repairs`),
        fetchJson<PrinterArchiveHistory[]>(`/api/printers/${printerId}/archive-history`),
      ]);
      setPrinter(printerData);
      setPrinterModels(printerModelData);
      setLocations(locationData);
      setOrganizations(orgData);
      setBranches(branchData);
      setCartridgeModels(cartridgeModelData);
      setInstalled(installedData);
      setCartridgeHistory(cartridgeHistoryData);
      setLocationHistory(locationHistoryData);
      setRepairs(repairData);
      setArchiveHistory(archiveHistoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [printerId]);

  async function submitForm(
    event: FormEvent,
    action: () => Promise<void>,
    message: string,
  ) {
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

  const printerModel = printer ? printerModelById.get(printer.printer_model_id) : null;
  const isLifecycleLocked = printer ? isArchivedPrinter(printer) : false;

  return (
    <section>
      <PageHeader
        title={printer?.inventory_number ?? printer?.serial_number ?? t.printerCard}
        action={<Link className="button secondary" href="/printers">{t.back}</Link>}
      />
      <Message loading={loading} error={error} success={success} />

      {printer && (
        <div className="detail-grid">
          <div className="panel">
            <h2>{t.printerCard}</h2>
            {printer.status === "written_off" && <p><span className="badge warning">{t.writtenOffPrinterBadge}</span></p>}
            {printer.status !== "written_off" && isLifecycleLocked && <p><span className="badge warning">{t.archivedPrinterBadge}</span></p>}
            <dl className="details">
              <dt>{t.printerModel}</dt><dd>{dash(printerModel?.name)}</dd>
              <dt>{t.vendor}</dt><dd>{dash(printerModel?.vendor)}</dd>
              <dt>{t.printTechnology}</dt><dd>{formatPrintTechnology(printerModel?.print_technology, locale)}</dd>
              <dt>{t.colorMode}</dt><dd>{formatColorMode(printerModel?.color_mode, locale)}</dd>
              <dt>{t.inventoryNumber}</dt><dd>{dash(printer.inventory_number)}</dd>
              <dt>{t.serialNumber}</dt><dd>{dash(printer.serial_number)}</dd>
              <dt>{t.ipAddress}</dt><dd>{dash(printer.ip_address)}</dd>
              <dt>{t.macAddress}</dt><dd>{dash(printer.mac_address)}</dd>
              <dt>{t.location}</dt><dd>{printer.current_location_id ? dash(locationName.get(printer.current_location_id)) : dash(null)}</dd>
              <dt>{t.status}</dt><dd>{labelPrinterStatus(printer.status, locale)}</dd>
              <dt>{t.notes}</dt><dd>{dash(printer.notes)}</dd>
            </dl>
          </div>
          <div className="panel">
            <h2>{t.currentInstalled}</h2>
            <div className="metric-grid compact-metrics">
              <Metric label={t.installedCartridges} value={installed.length} />
              <Metric label={t.repairHistory} value={repairs.length} />
              <Metric label={t.locationHistory} value={locationHistory.length} />
              <Metric label={t.archiveHistory} value={archiveHistory.length} />
            </div>
          </div>
        </div>
      )}

      {isLifecycleLocked && <Message info={t.archivedPrinterActionsDisabled} />}

      <div className="form-grid three">
        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/cartridge-transactions/install", compactBody({
            cartridge_model_id: Number(installForm.cartridge_model_id),
            printer_id: printerId,
            quantity: 1,
            item_condition: installForm.item_condition,
            slot_name: installForm.slot_name,
            color_role: installForm.color_role,
            comment: installForm.comment,
          }));
          setInstallForm({ cartridge_model_id: "", item_condition: "new", slot_name: "Black", color_role: "black", comment: "" });
        }, t.cartridgeInstalled)}>
          <h2>{t.installCartridge}</h2>
          <label>{t.cartridgeModel}<select required value={installForm.cartridge_model_id} onChange={(e) => setInstallForm({ ...installForm, cartridge_model_id: e.target.value })}><option value=""></option>{activeCartridgeModels.map((model) => <option key={model.id} value={model.id}>{model.model_name}</option>)}</select></label>
          <label>{t.condition}<select value={installForm.item_condition} onChange={(e) => setInstallForm({ ...installForm, item_condition: e.target.value })}><option value="new">{formatCartridgeCondition("new", locale)}</option><option value="refilled">{formatCartridgeCondition("refilled", locale)}</option></select></label>
          <label>{t.slotName}<input value={installForm.slot_name} onChange={(e) => setInstallForm({ ...installForm, slot_name: e.target.value })} /></label>
          <label>{t.colorRole}<select value={installForm.color_role} onChange={(e) => setInstallForm({ ...installForm, color_role: e.target.value })}><option value="black">{formatColorRole("black", locale)}</option><option value="cyan">{formatColorRole("cyan", locale)}</option><option value="magenta">{formatColorRole("magenta", locale)}</option><option value="yellow">{formatColorRole("yellow", locale)}</option><option value="other">{formatColorRole("other", locale)}</option></select></label>
          <label>{t.comment}<textarea value={installForm.comment} onChange={(e) => setInstallForm({ ...installForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving || isLifecycleLocked} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson("/api/cartridge-transactions/remove", compactBody({
            installed_cartridge_id: Number(removeForm.installed_cartridge_id),
            removal_reason: removeForm.removal_reason,
            comment: removeForm.comment,
            ...removeActionFlags(removeForm.removal_action),
          }));
          setRemoveForm({ installed_cartridge_id: "", removal_reason: "", removal_action: "remove_only", comment: "" });
        }, t.cartridgeRemoved)}>
          <h2>{t.removeCartridge}</h2>
          <label>{t.installedCartridge}<select required value={removeForm.installed_cartridge_id} onChange={(e) => setRemoveForm({ ...removeForm, installed_cartridge_id: e.target.value })}><option value=""></option>{installed.map((item) => <option key={item.id} value={item.id}>{cartridgeModelName.get(item.cartridge_model_id) ?? `#${item.id}`} / {dash(item.slot_name)}</option>)}</select></label>
          <label>{t.removalReason}<input required value={removeForm.removal_reason} onChange={(e) => setRemoveForm({ ...removeForm, removal_reason: e.target.value })} /></label>
          <label>{t.removalAction}<select value={removeForm.removal_action} onChange={(e) => setRemoveForm({ ...removeForm, removal_action: e.target.value })}><option value="return_to_stock">{formatRemoveAction("return_to_stock", locale)}</option><option value="send_to_refill">{formatRemoveAction("send_to_refill", locale)}</option><option value="write_off">{formatRemoveAction("write_off", locale)}</option><option value="remove_only">{formatRemoveAction("remove_only", locale)}</option></select></label>
          <label>{t.comment}<textarea value={removeForm.comment} onChange={(e) => setRemoveForm({ ...removeForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson(`/api/printers/${printerId}/move`, compactBody({
            to_location_id: Number(moveForm.to_location_id),
            reason: moveForm.reason,
            notes: moveForm.notes,
          }));
          setMoveForm({ to_location_id: "", reason: "", notes: "" });
        }, t.printerMoved)}>
          <h2>{t.movePrinter}</h2>
          <label>{t.toLocation}<select required value={moveForm.to_location_id} onChange={(e) => setMoveForm({ ...moveForm, to_location_id: e.target.value })}><option value=""></option>{activeLocations.map((location) => <option key={location.id} value={location.id}>{formatLocationLabel(location, organizationById, branchById, locale)}</option>)}</select></label>
          <label>{t.reason}<input value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} /></label>
          <label>{t.notes}<textarea value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving || isLifecycleLocked} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson(`/api/printers/${printerId}/repairs`, compactBody(repairForm));
          setRepairForm({ service_company: "", reason: "", notes: "" });
        }, t.repairSent)}>
          <h2>{t.sendToRepair}</h2>
          <label>{t.serviceCompany}<input value={repairForm.service_company} onChange={(e) => setRepairForm({ ...repairForm, service_company: e.target.value })} /></label>
          <label>{t.reason}<input value={repairForm.reason} onChange={(e) => setRepairForm({ ...repairForm, reason: e.target.value })} /></label>
          <label>{t.notes}<textarea value={repairForm.notes} onChange={(e) => setRepairForm({ ...repairForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving || isLifecycleLocked} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await patchJson(`/api/printer-repairs/${returnForm.repair_id}`, compactBody({
            repair_status: "returned",
            result: returnForm.result,
            notes: returnForm.notes,
          }));
          setReturnForm({ repair_id: "", result: "", notes: "" });
        }, t.repairReturned)}>
          <h2>{t.returnFromRepair}</h2>
          <label>{t.repairId}<select required value={returnForm.repair_id} onChange={(e) => setReturnForm({ ...returnForm, repair_id: e.target.value })}><option value=""></option>{repairs.map((repair) => <option key={repair.id} value={repair.id}>#{repair.id} / {formatRepairStatus(repair.repair_status, locale)}</option>)}</select></label>
          <label>{t.result}<textarea value={returnForm.result} onChange={(e) => setReturnForm({ ...returnForm, result: e.target.value })} /></label>
          <label>{t.notes}<textarea value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>

        <form className="panel" onSubmit={(event) => submitForm(event, async () => {
          await postJson(`/api/printers/${printerId}/archive`, compactBody(archiveForm));
          setArchiveForm({ archive_reason: "archived", comment: "" });
        }, t.printerArchived)}>
          <h2>{t.archivePrinter}</h2>
          <label>{t.archiveReason}<select value={archiveForm.archive_reason} onChange={(e) => setArchiveForm({ ...archiveForm, archive_reason: e.target.value })}><option value="archived">{formatArchiveReason("archived", locale)}</option><option value="written_off">{formatArchiveReason("written_off", locale)}</option><option value="lost">{formatArchiveReason("lost", locale)}</option><option value="duplicate">{formatArchiveReason("duplicate", locale)}</option><option value="error">{formatArchiveReason("error", locale)}</option></select></label>
          <label>{t.comment}<textarea value={archiveForm.comment} onChange={(e) => setArchiveForm({ ...archiveForm, comment: e.target.value })} /></label>
          <button className="button" disabled={saving} type="submit">{t.save}</button>
        </form>
      </div>

      <InstalledTable items={installed} cartridgeModelName={cartridgeModelName} />
      <CartridgeHistoryTable items={cartridgeHistory} cartridgeModelName={cartridgeModelName} />
      <LocationHistoryTable items={locationHistory} locationName={locationName} />
      <RepairHistoryTable items={repairs} />
      <ArchiveHistoryTable items={archiveHistory} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric-card small"><span>{label}</span><strong>{value}</strong></div>;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : dash(null);
}

function InstalledTable({
  items,
  cartridgeModelName,
}: {
  items: InstalledCartridge[];
  cartridgeModelName: Map<number, string>;
}) {
  const { locale, t } = useI18n();
  return (
    <div className="panel wide">
      <h2>{t.installedCartridges}</h2>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>{t.cartridgeModel}</th><th>{t.slotName}</th><th>{t.colorRole}</th><th>{t.condition}</th><th>{t.date}</th><th>{t.status}</th></tr></thead>
          <tbody>
            {items.length === 0 ? <EmptyRow colSpan={6} /> : items.map((item) => (
              <tr key={item.id}>
                <td>{dash(cartridgeModelName.get(item.cartridge_model_id))}</td>
                <td>{dash(item.slot_name)}</td>
                <td>{formatColorRole(item.color_role, locale)}</td>
                <td>{formatCartridgeCondition(item.item_condition, locale)}</td>
                <td>{formatDate(item.installed_at)}</td>
                <td>{formatInstalledCartridgeStatus(item.status, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CartridgeHistoryTable({
  items,
  cartridgeModelName,
}: {
  items: PrinterCartridgeHistory[];
  cartridgeModelName: Map<number, string>;
}) {
  const { locale, t } = useI18n();
  return (
    <div className="panel wide">
      <h2>{t.cartridgeHistory}</h2>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>{t.cartridgeModel}</th><th>{t.slotName}</th><th>{t.colorRole}</th><th>{t.condition}</th><th>{t.installed}</th><th>{t.removalReason}</th><th>{t.notes}</th></tr></thead>
          <tbody>
            {items.length === 0 ? <EmptyRow colSpan={7} /> : items.map((item) => (
              <tr key={item.id}>
                <td>{dash(cartridgeModelName.get(item.cartridge_model_id))}</td>
                <td>{dash(item.slot_name)}</td>
                <td>{formatColorRole(item.color_role, locale)}</td>
                <td>{formatCartridgeCondition(item.item_condition, locale)}</td>
                <td>{formatDate(item.installed_at)} / {formatDate(item.removed_at)}</td>
                <td>{dash(item.removal_reason)}</td>
                <td>{dash(item.notes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LocationHistoryTable({
  items,
  locationName,
}: {
  items: PrinterLocationHistory[];
  locationName: Map<number, string>;
}) {
  const { t } = useI18n();
  return (
    <div className="panel wide">
      <h2>{t.locationHistory}</h2>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>{t.date}</th><th>{t.fromLocation}</th><th>{t.toLocation}</th><th>{t.reason}</th><th>{t.notes}</th></tr></thead>
          <tbody>
            {items.length === 0 ? <EmptyRow colSpan={5} /> : items.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.moved_at)}</td>
                <td>{item.from_location_id ? dash(locationName.get(item.from_location_id)) : dash(null)}</td>
                <td>{item.to_location_id ? dash(locationName.get(item.to_location_id)) : dash(null)}</td>
                <td>{dash(item.reason)}</td>
                <td>{dash(item.notes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RepairHistoryTable({ items }: { items: PrinterRepair[] }) {
  const { locale, t } = useI18n();
  return (
    <div className="panel wide">
      <h2>{t.repairHistory}</h2>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>ID</th><th>{t.status}</th><th>{t.date}</th><th>{t.serviceCompany}</th><th>{t.reason}</th><th>{t.result}</th></tr></thead>
          <tbody>
            {items.length === 0 ? <EmptyRow colSpan={6} /> : items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{formatRepairStatus(item.repair_status, locale)}</td>
                <td>{formatDate(item.sent_at)} / {formatDate(item.returned_at)}</td>
                <td>{dash(item.service_company)}</td>
                <td>{dash(item.reason)}</td>
                <td>{dash(item.result)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArchiveHistoryTable({ items }: { items: PrinterArchiveHistory[] }) {
  const { locale, t } = useI18n();
  return (
    <div className="panel wide">
      <h2>{t.archiveHistory}</h2>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>{t.date}</th><th>{t.archiveReason}</th><th>{t.comment}</th></tr></thead>
          <tbody>
            {items.length === 0 ? <EmptyRow colSpan={3} /> : items.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.archived_at)}</td>
                <td>{formatArchiveReason(item.archive_reason, locale)}</td>
                <td>{dash(item.comment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
