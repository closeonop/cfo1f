"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive as ArchiveIcon, ArchiveRestore as RestoreIcon, ArrowDown, ArrowUp, Pencil, Plus, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { moneyFmt } from "@/lib/format";
import type { Employee, Tier, TierStat } from "@/lib/types";

const COLORS = ["#0f766e", "#0369a1", "#7c3aed", "#b45309", "#be123c", "#4d7c0f"];

export default function TiersPage() {
  const { company, user } = useSession();
  const money = (v: number | null | undefined) => moneyFmt(v, company.currency, company.locale);
  const canManage = ["ADMIN", "CFO"].includes(user.role);
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

  const load = useCallback(() => {
    api<Tier[]>("/tiers?includeArchived=true").then(setTiers).catch(() => toast.error("Could not load tiers."));
    api<TierStat[]>("/tiers/stats").then(setStats).catch(() => {});
    api<Employee[]>("/employees").then(setEmployees).catch(() => {});
  }, []);
  useEffect(load, [load]);

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
      minSalary: form.min ? Number(form.min.replace(/,/g, "")) : null,
      maxSalary: form.max ? Number(form.max.replace(/,/g, "")) : null,
      color: form.color,
    };
    try {
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
      setErr(error instanceof ApiError ? error.message : "Could not save.");
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
      toast.error("Could not change the tier.");
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

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Tiers</h1>
          <p className="text-sm text-muted-foreground">
            Pay bands for your company. Each tier has a salary range; people sit in exactly one.
          </p>
        </header>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus aria-hidden="true" /> New tier
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Salary range</TableHead>
                <TableHead>People</TableHead>
                <TableHead>Monthly cost</TableHead>
                <TableHead>Average pay</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers == null ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : tiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <p className="font-medium">No tiers yet.</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first tier, e.g. “Tier 1” with a range from 2,000 to 4,000.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                tiers.map((t, i) => {
                  const s = statFor(t.id);
                  return (
                    <TableRow key={t.id} className={t.archived ? "opacity-60" : ""}>
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-3 w-3 rounded-full" style={{ background: t.color ?? "#999" }} aria-hidden="true" />
                          {t.name}
                          {t.archived && <span className="text-xs text-muted-foreground">(archived)</span>}
                        </span>
                        {t.description && <span className="text-xs text-muted-foreground">{t.description}</span>}
                      </TableCell>
                      <TableCell className="tabular">
                        {money(t.minSalary)} – {money(t.maxSalary)}
                      </TableCell>
                      <TableCell className="tabular">{s?.headcount ?? 0}</TableCell>
                      <TableCell className="tabular">{money(s?.totalMonthlyCost)}</TableCell>
                      <TableCell className="tabular">{money(s?.averageSalary)}</TableCell>
                      <TableCell>
                        {canManage && (
                          <span className="flex justify-end gap-1">
                            {!t.archived && (
                              <>
                                <Button variant="ghost" size="icon" aria-label={`Assign people to ${t.name}`} onClick={() => { setAssigning(t); setSelected([]); }}>
                                  <UserRoundCheck />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label={`Edit ${t.name}`} onClick={() => openEdit(t)}>
                                  <Pencil />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label={`Move ${t.name} up`} disabled={i === 0} onClick={() => move(t, -1)}>
                                  <ArrowUp />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label={`Move ${t.name} down`} disabled={i === tiers.filter((x) => !x.archived).length - 1} onClick={() => move(t, 1)}>
                                  <ArrowDown />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" aria-label={t.archived ? `Restore ${t.name}` : `Archive ${t.name}`} onClick={() => archive(t)}>
                              {t.archived ? <RestoreIcon /> : <ArchiveIcon />}
                            </Button>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit tier" : "New tier"}</DialogTitle>
            <DialogDescription>
              Give it a name and the salary range it covers. You can change these any time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tname">Name</Label>
              <Input id="tname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tmin">Minimum salary</Label>
                <Input id="tmin" inputMode="decimal" className="tabular" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tmax">Maximum salary</Label>
                <Input id="tmax" inputMode="decimal" className="tabular" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} />
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
              <Button type="submit" disabled={busy}>
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
