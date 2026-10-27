"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive as ArchiveIcon, ArchiveRestore as RestoreIcon, ArrowDown, ArrowUp, Pencil, Plus, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
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
import { useSession } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { FinanceHeader, FinanceMetric } from "@/components/finance-workspace";
import { ActionDisclosure } from "@/components/action-disclosure";
import { usePortalSync } from "@/lib/use-portal-sync";
import { moneyFmt, parseMoneyInput } from "@/lib/format";
import type { Employee, Tier, TierStat } from "@/lib/types";

const COLORS = ["#0f766e", "#0369a1", "#7c3aed", "#b45309", "#be123c", "#4d7c0f"];

export default function TiersPage() {
  const { company, user } = useSession();
  const money = (v: number | null | undefined) => moneyFmt(v, company.currency, company.locale);
  const canManage = ["ADMIN", "CFO"].includes(user.role);
  const canAssign = ["ADMIN", "CFO", "HR"].includes(user.role);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [stats, setStats] = useState<TierStat[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [form, setForm] = useState({ name: "", description: "", min: "", max: "", color: COLORS[0] });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState<Tier | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      const [bands, totals, people] = await Promise.all([api<Tier[]>("/tiers?includeArchived=true"), api<TierStat[]>("/tiers/stats"), api<Employee[]>("/employees")]);
      setTiers(bands); setStats(totals); setEmployees(people); setLoadError("");
    } catch { setLoadError("Could not load pay bands. Please try again."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  usePortalSync(load, !dialogOpen && !assigning && !busy);

  function openAdd() {
    setEditing(null);
    setForm({ name: `Tier ${tiers ? tiers.filter((t) => !t.archived).length + 1 : 1}`, description: "", min: "", max: "", color: COLORS[0] });
    setErr(null);
    setDialogOpen(true);
  }

  function openEdit(t: Tier) {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description ?? "",
      min: t.minSalary?.toString() ?? "",
      max: t.maxSalary?.toString() ?? "",
      color: t.color ?? COLORS[0],
    });
    setErr(null);
    setDialogOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body = {
      name: form.name,
      description: form.description || null,
      minSalary: parseMoneyInput(form.min),
      maxSalary: parseMoneyInput(form.max),
      color: form.color,
    };
    try {
      if ((form.min.trim() && body.minSalary == null) || (form.max.trim() && body.maxSalary == null)) throw new Error("Enter valid salary amounts.");
      if (editing) {
        await api(`/tiers/${editing.id}`, { method: "PUT", body });
        toast.success("Tier saved.");
      } else {
        await api("/tiers", { method: "POST", body });
        toast.success("Tier created.");
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function archive(t: Tier) {
    try {
      await api(`/tiers/${t.id}/archive`, { method: "POST", body: {} });
      toast.success(t.archived ? "Tier restored." : "Tier archived. People keep their history.");
      load();
    } catch {
      toast.error("Could not change the tier. Check for an existing active tier with this name.");
    }
  }

  async function move(t: Tier, dir: -1 | 1) {
    if (!tiers) return;
    const others = tiers.filter((x) => !x.archived).sort((a, b) => a.sortOrder - b.sortOrder);
    const ids = others.map((x) => x.id);
    const i = ids.indexOf(t.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await api("/tiers/reorder", { method: "PUT", body: ids });
      load();
    } catch {
      toast.error("Could not reorder.");
    }
  }

  async function assign() {
    if (!assigning) return;
    setBusy(true);
    try {
      const res = await api<{ moved: number }>("/tiers/assign", {
        method: "POST",
        body: { employeeIds: selected, tierId: assigning.id },
      });
      toast.success(`${res.moved} ${res.moved === 1 ? "person" : "people"} moved to ${assigning.name}.`);
      setAssigning(null);
      setSelected([]);
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not move people.");
    } finally {
      setBusy(false);
    }
  }

  const statFor = (id: number) => stats.find((s) => s.id === id);

  const active = (tiers ?? []).filter(t => !t.archived);
  const activePeople = employees.filter(e => e.status === "ACTIVE");
  const assigned = activePeople.filter(e => e.tierId != null).length;
  const filtered = (tiers ?? []).filter(t => (showArchived || !t.archived) && `${t.name} ${t.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const period = company.salaryPeriod === "ANNUAL" ? "year" : "month";

  return (
    <div data-tour-page="tiers" data-tour-ready={tiers != null && !loadError} className="finance-page">
      <FinanceHeader section="tiers" title="A clear place for every pay band." description="Set the ranges behind fair, consistent pay. Assigning a band never changes an employee’s salary." reports={canManage} action={canManage && <Button data-tour="add-tier-btn" onClick={openAdd}><Plus aria-hidden="true" /> New pay band</Button>} />
      <section className="finance-metrics" aria-label="Pay band overview">
        <FinanceMetric label="Active pay bands" value={tiers ? active.length : "—"} note={`Ranges are base pay per ${period}, in ${company.currency}.`} accent />
        <FinanceMetric label="People assigned" value={tiers ? assigned : "—"} note="Active employees with a pay band, including archived bands." />
        <FinanceMetric label="Awaiting a band" value={tiers ? activePeople.length - assigned : "—"} note="Active employees without an assigned band." />
      </section>
      {loadError && <div role="alert" className="finance-error">{loadError} <Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}
      <div className="finance-toolbar"><div className="finance-search"><Label htmlFor="tier-search" className="sr-only">Find a pay band</Label><Input id="tier-search" placeholder="Find a pay band…" value={search} onChange={e => setSearch(e.target.value)} /></div><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Include archived bands</label></div>
      <section data-tour="tiers-list" className="space-y-4" aria-label="Pay bands">
        {!tiers ? (loadError ? null : <p role="status" className="finance-empty">Loading pay bands…</p>) : filtered.length === 0 ? <p className="finance-empty">{search || showArchived ? "No pay bands match this view." : "No active pay bands yet. Create a band to get started."}</p> : filtered.map(t => {
          const stat = statFor(t.id);
          const index = active.findIndex(band => band.id === t.id);
          const outside = activePeople.filter(e => e.tierId === t.id && e.salaryOutsideTier).length;
          return <article key={t.id} className={`pay-band${t.archived ? " archived" : ""}`}>
            <div className="pay-band-main">
              <div><div className="pay-band-number"><span className="h-2.5 w-2.5 rounded-full" style={{background:t.color ?? "var(--primary)"}} aria-hidden="true" />{t.archived ? "ARCHIVED" : `BAND ${String(index + 1).padStart(2,"0")}`}</div><h2>{t.name}</h2><p className="mt-2 text-sm text-muted-foreground">{t.description || "Base salary range"}</p></div>
              <div><div className="pay-band-range tabular"><strong>{t.minSalary == null ? "No minimum" : money(t.minSalary)}</strong><span aria-hidden="true">→</span><strong>{t.maxSalary == null ? "No maximum" : money(t.maxSalary)}</strong></div><div className="pay-band-labels"><span>Minimum / {period}</span><span>Maximum / {period}</span></div></div>
              <div className="pay-band-count"><strong>{stat?.headcount ?? "—"}</strong><span>active {(stat?.headcount ?? 0) === 1 ? "person" : "people"}</span></div>
            </div>
            <footer className="pay-band-footer"><div className="flex flex-wrap gap-x-5 gap-y-2"><span>Monthly base <strong className="tabular">{money(stat?.totalMonthlyCost)}</strong></span><span>Average base / {period} <strong className="tabular">{money(stat?.averageSalary)}</strong></span>{outside > 0 && <span className="text-warning-foreground">{outside} outside range</span>}</div>
              {canAssign && <ActionDisclosure label={`Actions for ${t.name}`} className="finance-band-actions">
                {!t.archived && <Button size="sm" variant="outline" disabled={busy} onClick={() => {setAssigning(t);setSelected([]);}}><UserRoundCheck aria-hidden="true" /> Assign people</Button>}
                {canManage && !t.archived && <><Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil aria-hidden="true" /> Edit band</Button><Button size="sm" variant="ghost" disabled={index === 0} onClick={() => void move(t,-1)}><ArrowUp aria-hidden="true" /> Move up</Button><Button size="sm" variant="ghost" disabled={index === active.length - 1} onClick={() => void move(t,1)}><ArrowDown aria-hidden="true" /> Move down</Button></>}
                {canManage && <Button size="sm" variant="ghost" onClick={() => void archive(t)}>{t.archived ? <RestoreIcon aria-hidden="true" /> : <ArchiveIcon aria-hidden="true" />}{t.archived ? "Restore band" : "Archive band"}</Button>}
              </ActionDisclosure>}
            </footer>
          </article>;
        })}
      </section>
      <p className="text-xs text-muted-foreground">Monthly base excludes variable and one-time pay. Pay figures appear only with salary access. Archived bands retain their people and history.</p>

      {/* create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-tour="tiers-editor">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit tier" : "New tier"}</DialogTitle>
            <DialogDescription>
              Give it a name and the salary range it covers. You can change these any time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tname">Name</Label>
              <Input data-tour="tier-name" id="tname" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tmin">Minimum base / {period}</Label>
                <Input data-tour="tier-minimum" id="tmin" inputMode="decimal" className="tabular" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tmax">Maximum base / {period}</Label>
                <Input data-tour="tier-maximum" id="tmax" inputMode="decimal" className="tabular" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tdesc">Description (optional)</Label>
              <Input id="tdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    aria-pressed={form.color === c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-8 w-8 rounded-full ring-offset-2 ${form.color === c ? "ring-2 ring-ring" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            {err && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button data-tour="tier-save" type="submit" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save" : "Create tier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* assign dialog */}
      <Dialog open={assigning != null} onOpenChange={(v) => !v && setAssigning(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Move people to {assigning?.name}</DialogTitle>
            <DialogDescription>Tick everyone who belongs in this tier. You can change it any time.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-md border p-3">
            {(employees ?? [])
              .filter((e) => e.status === "ACTIVE")
              .map((e) => (
                <label key={e.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--primary)]"
                    checked={selected.includes(e.id)}
                    onChange={(ev) =>
                      setSelected(ev.target.checked ? [...selected, e.id] : selected.filter((x) => x !== e.id))
                    }
                  />
                  <span>
                    {e.firstName} {e.lastName}
                    {e.tier && <span className="text-muted-foreground"> — currently {e.tier}</span>}
                  </span>
                </label>
              ))}
            {employees.filter((e) => e.status === "ACTIVE").length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No active employees yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)}>
              Cancel
            </Button>
            <Button onClick={assign} disabled={busy || selected.length === 0}>
              {busy ? "Moving…" : `Move ${selected.length} ${selected.length === 1 ? "person" : "people"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
