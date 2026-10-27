"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FinanceHeader } from "@/components/finance-workspace";
import { useSession } from "@/components/auth-provider";
import { api, downloadFile } from "@/lib/api";
import { dateFmt, moneyFmt, pctFmt } from "@/lib/format";
import { FINANCE_REPORTS, financeReportPath, reportCellKind, type FinanceReport } from "@/lib/finance";
import type { ReportTable } from "@/lib/types";

export default function ReportsPage() {
  const { company } = useSession();
  const [report,setReport] = useState<FinanceReport>("payroll-summary");
  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [table,setTable] = useState<ReportTable | null>(null);
  const [busy,setBusy] = useState(false);
  const [exporting,setExporting] = useState(false);
  const [error,setError] = useState("");
  const [revision,setRevision] = useState(0);
  const [loadedAt,setLoadedAt] = useState("");
  const invalidDates = report === "salary-history" && !!from && !!to && from > to;
  const path = financeReportPath(report,from,to);
  useEffect(() => {
    let active = true;
    setTable(null); setError("");
    if (invalidDates) { setBusy(false); return; }
    setBusy(true);
    api<ReportTable>(path).then(result => {if(active) {setTable(result);setLoadedAt(new Date().toLocaleTimeString(company.locale,{hour:"2-digit",minute:"2-digit"}));}})
      .catch(e => {if(active) setError(e instanceof Error ? e.message : "Could not load this report.");})
      .finally(() => {if(active) setBusy(false);});
    return () => {active=false;};
  }, [path,invalidDates,revision,company.locale]);

  async function exportCsv() {
    setExporting(true);
    try {await downloadFile(financeReportPath(report,from,to,true),`${report}.csv`);toast.success("Report downloaded.");}
    catch(e) {toast.error(e instanceof Error ? e.message : "Download failed.");}
    finally {setExporting(false);}
  }
  const selected = FINANCE_REPORTS.find(item => item.value === report)!;
  function cell(value: string | number | null, column: string, row: (string | number | null)[], columns: string[]) {
    if (value == null || value === "") return "—";
    const kind = reportCellKind(column,row,columns);
    if (kind !== "text" && Number.isFinite(Number(value))) return kind === "percent" ? pctFmt(Number(value)) : moneyFmt(Number(value),company.currency,company.locale);
    if (column === "effective_date") return dateFmt(String(value),company.locale);
    return String(value);
  }
  return <div data-tour-page="reports" data-tour-ready={!busy && !error && !!table} className="finance-page">
    <FinanceHeader section="reports" title="The numbers, with the context." description="Explore your people costs, trace pay changes and export the same figures you see here." action={<Button data-tour="report-export" variant="outline" disabled={busy || exporting || invalidDates || !table?.rows.length} onClick={() => void exportCsv()}><Download aria-hidden="true" />{exporting ? "Exporting…" : "Export CSV"}</Button>} />
    <section data-tour="report-choices" className="report-chooser" aria-label="Choose a report">{FINANCE_REPORTS.map(item => <button key={item.value} className="report-choice" aria-pressed={report === item.value} onClick={() => setReport(item.value)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</section>
    {report === "salary-history" && <section className="finance-panel" aria-label="History date range"><div className="flex flex-wrap items-end gap-4"><div><Label htmlFor="report-from">From date</Label><Input id="report-from" className="mt-2" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div><div><Label htmlFor="report-to">To date</Label><Input id="report-to" className="mt-2" type="date" min={from || undefined} value={to} onChange={e => setTo(e.target.value)} /></div><Button variant="ghost" onClick={() => {setFrom("");setTo("");}}>Clear dates</Button></div>{invalidDates && <p role="alert" className="mt-3 text-sm text-destructive">The end date must be on or after the start date.</p>}</section>}
    <section data-tour="report-results" className="finance-panel" aria-busy={busy}>
      <div className="finance-toolbar"><div><h2>{selected.label}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.description}</p></div><Button variant="ghost" size="sm" disabled={busy || invalidDates} onClick={() => setRevision(value => value+1)}><RefreshCw aria-hidden="true" />Refresh</Button></div>
      <div className="my-4 flex flex-wrap justify-between gap-2 border-b pb-4 text-xs text-muted-foreground"><span>{table ? `${table.rows.length} records` : "Report preview"} · {company.currency}</span><span>{table ? `Snapshot at ${loadedAt}. Refresh for latest data.` : "Salary access is checked by the server."}</span></div>
      {error ? <div className="finance-error" role="alert">{error}</div> : invalidDates ? <p className="finance-empty">Choose a valid date range to view this report.</p> : busy ? <p className="finance-empty" role="status">Preparing your report…</p> : !table?.rows.length ? <p className="finance-empty">No records for this report{report === "salary-history" ? " in the selected date range" : " yet"}.</p> : <div className="max-h-[65vh] overflow-auto"><Table><TableHeader><TableRow>{table.columns.map(column => <TableHead key={column}>{column === "base_cost_monthly" || column === "base_cost_annual" ? "Monthly base cost" : column.replace(/_/g," ")}</TableHead>)}</TableRow></TableHeader><TableBody>{table.rows.map((row,i) => <TableRow key={i}>{row.map((value,j) => <TableCell key={j} className={`${reportCellKind(table.columns[j],row,table.columns) !== "text" ? "tabular" : ""} max-w-80 break-words`}>{cell(value,table.columns[j],row,table.columns)}</TableCell>)}</TableRow>)}</TableBody></Table></div>}
    </section>
    <p className="text-xs text-muted-foreground">Current costs exclude inactive employees and one-time pay. Payroll snapshots use month-end base rates, without attendance deductions, taxes or proration. Historical employment status is approximated from the latest inactive update.</p>
  </div>;
}
