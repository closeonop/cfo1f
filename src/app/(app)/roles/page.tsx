"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { FinanceHeader, FinanceMetric } from "@/components/finance-workspace";
import { ActionDisclosure } from "@/components/action-disclosure";
import { usePortalSync } from "@/lib/use-portal-sync";
import { moneyFmt, parseMoneyInput } from "@/lib/format";
import type { Employee, JobRole, Tier } from "@/lib/types";

export default function RolesPage() {
  const { company, user } = useSession();
  const money = (v: number | null | undefined) => moneyFmt(v, company.currency, company.locale);
  const canManage = ["ADMIN", "CFO", "HR"].includes(user.role);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [roles, setRoles] = useState<JobRole[] | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JobRole | null>(null);
  const [form, setForm] = useState({ name: "", defaultTierId: "none", min: "", max: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [jobs, bands, people] = await Promise.all([api<JobRole[]>("/job-roles?includeArchived=true"), api<Tier[]>("/tiers"), api<Employee[]>("/employees")]);
      setRoles(jobs); setTiers(bands); setEmployees(people); setLoadError("");
    } catch { setLoadError("Could not load job roles. Please try again."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  usePortalSync(load, !open && !busy);

  async function archive(role: JobRole) {
    setBusy(true);
    try { await api(`/job-roles/${role.id}/archive`, {method:"POST"}); toast.success(role.archived ? "Role restored." : "Role archived. Existing employee assignments are kept."); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update the role."); }
    finally { setBusy(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", defaultTierId: "none", min: "", max: "" });
    setErr(null);
    setOpen(true);
  }

  function openEdit(r: JobRole) {
    setEditing(r);
    setForm({
      name: r.name,
      defaultTierId: r.defaultTierId ? String(r.defaultTierId) : "none",
      min: r.minSalary?.toString() ?? "",
      max: r.maxSalary?.toString() ?? "",
    });
    setErr(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body = {
      defaultComponents: editing?.defaultComponents ?? null,
      name: form.name,
      defaultTierId: form.defaultTierId === "none" ? null : Number(form.defaultTierId),
      minSalary: parseMoneyInput(form.min),
      maxSalary: parseMoneyInput(form.max),
    };
    try {
      if ((form.min.trim() && body.minSalary == null) || (form.max.trim() && body.maxSalary == null)) throw new Error("Enter valid salary amounts.");
      if (editing) {
        await api(`/job-roles/${editing.id}`, { method: "PUT", body });
        toast.success("Role saved.");
      } else {
        await api("/job-roles", { method: "POST", body });
        toast.success("Role created.");
      }
      setOpen(false);
      load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const active = (roles ?? []).filter(role => !role.archived);
  const people = employees.filter(employee => employee.status === "ACTIVE");
  const filtered = (roles ?? []).filter(role => (showArchived || !role.archived) && `${role.name} ${role.defaultTierName ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const period = company.salaryPeriod === "ANNUAL" ? "year" : "month";
  return (
    <div data-tour-page="roles" data-tour-ready={roles != null && !loadError} className="finance-page">
      <FinanceHeader section="roles" title="Good structure. Clear expectations." description="Define what people do and the pay defaults that help HR set up their profiles. Job roles are separate from account permissions." reports={["ADMIN","CFO"].includes(user.role)} action={canManage && <Button data-tour="add-role-btn" onClick={openAdd}><Plus aria-hidden="true" /> New job role</Button>} />
      <section className="finance-metrics" aria-label="Job role overview"><FinanceMetric label="Active job roles" value={roles ? active.length : "—"} note="Available when creating or updating an employee." accent /><FinanceMetric label="With a default band" value={roles ? active.filter(role => role.defaultTierId != null).length : "—"} note="Suggestions for HR; each employee can have a different band." /><FinanceMetric label="People without a role" value={roles ? people.filter(employee => !employee.jobRoleId).length : "—"} note="Active employees with no job role assigned." /></section>
      {loadError && <div className="finance-error" role="alert">{loadError} <Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}
      <div className="finance-toolbar"><div className="finance-search"><Label htmlFor="role-search" className="sr-only">Find a job role</Label><Input data-tour="roles-search" id="role-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a role or default band…" /></div><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Include archived roles</label></div>
      <section data-tour="roles-list" className="finance-role-grid" aria-label="Job roles">{!roles ? (loadError ? null : <p className="finance-empty" role="status">Loading roles…</p>) : filtered.length === 0 ? <p className="finance-empty">No roles in this view. Create a role or change your search.</p> : filtered.map(role => <article key={role.id} className="finance-role-card">
        <div className="flex items-start justify-between gap-3"><h2>{role.name}</h2><Badge variant={role.archived ? "secondary" : "default"}>{role.archived ? "Archived" : "Active"}</Badge></div>
        <dl><div><dt>Default pay band</dt><dd>{role.defaultTierName ?? "Not set"}{role.defaultTierId && !tiers.some(tier => tier.id === role.defaultTierId) ? " (archived)" : ""}</dd></div><div><dt>Suggested base / {period}</dt><dd className="tabular">{role.minSalary == null && role.maxSalary == null ? "Not set" : `${role.minSalary == null ? "No minimum" : money(role.minSalary)} – ${role.maxSalary == null ? "No maximum" : money(role.maxSalary)}`}</dd></div></dl>
        <footer><span>{people.filter(employee => employee.jobRoleId === role.id).length} active people</span>{canManage && <ActionDisclosure label={`Actions for ${role.name}`}>
          {!role.archived && <Button variant="outline" size="sm" onClick={() => openEdit(role)}><Pencil aria-hidden="true" /> Edit role</Button>}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void archive(role)}>{role.archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}{role.archived ? "Restore role" : "Archive role"}</Button>
        </ActionDisclosure>}</footer>
      </article>)}</section>
      <ActionDisclosure label="How job roles and account permissions differ"><div className="space-y-3 text-sm text-muted-foreground"><p>A job role describes a person’s work. Changing it never grants salary, approval or administration access. Manage sign-in permissions in Accounts &amp; roles.</p><p>Admin and CFO manage pay bands and compensation. HR manages people and job roles, and can propose raises. HR sees pay figures only when salary visibility is enabled. Managers see their team’s permitted records; employees see their own.</p></div></ActionDisclosure>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-tour="roles-editor">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit role" : "New job role"}</DialogTitle>
            <DialogDescription>Defaults are suggestions, not rules — each person can differ.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rname">Role name</Label>
              <Input data-tour="role-name" id="rname" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Software Engineer" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rtier">Typical tier</Label>
              <Select value={form.defaultTierId} onValueChange={(v) => setForm({ ...form, defaultTierId: v })}>
                <SelectTrigger data-tour="role-default-tier" id="rtier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {tiers.filter((t) => !t.archived).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div data-tour="role-pay-range" className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rmin">Minimum base / {period}</Label>
                <Input id="rmin" inputMode="decimal" className="tabular" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rmax">Maximum base / {period}</Label>
                <Input id="rmax" inputMode="decimal" className="tabular" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} />
              </div>
            </div>
            {err && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button data-tour="role-save" type="submit" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save" : "Create role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
