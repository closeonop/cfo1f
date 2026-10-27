"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpDown, Gift } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { FinanceHeader, FinanceMetric } from "@/components/finance-workspace";
import { ActionDisclosure } from "@/components/action-disclosure";
import { usePortalSync } from "@/lib/use-portal-sync";
import { dateFmt, moneyFmt, parseMoneyInput } from "@/lib/format";
import type { Employee, RaiseSummary, ReportTable, Tier } from "@/lib/types";

export default function CompensationPage() {
  const { company, user } = useSession();
  const money = (v: number | null | undefined) => moneyFmt(v, company.currency, company.locale);
  const canApprove = ["ADMIN", "CFO"].includes(user.role);

  const canSeeSalary = canApprove || company.hrCanSeeSalary;
  const [group, setGroup] = useState("tier");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [loaded,setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [review, setReview] = useState<{raise: RaiseSummary; items: {employeeId:number;name:string;oldSalary:number|null;newSalary:number|null;capped:boolean}[]} | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve"|"reject"|"cancel"|null>(null);
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

  const load = useCallback(async () => {
    try {
      const [history, bands, people] = await Promise.all([api<RaiseSummary[]>("/raises"),api<Tier[]>("/tiers"),api<Employee[]>("/employees")]);
      setRaises(history);setTiers(bands);setEmployees(people);
      if (canSeeSalary) {
        const costs=await Promise.all(["tier","role","team"].map(group => api<ReportTable>(`/reports/cost-by?group=${group}`)));
        setCostByTier(costs[0]);setCostByRole(costs[1]);setCostByTeam(costs[2]);
      } else {setCostByTier(null);setCostByRole(null);setCostByTeam(null);}
      setLoadError("");setLoaded(true);
    } catch(e) {setLoadError(e instanceof Error ? e.message : "Could not load compensation.");}
  }, [canSeeSalary]);
  useEffect(() => {void load();}, [load]);
  usePortalSync(load,!wizardOpen && !review && !busy);
  async function openReview(id:number, action:"approve"|"reject"|"cancel"|null) {
    try {setReview(await api(`/raises/${id}`));setReviewAction(action);setErr(null);}
    catch(error) {toast.error(error instanceof Error ? error.message : "Could not load raise details.");}
  }

  function resetWizard() {
    setStep(1);
    setWho("tier");
    setTierId("");
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
      if (raiseType === "percent") body.percent = parseMoneyInput(percent);
      if (raiseType === "fixed") body.fixedAmount = parseMoneyInput(fixed);
      if ((raiseType === "percent" ? body.percent : body.fixedAmount) == null) throw new Error("Enter a valid raise amount.");
      const res = await api<import("@/lib/types").RaisePreview>("/raises/preview", { method: "POST", body });
      setPreview(res);
      setStep(2);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not build the preview.");
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
      if (raiseType === "percent") body.percent = parseMoneyInput(percent);
      if (raiseType === "fixed") body.fixedAmount = parseMoneyInput(fixed);
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
    setBusy(true); setErr(null);
    try {
      await api(`/raises/${id}/${action}`, { method: "POST", body: {} });
      toast.success(action === "approve" ? "Raise approved." : action === "reject" ? "Raise rejected." : "Raise cancelled.");
      setReview(null); await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Action failed.");
    } finally {setBusy(false);}
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

  const currentCost = group === "tier" ? costByTier : group === "role" ? costByRole : costByTeam;
  const total = (column:number) => costByTier?.rows.reduce((sum,row) => sum+Number(row[column]),0) ?? null;
  const base=total(2), variable=total(3), monthly=total(4);
  const filteredRaises=raises.filter(raise => historyFilter === "all" || raise.status === historyFilter);
  const period=company.salaryPeriod === "ANNUAL" ? "year" : "month";
  return (
    <div data-tour-page="compensation" data-tour-ready={loaded && !loadError} className="finance-page">
      <FinanceHeader section="compensation" title="Pay decisions. A clearer picture." description="Understand recurring people costs, review a raise and keep every decision connected to its history." reports={canApprove} action={<Button data-tour="plan-raise-btn" onClick={() => {resetWizard();setWizardOpen(true);}}><Gift aria-hidden="true" />{canApprove ? "Plan a raise" : "Propose a raise"}</Button>} />
      {loadError && <div role="alert" className="finance-error">{loadError} <Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}
      {canSeeSalary ? <>
        <section className="finance-metrics" aria-label="Current compensation overview"><FinanceMetric label="Monthly recurring cost" value={money(monthly)} note={`${total(1) ?? "—"} active people · base + recurring variable pay`} accent /><FinanceMetric label="Monthly base" value={money(base)} note={`Normalized from ${company.salaryPeriod.toLowerCase()} base salaries.`} /><FinanceMetric label="Monthly variable" value={money(variable)} note="Current recurring components. One-time pay excluded." /></section>
        <section className="finance-panel"><div className="finance-toolbar"><div><h2>Where the monthly cost sits.</h2><p className="mt-1 text-sm text-muted-foreground">One shared view, grouped the way you need.</p></div><div><Label htmlFor="cost-group" className="sr-only">Group costs by</Label><select id="cost-group" className="rounded-xl border bg-background px-4 py-3 text-sm" value={group} onChange={e => setGroup(e.target.value)}><option value="tier">By pay band</option><option value="role">By job role</option><option value="team">By team</option></select></div></div>
          {monthly != null && monthly > 0 && <><div className="finance-allocation" aria-hidden="true"><span style={{width:`${(base ?? 0)/monthly*100}%`}} /><span style={{width:`${(variable ?? 0)/monthly*100}%`}} /></div><p className="mb-4 text-xs text-muted-foreground">Violet: base pay · Lime: recurring variable pay</p></>}
          {currentCost ? currentCost.rows.length ? costTable(currentCost) : <p className="finance-empty">No active employees to include yet.</p> : <p role="status" className="finance-empty">Loading the cost breakdown…</p>}
        </section>
      </> : <section className="finance-panel"><h2>Prepare the proposal. Finance reviews the figures.</h2><p>Your account can propose an increase for selected people. Current salaries and cost totals remain hidden while HR salary access is off.</p></section>}
      <section data-tour="raise-history" className="finance-panel"><div className="finance-toolbar"><div><h2>Raise decisions &amp; history</h2><p className="mt-1 text-sm text-muted-foreground">{raises.filter(raise => raise.status === "PENDING").length} awaiting Finance · {raises.filter(raise => raise.status === "APPROVED").length} scheduled</p></div><div><Label htmlFor="raise-status" className="sr-only">Filter raise status</Label><select id="raise-status" className="rounded-xl border bg-background px-4 py-3 text-sm" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}><option value="all">All decisions</option>{["PENDING","APPROVED","APPLIED","REJECTED","CANCELLED"].map(status => <option key={status} value={status}>{status === "PENDING" ? "Awaiting approval" : status === "APPROVED" ? "Scheduled" : status.charAt(0)+status.slice(1).toLowerCase()}</option>)}</select></div></div>
        {!filteredRaises.length ? <p className="finance-empty mt-5">No raises in this view. Plan a raise to preview its impact.</p> : <div className="mt-5"><Table><TableHeader><TableRow><TableHead>People &amp; reason</TableHead><TableHead>Change / {period}</TableHead><TableHead>Effective</TableHead><TableHead>Monthly impact</TableHead><TableHead>Status</TableHead><TableHead>Details</TableHead></TableRow></TableHeader><TableBody>{filteredRaises.map(raise => <TableRow key={raise.id}><TableCell><strong className="font-medium">{raise.scopeNote ?? `${raise.itemCount} people`}</strong><p className="mt-1 max-w-72 whitespace-normal text-xs text-muted-foreground">{raise.reason}</p></TableCell><TableCell className="tabular">{raise.percent != null ? `${raise.percent}%` : money(raise.fixedAmount)}</TableCell><TableCell>{dateFmt(raise.effectiveDate,company.locale)}</TableCell><TableCell className="tabular">{money(raise.monthlyDelta)}</TableCell><TableCell><Badge variant={raise.status === "APPLIED" ? "success" : raise.status === "PENDING" ? "warning" : "secondary"}>{raise.status === "PENDING" ? "Awaiting approval" : raise.status === "APPROVED" ? "Scheduled" : raise.status.charAt(0)+raise.status.slice(1).toLowerCase()}</Badge></TableCell><TableCell><ActionDisclosure label={`Options for raise ${raise.id}`}><Button variant="outline" size="sm" onClick={() => void openReview(raise.id,null)}>View details</Button>{canApprove && raise.status === "PENDING" && <><Button size="sm" onClick={() => void openReview(raise.id,"approve")}>Review &amp; approve</Button><Button variant="outline" size="sm" onClick={() => void openReview(raise.id,"reject")}>Reject proposal</Button></>}{canApprove && ["PENDING","APPROVED"].includes(raise.status) && <Button variant="ghost" size="sm" onClick={() => void openReview(raise.id,"cancel")}>Cancel raise</Button>}</ActionDisclosure></TableCell></TableRow>)}</TableBody></Table></div>}
      </section>
      <p className="text-xs text-muted-foreground">Figures refresh every 30 seconds while this page is visible. Scheduled raises apply on their effective date. These records do not transfer money.</p>
      <Dialog open={!!review} onOpenChange={open => {if(!open) setReview(null);}}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{reviewAction ? `${reviewAction.charAt(0).toUpperCase()+reviewAction.slice(1)} this raise?` : "Raise details"}</DialogTitle><DialogDescription>{review?.raise.reason} · Effective {dateFmt(review?.raise.effectiveDate,company.locale)}. Monthly impact: {money(review?.raise.monthlyDelta)}.</DialogDescription></DialogHeader><div className="max-h-80 overflow-auto"><Table><TableHeader><TableRow><TableHead>Person</TableHead><TableHead>Old base / {period}</TableHead><TableHead>New base / {period}</TableHead><TableHead>Note</TableHead></TableRow></TableHeader><TableBody>{review?.items.map(item => <TableRow key={item.employeeId}><TableCell>{item.name}</TableCell><TableCell className="tabular">{money(item.oldSalary)}</TableCell><TableCell className="tabular">{money(item.newSalary)}</TableCell><TableCell>{item.capped ? "Band cap applied" : "—"}</TableCell></TableRow>)}</TableBody></Table></div>{reviewAction === "approve" && <p className="text-sm text-muted-foreground">Approval applies the recorded changes now if due, or schedules them for the effective date.</p>}{err && <p className="text-sm text-destructive" role="alert">{err}</p>}<DialogFooter><Button variant="outline" onClick={() => setReview(null)}>Close</Button>{reviewAction && review && <Button disabled={busy} onClick={() => void act(review.raise.id,reviewAction)}>{busy ? "Saving…" : `Confirm ${reviewAction}`}</Button>}</DialogFooter></DialogContent></Dialog>

      {/* ---- raise wizard ---- */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent data-tour="raises-editor" className="sm:max-w-2xl">
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>{canApprove ? "Plan a raise" : "Propose a raise"} — who and how much?</DialogTitle>
                <DialogDescription>{canSeeSalary ? "Preview the cost before any salary changes." : "Choose people and an increase. Finance reviews pay figures."} Fixed amounts are base pay per {period}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="who">Who gets it</Label>
                    <Select value={who} onValueChange={setWho}>
                      <SelectTrigger data-tour="raise-scope" id="who"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger data-tour="raise-type" id="rtype"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rval">{raiseType === "percent" ? "Percent" : "Amount"}</Label>
                    <Input data-tour="raise-value" id="rval" inputMode="decimal" className="tabular" value={raiseType === "percent" ? percent : fixed} onChange={(e) => (raiseType === "percent" ? setPercent : setFixed)(e.target.value)} placeholder={raiseType === "percent" ? "10" : "500"} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rdate">Effective from</Label>
                    <Input data-tour="raise-date" id="rdate" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="cap">If a raise exceeds the pay-band maximum</Label><Select value={capPolicy} onValueChange={setCapPolicy}><SelectTrigger data-tour="raise-cap" id="cap"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CAP">Cap at the maximum</SelectItem><SelectItem value="ALLOW">Allow above the maximum</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5">
                  <Label htmlFor="rreason">Reason (kept in history)</Label>
                  <Input data-tour="raise-reason" id="rreason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Performance review 2026" />
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
                  data-tour="raise-preview" onClick={loadPreview}
                  disabled={busy || !effective || !reason.trim() || (who === "tier" ? !tierId : picked.length === 0) || !(raiseType === "percent" ? percent.trim() : fixed.trim())}
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
                  {preview.affected} {preview.affected === 1 ? "person" : "people"}. {canSeeSalary ? `Extra cost: ${money(preview.monthlyDelta)}/month (${money(preview.annualDelta)}/year).` : "Pay figures are hidden. Finance will review the amounts."} Band policy: {capPolicy === "CAP" ? "Cap at maximum" : "Allow above maximum"}.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-72 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Old base / {period}</TableHead>
                      <TableHead>New base / {period}</TableHead>
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
                        <TableCell className="tabular">{money(it.newSalary == null || it.oldSalary == null ? null : it.newSalary - it.oldSalary)}</TableCell>
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
              {err && (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={confirmRaise} disabled={busy}>
                  {busy ? "Applying…" : canApprove ? "Confirm raise" : "Submit proposal"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
