"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { moneyFmt } from "@/lib/format";
import type { JobRole, Tier } from "@/lib/types";

export default function RolesPage() {
  const { company, user } = useSession();
  const money = (v: number | null | undefined) => moneyFmt(v, company.currency, company.locale);
  const canManage = ["ADMIN", "CFO", "HR"].includes(user.role);
  const [roles, setRoles] = useState<JobRole[] | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JobRole | null>(null);
  const [form, setForm] = useState({ name: "", defaultTierId: "none", min: "", max: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<JobRole[]>("/job-roles").then(setRoles).catch(() => toast.error("Could not load roles."));
    api<Tier[]>("/tiers").then(setTiers).catch(() => {});
  }, []);
  useEffect(load, [load]);

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
      name: form.name,
      defaultTierId: form.defaultTierId === "none" ? null : Number(form.defaultTierId),
      minSalary: form.min ? Number(form.min.replace(/,/g, "")) : null,
      maxSalary: form.max ? Number(form.max.replace(/,/g, "")) : null,
    };
    try {
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
      setErr(error instanceof ApiError ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Job roles</h1>
          <p className="text-sm text-muted-foreground">
            What people do — like “Sales Manager”. Optionally give each role a typical tier and pay range.
          </p>
        </header>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus aria-hidden="true" /> New role
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Typical tier</TableHead>
                <TableHead>Typical pay range</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles == null ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center">
                    <p className="font-medium">No job roles yet.</p>
                    <p className="text-sm text-muted-foreground">
                      Roles are optional — but they make the employee form quicker to fill.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.defaultTierName ?? "—"}</TableCell>
                    <TableCell className="tabular">
                      {r.minSalary != null || r.maxSalary != null
                        ? `${money(r.minSalary)} – ${money(r.maxSalary)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <span className="flex justify-end">
                          <Button variant="ghost" size="icon" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
                            <Pencil />
                          </Button>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who can do what in this app</CardTitle>
          <CardDescription>
            Built-in access roles — Admin, CFO/Finance, HR, Manager, Employee. The server checks this on every
            action, not just here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <PermissionBadge role="Admin (you at setup)" text="Everything, including settings and the audit log." />
          <PermissionBadge role="CFO / Finance" text="Everything money: salaries, tiers, raises, reports." />
          <PermissionBadge role="HR" text="People records. Sees pay only if the CFO turns that on." />
          <PermissionBadge role="Manager" text="Their own team's profiles — never pay figures." />
          <PermissionBadge role="Employee" text="Their own profile and their own pay." />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit role" : "New job role"}</DialogTitle>
            <DialogDescription>Defaults are suggestions, not rules — each person can differ.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rname">Role name</Label>
              <Input id="rname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Software Engineer" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rtier">Typical tier</Label>
              <Select value={form.defaultTierId} onValueChange={(v) => setForm({ ...form, defaultTierId: v })}>
                <SelectTrigger id="rtier">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rmin">Typical minimum</Label>
                <Input id="rmin" inputMode="decimal" className="tabular" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rmax">Typical maximum</Label>
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
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save" : "Create role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PermissionBadge({ role, text }: { role: string; text: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium">{role}</div>
      <div className="text-muted-foreground">{text}</div>
    </div>
  );
}
