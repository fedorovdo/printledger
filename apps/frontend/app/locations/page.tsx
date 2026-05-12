"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { IconButton } from "@/components/IconButton";
import { SidePanel } from "@/components/SidePanel";
import { EmptyRow, Message, PageHeader } from "@/components/Ui";
import { compactBody, deleteJson, fetchJson, patchJson, postJson } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dash, formatLocationDescription } from "@/lib/labels";
import type { Branch, Location, Organization } from "@/lib/types";

const initialOrgForm = { name: "", short_name: "", notes: "" };
const initialBranchForm = { organization_id: "", name: "", address: "", notes: "" };
const initialLocationForm = {
  organization_id: "",
  branch_id: "",
  department: "",
  room: "",
  display_name: "",
  notes: "",
};

type DirectoryFilter = "active" | "inactive" | "all";

function applyFilter<T extends { is_active: boolean }>(items: T[], filter: DirectoryFilter) {
  if (filter === "active") {
    return items.filter((item) => item.is_active);
  }
  if (filter === "inactive") {
    return items.filter((item) => !item.is_active);
  }
  return items;
}

function filterCounts<T extends { is_active: boolean }>(items: T[]) {
  return {
    active: items.filter((item) => item.is_active).length,
    inactive: items.filter((item) => !item.is_active).length,
    all: items.length,
  };
}

