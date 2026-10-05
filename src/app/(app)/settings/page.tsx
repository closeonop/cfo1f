"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Company } from "@/lib/types";

interface PermRow {
  area: string;
  ADMIN: string | boolean;
  CFO: string | boolean;
  HR: string | boolean;
  MANAGER: string | boolean;
  EMPLOYEE: string | boolean;
}

export default function SettingsPage() {
  const { reload } = useSession();
  const [form, setForm] = useState<Company | null>(null);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Company>("/company").then(setForm).catch(() => toast.error("Could not load settings."));
    api<PermRow[]>("/company/permissions").then(setPerms).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/company", { method: "PUT", body: form });
      toast.success("Settings saved.");
      reload();
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!form) return <div className="animate-pulse py-10 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">How the app works for everyone in {form.name}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company</CardTitle>
          <CardDescription>These choices shape every money figure and date in the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "INR", "AED", "CAD", "AUD", "SGD"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locale">Number style</Label>
                <Select value={form.locale} onValueChange={(v) => setForm({ ...form, locale: v })}>
                  <SelectTrigger id="locale"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">1,234,567 (thousand)</SelectItem>
                    <SelectItem value="en-IN">12,34,567 (lakh/crore)</SelectItem>
                    <SelectItem value="en-GB">1,234,567 (UK)</SelectItem>
                    <SelectItem value="de-DE">1.234.567 (German)</SelectItem>
                    <SelectItem value="fr-FR">1 234 567 (French)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="period">Salaries are</Label>
                <Select value={form.salaryPeriod} onValueChange={(v) => setForm({ ...form, salaryPeriod: v as Company["salaryPeriod"] })}>
                  <SelectTrigger id="period"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly amounts</SelectItem>
                    <SelectItem value="ANNUAL">Annual amounts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="round">Round raise results to</Label>
                <Select value={form.roundingRule} onValueChange={(v) => setForm({ ...form, roundingRule: v as Company["roundingRule"] })}>
                  <SelectTrigger id="round"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No rounding (exact)</SelectItem>
                    <SelectItem value="NEAREST_1">Nearest 1</SelectItem>
                    <SelectItem value="NEAREST_10">Nearest 10</SelectItem>
                    <SelectItem value="NEAREST_100">Nearest 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hrpay">Can HR see salaries?</Label>
                <Select
                  value={form.hrCanSeeSalary ? "yes" : "no"}
                  onValueChange={(v) => setForm({ ...form, hrCanSeeSalary: v === "yes" })}
                >
                  <SelectTrigger id="hrpay"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No — pay stays with Finance</SelectItem>
                    <SelectItem value="yes">Yes — HR needs it for their work</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Every view of pay data is recorded in the audit log.</p>
              </div>
            </div>
            {err && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access roles</CardTitle>
          <CardDescription>Built-in and enforced on the server. Shown here so there are no surprises.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>What</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>CFO</TableHead>
                <TableHead>HR</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Employee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perms.map((p) => (
                <TableRow key={p.area}>
                  <TableCell className="font-medium">{p.area}</TableCell>
                  {(["ADMIN", "CFO", "HR", "MANAGER", "EMPLOYEE"] as const).map((r) => (
                    <TableCell key={r}>
                      {p[r] === true ? "✓" : p[r] === false ? "—" : String(p[r])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
