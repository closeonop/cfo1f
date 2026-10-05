"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpDown, Gift } from "lucide-react";
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
import { dateFmt, moneyFmt } from "@/lib/format";
import type { Employee, RaiseSummary, ReportTable, Tier } from "@/lib/types";

export default function CompensationPage() {
  const { company, user } = useSession();
  const money = (v: number | null | undefined) => moneyFmt(v, company.currency, company.locale);
  const canApprove = ["ADMIN", "CFO"].includes(user.role);

  const [costByTier, setCostByTier] = useState<ReportTable | null>(null);
  const [costByRole, setCostByRole] = useState<ReportTable | null>(null);
  const [costByTeam, setCostByTeam] = useState<ReportTable | null>(null);
  const [raises, setRaises] = useState<RaiseSummary[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // raise wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [who, setWho] = useState("tier");
  const [tierId, setTierId] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [raiseType, setRaiseType] = useState("percent");
  const [percent, setPercent] = useState("");
  const [fixed, setFixed] = useState("");
  const [effective, setEffective] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [capPolicy, setCapPolicy] = useState("CAP");
  const [preview, setPreview] = useState<import("@/lib/types").RaisePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ReportTable>("/reports/cost-by?group=tier").then(setCostByTier).catch(() => {});
    api<ReportTable>("/reports/cost-by?group=role").then(setCostByRole).catch(() => {});
    api<ReportTable>("/reports/cost-by?group=team").then(setCostByTeam).catch(() => {});
    api<RaiseSummary[]>("/raises").then(setRaises).catch(() => {});
    api<Tier[]>("/tiers").then(setTiers).catch(() => {});
    api<Employee[]>("/employees").then(setEmployees).catch(() => {});
  }, []);
  useEffect(load, [load]);

  function resetWizard() {
    setStep(1);
    setWho("tier");
    setPicked([]);
    setRaiseType("percent");
    setPercent("");
    setFixed("");
    setEffective(new Date().toISOString().slice(0, 10));
    setReason("");
    setCapPolicy("CAP");
    setPreview(null);
    setErr(null);
  }

  async function loadPreview() {
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        effectiveDate: effective,
        reason: reason,
        capPolicy,
      };
      if (who === "tier") body.tierId = Number(tierId);
      else body.employeeIds = picked;
      if (raiseType === "percent") body.percent = Number(percent.replace(/,/g, ""));
      if (raiseType === "fixed") body.fixedAmount = Number(fixed.replace(/,/g, ""));
      const res = await api<import("@/lib/types").RaisePreview>("/raises/preview", { method: "POST", body });
      setPreview(res);
      setStep(2);
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Could not build the preview.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRaise() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        effectiveDate: effective,
        reason,
        capPolicy,
      };
      if (who === "tier") body.tierId = Number(tierId);
      else body.employeeIds = picked;
      if (raiseType === "percent") body.percent = Number(percent.replace(/,/g, ""));
      if (raiseType === "fixed") body.fixedAmount = Number(fixed.replace(/,/g, ""));
      const res = await api<RaiseSummary>("/raises", { method: "POST", body });
      toast.success(
        res.status === "APPLIED"
          ? "Raise applied. Salaries and history are updated."
          : res.status === "APPROVED"
            ? "Raise approved — it applies automatically on its effective date."
            : "Raise proposed — waiting for Finance to approve."
      );
      setWizardOpen(false);
      resetWizard();
      load();
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Could not apply the raise.");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: number, action: "approve" | "reject" | "cancel") {
    try {
      await api(`/raises/${id}/${action}`, { method: "POST", body: {} });
      toast.success(action === "approve" ? "Raise approved." : action === "reject" ? "Raise rejected." : "Raise cancelled.");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed.");
    }
  }

  const costTable = (t: ReportTable | null) =>
    t && (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.columns[0]}</TableHead>
            <TableHead>People</TableHead>
            <TableHead>Base</TableHead>
            <TableHead>Variable</TableHead>
            <TableHead>Total / month</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {t.rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{String(row[0])}</TableCell>
              <TableCell className="tabular">{String(row[1])}</TableCell>
              <TableCell className="tabular">{money(Number(row[2]))}</TableCell>
              <TableCell className="tabular">{money(Number(row[3]))}</TableCell>
              <TableCell className="tabular font-medium">{money(Number(row[4]))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Compensation</h1>
          <p className="text-sm text-muted-foreground">What everyone costs, and the raises you&apos;ve given.</p>
        </header>
        <Button size="lg" onClick={() => { resetWizard(); setWizardOpen(true); }}>
          <Gift aria-hidden="true" /> Give a raise
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">By tier</CardTitle>
          </CardHeader>
          <CardContent>{costTable(costByTier) ?? <Empty />}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">By role</CardTitle>
          </CardHeader>
          <CardContent>{costTable(costByRole) ?? <Empty />}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">By team</CardTitle>
          </CardHeader>
          <CardContent>{costTable(costByTeam) ?? <Empty />}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raise history</CardTitle>
          <CardDescription>Everything given or proposed, with its status.</CardDescription>
        </CardHeader>
        <CardContent>
          {raises.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No raises yet. Press “Give a raise” to start.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Who</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Cost impact / month</TableHead>
                  <TableHead>Status</TableHead>
                  {canApprove && <TableHead aria-label="Actions" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {raises.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.scopeNote ?? `${r.itemCount} people`}</TableCell>
                    <TableCell>{r.percent != null ? `${r.percent}%` : r.fixedAmount != null ? money(r.fixedAmount) : "—"}</TableCell>
                    <TableCell>{dateFmt(r.effectiveDate, company.locale)}</TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">{r.reason}</TableCell>
                    <TableCell className="tabular">{money(r.monthlyDelta)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "APPLIED" ? "success" : r.status === "PENDING" ? "warning" : r.status === "REJECTED" || r.status === "CANCELLED" ? "destructive" : "default"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    {canApprove && (
                      <TableCell>
                        {r.status === "PENDING" && (
                          <span className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => act(r.id, "approve")}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => act(r.id, "reject")}>Reject</Button>
                          </span>
                        )}
                        {(r.status === "PENDING" || r.status === "APPROVED") && (
                          <span className="flex justify-end">
                            <Button size="sm" variant="ghost" onClick={() => act(r.id, "cancel")}>Cancel</Button>
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ---- raise wizard ---- */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-2xl">
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>Give a raise — who and how much?</DialogTitle>
                <DialogDescription>You&apos;ll see exactly what it costs before anything changes.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="who">Who gets it</Label>
                    <Select value={who} onValueChange={setWho}>
                      <SelectTrigger id="who"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tier">A whole tier</SelectItem>
                        <SelectItem value="people">Selected people</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {who === "tier" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="wtier">Tier</Label>
                      <Select value={tierId} onValueChange={setTierId}>
                        <SelectTrigger id="wtier"><SelectValue placeholder="Choose tier…" /></SelectTrigger>
                        <SelectContent>
                          {tiers.filter((t) => !t.archived).map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>People ({picked.length} selected)</Label>
                      <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-sm">
                        {employees.filter((e) => e.status === "ACTIVE").map((e) => (
                          <label key={e.id} className="flex items-center gap-2 py-0.5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[var(--primary)]"
                              checked={picked.includes(e.id)}
                              onChange={(ev) => setPicked(ev.target.checked ? [...picked, e.id] : picked.filter((x) => x !== e.id))}
                            />
                            {e.firstName} {e.lastName}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rtype">Raise by</Label>
                    <Select value={raiseType} onValueChange={setRaiseType}>
                      <SelectTrigger id="rtype"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rval">{raiseType === "percent" ? "Percent" : "Amount"}</Label>
                    <Input id="rval" inputMode="decimal" className="tabular" value={raiseType === "percent" ? percent : fixed} onChange={(e) => (raiseType === "percent" ? setPercent : setFixed)(e.target.value)} placeholder={raiseType === "percent" ? "10" : "500"} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rdate">Effective from</Label>
                    <Input id="rdate" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rreason">Reason (kept in history)</Label>
                  <Input id="rreason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Performance review 2026" />
                </div>
                {err && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {err}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
                <Button
                  onClick={loadPreview}
                  disabled={busy || !reason.trim() || (who === "tier" ? !tierId : picked.length === 0) || (!percent && !fixed)}
                >
                  {busy ? "Calculating…" : "Preview the cost"}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 2 && preview && (
            <>
              <DialogHeader>
                <DialogTitle>Check before you confirm</DialogTitle>
                <DialogDescription>
                  {preview.affected} {preview.affected === 1 ? "person" : "people"}. Extra cost:{" "}
                  <span className="font-semibold text-foreground">
                    {money(preview.monthlyDelta)}/month ({money(preview.annualDelta)}/year)
                  </span>
                  . Payroll goes from {money(preview.totalOldMonthly)} to {money(preview.totalNewMonthly)} per month.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-72 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Old</TableHead>
                      <TableHead>New</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.items.map((it) => (
                      <TableRow key={it.employeeId}>
                        <TableCell>{it.name}</TableCell>
                        <TableCell className="tabular">{money(it.oldSalary)}</TableCell>
                        <TableCell className="tabular font-medium">{money(it.newSalary)}</TableCell>
                        <TableCell className="tabular">{money(it.newSalary - it.oldSalary)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {it.tierWarning ? (
                            <span className="flex items-center gap-1 text-warning-foreground"><ArrowUpDown className="h-3 w-3" /> {it.tierWarning}</span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.warnings.length > 0 && (
                <ul className="space-y-1 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                  {preview.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              )}
              {preview.items.some((it) => it.tierWarning) && (
                <div className="space-y-1.5">
                  <Label htmlFor="cap">If someone goes above their tier maximum</Label>
                  <Select value={capPolicy} onValueChange={setCapPolicy}>
                    <SelectTrigger id="cap"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAP">Cap them at the maximum</SelectItem>
                      <SelectItem value="ALLOW">Allow it</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {err && (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={confirmRaise} disabled={busy}>
                  {busy ? "Applying…" : "Confirm — do it"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty() {
  return <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>;
}