export default function LocationsPage() {
  const { t } = useI18n();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [orgForm, setOrgForm] = useState(initialOrgForm);
  const [branchForm, setBranchForm] = useState(initialBranchForm);
  const [locationForm, setLocationForm] = useState(initialLocationForm);
  const [editingOrgId, setEditingOrgId] = useState<number | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [orgFilter, setOrgFilter] = useState<DirectoryFilter>("active");
  const [branchFilter, setBranchFilter] = useState<DirectoryFilter>("active");
  const [locationFilter, setLocationFilter] = useState<DirectoryFilter>("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const organizationById = useMemo(
    () => new Map(organizations.map((org) => [org.id, org])),
    [organizations],
  );
  const branchById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch])),
    [branches],
  );
  const activeOrganizations = useMemo(
    () => organizations.filter((org) => org.is_active),
    [organizations],
  );
  const activeOrganizationIds = useMemo(
    () => new Set(activeOrganizations.map((org) => org.id)),
    [activeOrganizations],
  );
  const selectableOrganizationsForBranch = useMemo(
    () => organizations.filter(
      (org) => org.is_active || (branchForm.organization_id && org.id === Number(branchForm.organization_id)),
    ),
    [branchForm.organization_id, organizations],
  );
  const selectableOrganizationsForLocation = useMemo(
    () => organizations.filter(
      (org) => org.is_active || (locationForm.organization_id && org.id === Number(locationForm.organization_id)),
    ),
    [locationForm.organization_id, organizations],
  );
  const selectableBranchesForLocation = useMemo(
    () => branches.filter(
      (branch) => (!locationForm.organization_id || branch.organization_id === Number(locationForm.organization_id))
        && (branch.is_active || (locationForm.branch_id && branch.id === Number(locationForm.branch_id)))
        && (activeOrganizationIds.has(branch.organization_id) || (locationForm.branch_id && branch.id === Number(locationForm.branch_id))),
    ),
    [activeOrganizationIds, branches, locationForm.branch_id, locationForm.organization_id],
  );
  const filteredOrganizations = useMemo(() => applyFilter(organizations, orgFilter), [orgFilter, organizations]);
  const filteredBranches = useMemo(() => applyFilter(branches, branchFilter), [branchFilter, branches]);
  const filteredLocations = useMemo(() => applyFilter(locations, locationFilter), [locationFilter, locations]);
  const orgCounts = useMemo(() => filterCounts(organizations), [organizations]);
  const branchCounts = useMemo(() => filterCounts(branches), [branches]);
  const locationCounts = useMemo(() => filterCounts(locations), [locations]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [orgData, branchData, locationData] = await Promise.all([
        fetchJson<Organization[]>("/api/organizations?limit=500"),
        fetchJson<Branch[]>("/api/branches?limit=500"),
        fetchJson<Location[]>("/api/locations?limit=500"),
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

  async function submitForm(event: FormEvent, action: () => Promise<void>, message: string) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function startEditOrganization(item: Organization) {
    setEditingOrgId(item.id);
    setOrgForm({ name: item.name, short_name: item.short_name ?? "", notes: item.notes ?? "" });
    setShowOrgForm(true);
    setShowBranchForm(false);
    setShowLocationForm(false);
    setError(null);
    setSuccess(null);
  }

  function startEditBranch(item: Branch) {
    setEditingBranchId(item.id);
    setBranchForm({
      organization_id: String(item.organization_id),
      name: item.name,
      address: item.address ?? "",
      notes: item.notes ?? "",
    });
    setShowBranchForm(true);
    setShowOrgForm(false);
    setShowLocationForm(false);
    setError(null);
    setSuccess(null);
  }

  function startEditLocation(item: Location) {
    setEditingLocationId(item.id);
    setLocationForm({
      organization_id: String(item.organization_id),
      branch_id: item.branch_id ? String(item.branch_id) : "",
      department: item.department ?? "",
      room: item.room ?? "",
      display_name: item.display_name,
      notes: item.notes ?? "",
    });
    setShowLocationForm(true);
    setShowOrgForm(false);
    setShowBranchForm(false);
    setError(null);
    setSuccess(null);
  }

  function resetOrgForm() {
    setEditingOrgId(null);
    setOrgForm(initialOrgForm);
  }

  function resetBranchForm() {
    setEditingBranchId(null);
    setBranchForm(initialBranchForm);
  }

  function resetLocationForm() {
    setEditingLocationId(null);
    setLocationForm(initialLocationForm);
  }

  async function saveOrganization() {
    if (editingOrgId) {
      await patchJson<Organization>(`/api/organizations/${editingOrgId}`, {
        name: orgForm.name,
        short_name: orgForm.short_name || null,
        notes: orgForm.notes || null,
      });
      resetOrgForm();
      setShowOrgForm(false);
      return;
    }
    await postJson<Organization>("/api/organizations", compactBody(orgForm));
    resetOrgForm();
    setShowOrgForm(false);
  }

  async function saveBranch() {
    if (editingBranchId) {
      await patchJson<Branch>(`/api/branches/${editingBranchId}`, {
        organization_id: Number(branchForm.organization_id),
        name: branchForm.name,
        address: branchForm.address || null,
        notes: branchForm.notes || null,
      });
      resetBranchForm();
      setShowBranchForm(false);
      return;
    }
    const payload = compactBody({ ...branchForm, organization_id: Number(branchForm.organization_id) });
    await postJson<Branch>("/api/branches", payload);
    resetBranchForm();
    setShowBranchForm(false);
  }

  async function saveLocation() {
    if (!locationForm.room.trim()) {
      throw new Error(t.roomRequired);
    }

    const payload = {
      organization_id: Number(locationForm.organization_id),
      branch_id: locationForm.branch_id ? Number(locationForm.branch_id) : null,
      department: locationForm.department || null,
      room: locationForm.room,
      display_name: locationForm.display_name || null,
      notes: locationForm.notes || null,
    };

    if (editingLocationId) {
      await patchJson<Location>(`/api/locations/${editingLocationId}`, payload);
      resetLocationForm();
      setShowLocationForm(false);
      return;
    }
    await postJson<Location>("/api/locations", compactBody(payload));
    resetLocationForm();
    setShowLocationForm(false);
  }

  async function deleteRecord(path: string, successMessage: string) {
    if (!window.confirm(t.deleteRecordConfirm)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteJson(path);
      setSuccess(successMessage);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.recordInUseDeleteBlocked);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(path: string, isActive: boolean) {
    const nextActive = !isActive;
    if (!nextActive && !window.confirm(t.deactivateRecordConfirm)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await patchJson(path, { is_active: nextActive });
      setSuccess(nextActive ? t.recordReactivated : t.recordDeactivated);
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
        title={t.locations}
        action={
          <div className="page-actions">
            <button className="button secondary" onClick={() => { resetOrgForm(); setShowOrgForm(true); setShowBranchForm(false); setShowLocationForm(false); }} type="button">
              + {t.organization}
            </button>
            <button className="button secondary" onClick={() => { resetBranchForm(); setShowBranchForm(true); setShowOrgForm(false); setShowLocationForm(false); }} type="button">
              + {t.branch}
            </button>
            <button className="button secondary" onClick={() => { resetLocationForm(); setShowLocationForm(true); setShowOrgForm(false); setShowBranchForm(false); }} type="button">
              + {t.locationEntry}
            </button>
          </div>
        }
      />
      <Message loading={loading} error={error} success={success} />

      <div className="panel wide">
        <h2>{t.locationList}</h2>
        <DirectoryFilterBar counts={locationCounts} filter={locationFilter} onChange={setLocationFilter} />
        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>{t.organizations}</th>
                <th>{t.branch}</th>
                <th>{t.department}</th>
                <th>{t.room}</th>
                <th>{t.locationDescription}</th>
                <th>{t.active}</th>
                <th>{t.edit}</th>
                <th>{t.delete}</th>
                <th>{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.length === 0 ? <EmptyRow colSpan={9} /> : filteredLocations.map((item) => (
                <tr className={!item.is_active ? "row-muted" : ""} key={item.id}>
                  <td>{dash(organizationById.get(item.organization_id)?.name)}</td>
                  <td>{item.branch_id ? dash(branchById.get(item.branch_id)?.name) : dash(null)}</td>
                  <td>{dash(item.department)}</td>
                  <td>{dash(item.room)}</td>
                  <td>{formatLocationDescription(item)}</td>
                  <td>{item.is_active ? t.yes : t.no}</td>
                  <td><IconButton icon="✎" label={t.edit} onClick={() => startEditLocation(item)} /></td>
                  <td><IconButton disabled={saving} icon="🗑" label={t.delete} onClick={() => void deleteRecord(`/api/locations/${item.id}`, t.locationDeleted)} variant="danger" /></td>
                  <td><IconButton disabled={saving} icon={item.is_active ? "⊘" : "↩"} label={item.is_active ? t.deactivate : t.reactivate} onClick={() => void toggleActive(`/api/locations/${item.id}`, item.is_active)} variant={item.is_active ? "warning" : "success"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="catalog-section">
        <h2>{t.directories}</h2>

        <div className="panel wide">
          <h2>{t.organizations}</h2>
          <DirectoryFilterBar counts={orgCounts} filter={orgFilter} onChange={setOrgFilter} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t.displayName}</th><th>{t.shortName}</th><th>{t.active}</th><th>{t.edit}</th><th>{t.delete}</th><th>{t.status}</th></tr></thead>
              <tbody>
                {filteredOrganizations.length === 0 ? <EmptyRow colSpan={6} /> : filteredOrganizations.map((item) => (
                  <tr className={!item.is_active ? "row-muted" : ""} key={item.id}>
                    <td>{item.name}</td>
                    <td>{dash(item.short_name)}</td>
                    <td>{item.is_active ? t.yes : t.no}</td>
                    <td><IconButton icon="✎" label={t.edit} onClick={() => startEditOrganization(item)} /></td>
                    <td><IconButton disabled={saving} icon="🗑" label={t.delete} onClick={() => void deleteRecord(`/api/organizations/${item.id}`, t.organizationDeleted)} variant="danger" /></td>
                    <td><IconButton disabled={saving} icon={item.is_active ? "⊘" : "↩"} label={item.is_active ? t.deactivate : t.reactivate} onClick={() => void toggleActive(`/api/organizations/${item.id}`, item.is_active)} variant={item.is_active ? "warning" : "success"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel wide">
          <h2>{t.branches}</h2>
          <DirectoryFilterBar counts={branchCounts} filter={branchFilter} onChange={setBranchFilter} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t.organizations}</th><th>{t.displayName}</th><th>{t.address}</th><th>{t.active}</th><th>{t.edit}</th><th>{t.delete}</th><th>{t.status}</th></tr></thead>
              <tbody>
                {filteredBranches.length === 0 ? <EmptyRow colSpan={7} /> : filteredBranches.map((item) => (
                  <tr className={!item.is_active ? "row-muted" : ""} key={item.id}>
                    <td>{dash(organizationById.get(item.organization_id)?.name)}</td>
                    <td>{item.name}</td>
                    <td>{dash(item.address)}</td>
                    <td>{item.is_active ? t.yes : t.no}</td>
                    <td><IconButton icon="✎" label={t.edit} onClick={() => startEditBranch(item)} /></td>
                    <td><IconButton disabled={saving} icon="🗑" label={t.delete} onClick={() => void deleteRecord(`/api/branches/${item.id}`, t.branchDeleted)} variant="danger" /></td>
                    <td><IconButton disabled={saving} icon={item.is_active ? "⊘" : "↩"} label={item.is_active ? t.deactivate : t.reactivate} onClick={() => void toggleActive(`/api/branches/${item.id}`, item.is_active)} variant={item.is_active ? "warning" : "success"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <SidePanel
        onClose={() => { setShowOrgForm(false); resetOrgForm(); }}
        open={showOrgForm}
        title={editingOrgId ? t.editOrganization : t.addOrganization}
      >
        <form className="panel" onSubmit={(event) => submitForm(event, saveOrganization, editingOrgId ? t.organizationUpdated : t.created)}>
          <label>{t.displayName}<input required value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} /></label>
          <label>{t.shortName}<input value={orgForm.short_name} onChange={(e) => setOrgForm({ ...orgForm, short_name: e.target.value })} /></label>
          <label>{t.notes}<textarea value={orgForm.notes} onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })} /></label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setShowOrgForm(false); resetOrgForm(); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>

      <SidePanel
        onClose={() => { setShowBranchForm(false); resetBranchForm(); }}
        open={showBranchForm}
        title={editingBranchId ? t.editBranch : t.addBranch}
      >
        <form className="panel" onSubmit={(event) => submitForm(event, saveBranch, editingBranchId ? t.branchUpdated : t.created)}>
          <label>{t.organizations}<select required value={branchForm.organization_id} onChange={(e) => setBranchForm({ ...branchForm, organization_id: e.target.value })}><option value=""></option>{selectableOrganizationsForBranch.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
          <label>{t.displayName}<input required value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} /></label>
          <label>{t.address}<input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} /></label>
          <label>{t.notes}<textarea value={branchForm.notes} onChange={(e) => setBranchForm({ ...branchForm, notes: e.target.value })} /></label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setShowBranchForm(false); resetBranchForm(); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>

      <SidePanel
        onClose={() => { setShowLocationForm(false); resetLocationForm(); }}
        open={showLocationForm}
        title={editingLocationId ? t.editLocation : t.addLocation}
      >
        <form className="panel" onSubmit={(event) => submitForm(event, saveLocation, editingLocationId ? t.locationUpdated : t.created)}>
          <label>{t.organizations}<select required value={locationForm.organization_id} onChange={(e) => setLocationForm({ ...locationForm, organization_id: e.target.value, branch_id: "" })}><option value=""></option>{selectableOrganizationsForLocation.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
          <label>{t.branch}<select value={locationForm.branch_id} onChange={(e) => setLocationForm({ ...locationForm, branch_id: e.target.value })}><option value=""></option>{selectableBranchesForLocation.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <p className="muted">{t.branchOptionalHint}</p>
          <label>{t.department}<input placeholder={t.departmentOptional} value={locationForm.department} onChange={(e) => setLocationForm({ ...locationForm, department: e.target.value })} /></label>
          <label>{t.room}<input required value={locationForm.room} onChange={(e) => setLocationForm({ ...locationForm, room: e.target.value })} /></label>
          <label>{t.locationDescriptionField}<input value={locationForm.display_name} onChange={(e) => setLocationForm({ ...locationForm, display_name: e.target.value })} /></label>
          <p className="muted">{t.locationDescriptionOptionalHint}</p>
          <label>{t.notes}<textarea value={locationForm.notes} onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })} /></label>
          <div className="inline-actions">
            <button className="button" disabled={saving} type="submit">{t.save}</button>
            <button className="button secondary" onClick={() => { setShowLocationForm(false); resetLocationForm(); }} type="button">{t.cancel}</button>
          </div>
        </form>
      </SidePanel>
    </section>
  );
}

function DirectoryFilterBar({
  counts,
  filter,
  onChange,
}: {
  counts: { active: number; inactive: number; all: number };
  filter: DirectoryFilter;
  onChange: (filter: DirectoryFilter) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="filter-bar compact-filter">
      <button className={filter === "active" ? "active" : ""} onClick={() => onChange("active")} type="button">{t.activeModels} ({counts.active})</button>
      <button className={filter === "inactive" ? "active" : ""} onClick={() => onChange("inactive")} type="button">{t.inactiveModels} ({counts.inactive})</button>
      <button className={filter === "all" ? "active" : ""} onClick={() => onChange("all")} type="button">{t.allModels} ({counts.all})</button>
    </div>
  );
}
