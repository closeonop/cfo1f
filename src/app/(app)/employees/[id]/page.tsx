"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
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
import { dateFmt, moneyFmt, pctFmt } from "@/lib/format";
import type { CompensationView, Employee } from "@/lib/types";

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { user, company } = useSession();
  const money = (v: number | null | undefined) => moneyFmt(v, company.currency, company.locale);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [comp, setComp] = useState<CompensationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [componentOpen, setComponentOpen] = useState(false);
  const [reversing, setReversing] = useState<number | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canSeeMoney = user.role === "ADMIN" || user.role === "CFO";
  const isSelf = user.employeeId === id;
  const canSeeThisComp = isSelf || canSeeMoney;

  const load = useCallback(() => {
    api<Employee>(`/employees/${id}`)
      .then(setEmployee)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Not found."));
    if (canSeeThisComp) {
      api<CompensationView>(`/employees/${id}/compensation`).then(setComp).catch(() => {});
    }
  }, [id, canSeeThisComp]);
  useEffect(load, [load]);

  async function reverseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reversing == null) return;
    setBusy(true);
    try {
      await api(`/salary-history/${reversing}/reverse`, { method: "POST", body: { reason: reverseReason } });
      toast.success("Reversed. A new entry was added — nothing was deleted.");
      setReversing(null);
      setReverseReason("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Reversal failed.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/employees">
            <ChevronLeft aria-hidden="true" /> Back
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return <div className="animate-pulse py-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/employees">
          <ChevronLeft aria-hidden="true" /> Back to employees
        </Link>
      </Button>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {employee.jobRole ?? "No role"} · {employee.team ?? "No team"}
            {employee.manager ? ` · reports to ${employee.manager}` : ""}
          </p>
        </div>
        <Badge variant={employee.status === "ACTIVE" ? "success" : "secondary"}>
          {employee.status === "ACTIVE" ? "Active" : "Inactive"}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <Detail label="Employee code" value={employee.employeeCode ?? "—"} />
          <Detail label="Email" value={employee.email ?? "—"} />
          <Detail label="Phone" value={employee.phone ?? "—"} />
          <Detail label="Started" value={dateFmt(employee.startDate, company.locale)} />
          <Detail label="Tier" value={employee.tier ?? "—"} />
          <Detail label="Manager" value={employee.manager ?? "—"} />
        </CardContent>
      </Card>

      {employee.salaryOutsideTier && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Salary is{" "}
          {employee.salaryOutsideTier === "ABOVE" ? "above" : "below"} the {employee.tier} range. This is
          allowed — just worth a look.
        </p>
      )}

      {canSeeThisComp && comp && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Total compensation</CardTitle>
              <CardDescription>Base salary plus variable pay, per month.</CardDescription>
            </div>
            {canSeeMoney && (
              <Button size="sm" onClick={() => setComponentOpen(true)}>
                <Plus aria-hidden="true" /> Add component
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-3xl font-semibold tabular">{money(comp.totalMonthly)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                base {money(comp.baseSalary)} + variable {money(comp.variableMonthly)}
                {comp.oneTimeTotal != null && comp.oneTimeTotal > 0
                  ? ` + one-time ${money(comp.oneTimeTotal)} (not counted monthly)`
                  : ""}
              </div>
              {comp.salaryPeriod === "ANNUAL" && (
                <p className="mt-1 text-xs text-muted-foreground">Shown as monthly equivalents of annual figures.</p>
              )}
            </div>

            {comp.components.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>How it&apos;s calculated</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Period</TableHead>
                    {canSeeMoney && <TableHead aria-label="Actions" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comp.components.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        {c.calcType === "PERCENT" ? "% of base salary" : c.calcType === "TARGET" ? "Target amount" : "Fixed amount"}
                      </TableCell>
                      <TableCell className="tabular">{c.calcType === "PERCENT" ? pctFmt(c.value) : money(c.value)}</TableCell>
                      <TableCell>
                        {c.period === "ONE_TIME" ? "One-time" : c.period.charAt(0) + c.period.slice(1).toLowerCase()}
                      </TableCell>
                      {canSeeMoney && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${c.name}`}
                            onClick={async () => {
                              try {
                                await api(`/components/${c.id}`, { method: "DELETE" });
                                toast.success("Component removed.");
                                load();
                              } catch {
                                toast.error("Could not remove it.");
                              }
                            }}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {comp && comp.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Salary history</CardTitle>
            <CardDescription>Every pay change, with who made it and why. Nothing is ever edited.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                  {canSeeMoney && <TableHead aria-label="Actions" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comp.history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{dateFmt(h.effectiveDate, company.locale)}</TableCell>
                    <TableCell className="tabular">{money(h.oldSalary)}</TableCell>
                    <TableCell className="tabular">{money(h.newSalary)}</TableCell>
                    <TableCell>{h.isReversal ? <Badge variant="warning">Reversal</Badge> : pctFmt(h.percent)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.reason ?? "—"}</TableCell>
                    {canSeeMoney && (
                      <TableCell>
                        {!h.isReversal && h.oldSalary !== 0 && (
                          <Button variant="ghost" size="icon" aria-label="Reverse this change" onClick={() => setReversing(h.id)}>
                            <RotateCcw />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* add component dialog */}
      <ComponentDialog
        open={componentOpen}
        onOpenChange={setComponentOpen}
        employeeId={id}
        onSaved={() => {
          setComponentOpen(false);
          load();
        }}
      />

      {/* reverse dialog */}
      <Dialog open={reversing != null} onOpenChange={(v) => !v && setReversing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo this pay change?</DialogTitle>
            <DialogDescription>
              The person&apos;s pay goes back to what it was before. We add a new entry — the original stays
              for the record.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={reverseSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="revReason">Why? (shown in history)</Label>
              <Input id="revReason" value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="Made in error" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReversing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Reversing…" : "Reverse it"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function ComponentDialog({
  open,
  onOpenChange,
  employeeId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: number;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [calcType, setCalcType] = useState("FIXED");
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState("MONTHLY");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api(`/employees/${employeeId}/components`, {
        method: "POST",
        body: { name, calcType, value: Number(value.replace(/,/g, "")), period },
      });
      toast.success("Component added.");
      setName("");
      setValue("");
      onSaved();
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a pay component</DialogTitle>
          <DialogDescription>Bonus, commission, overtime, allowance… your words.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bonus" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ctype">How it&apos;s calculated</Label>
              <Select value={calcType} onValueChange={setCalcType}>
                <SelectTrigger id="ctype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed amount</SelectItem>
                  <SelectItem value="PERCENT">% of base salary</SelectItem>
                  <SelectItem value="TARGET">Target amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cperiod">How often</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="cperiod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                  <SelectItem value="ONE_TIME">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cvalue">{calcType === "PERCENT" ? "Percent" : "Amount"}</Label>
            <Input id="cvalue" inputMode="decimal" className="tabular" value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          {err && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
