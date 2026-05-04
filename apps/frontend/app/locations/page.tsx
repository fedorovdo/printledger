"use client";

import { FormEvent, useEffect, useState } from "react";

import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, fetchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Branch, Location, Organization } from "@/lib/types";

export default function LocationsPage() {
  const { t } = useI18n();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [orgForm, setOrgForm] = useState({ name: "", short_name: "", notes: "" });
  const [branchForm, setBranchForm] = useState({ organization_id: "", name: "", address: "", notes: "" });
  const [locationForm, setLocationForm] = useState({ organization_id: "", branch_id: "", department: "", room: "", display_name: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [orgData, branchData, locationData] = await Promise.all([
        fetchJson<Organization[]>("/api/organizations"),
        fetchJson<Branch[]>("/api/branches"),
        fetchJson<Location[]>("/api/locations"),
      ]);
      setOrganizations(orgData);
      setBranches(branchData);
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

  async function submit(path: string, body: Record<string, unknown>, reset: () => void) {
    setSaving(true);
    setError(null);
    try {
      await postJson(path, compactBody(body));
      reset();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader title={t.locations} />
      <Message loading={loading} error={error} />
      <div className="section-grid">
        <div className="panel">
          <h2>{t.organizations}</h2>
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("/api/organizations", orgForm, () => setOrgForm({ name: "", short_name: "", notes: "" })); }}>
            <label>{t.displayName}<input required value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} /></label>
            <label>{t.shortName}<input value={orgForm.short_name} onChange={(e) => setOrgForm({ ...orgForm, short_name: e.target.value })} /></label>
            <label>{t.notes}<textarea value={orgForm.notes} onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })} /></label>
            <button className="button" disabled={saving} type="submit">{t.save}</button>
          </form>
          <MiniTable headers={[t.displayName, t.shortName]} rows={organizations.map((item) => [item.name, item.short_name ?? ""])} />
        </div>

        <div className="panel">
          <h2>{t.branches}</h2>
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("/api/branches", { ...branchForm, organization_id: Number(branchForm.organization_id) }, () => setBranchForm({ organization_id: "", name: "", address: "", notes: "" })); }}>
            <label>{t.organizations}<select required value={branchForm.organization_id} onChange={(e) => setBranchForm({ ...branchForm, organization_id: e.target.value })}><option value=""></option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
            <label>{t.displayName}<input required value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} /></label>
            <label>{t.address}<input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} /></label>
            <label>{t.notes}<textarea value={branchForm.notes} onChange={(e) => setBranchForm({ ...branchForm, notes: e.target.value })} /></label>
            <button className="button" disabled={saving} type="submit">{t.save}</button>
          </form>
          <MiniTable headers={["ID", t.displayName]} rows={branches.map((item) => [String(item.id), item.name])} />
        </div>

        <div className="panel">
          <h2>{t.locations}</h2>
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit("/api/locations", { ...locationForm, organization_id: Number(locationForm.organization_id), branch_id: locationForm.branch_id ? Number(locationForm.branch_id) : null }, () => setLocationForm({ organization_id: "", branch_id: "", department: "", room: "", display_name: "", notes: "" })); }}>
            <label>{t.organizations}<select required value={locationForm.organization_id} onChange={(e) => setLocationForm({ ...locationForm, organization_id: e.target.value })}><option value=""></option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
            <label>{t.branch}<select value={locationForm.branch_id} onChange={(e) => setLocationForm({ ...locationForm, branch_id: e.target.value })}><option value=""></option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label>{t.displayName}<input required value={locationForm.display_name} onChange={(e) => setLocationForm({ ...locationForm, display_name: e.target.value })} /></label>
            <label>{t.department}<input value={locationForm.department} onChange={(e) => setLocationForm({ ...locationForm, department: e.target.value })} /></label>
            <label>{t.room}<input value={locationForm.room} onChange={(e) => setLocationForm({ ...locationForm, room: e.target.value })} /></label>
            <label>{t.notes}<textarea value={locationForm.notes} onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })} /></label>
            <button className="button" disabled={saving} type="submit">{t.save}</button>
          </form>
          <MiniTable headers={["ID", t.displayName]} rows={locations.map((item) => [String(item.id), item.display_name])} />
        </div>
      </div>
    </section>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap compact">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={headers.length} /> : rows.map((row, index) => (
            <tr key={`${row.join("-")}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

