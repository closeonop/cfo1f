"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
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
import { api, downloadFile } from "@/lib/api";
import { moneyFmt } from "@/lib/format";
import type { ReportTable } from "@/lib/types";

const REPORTS = [
  { value: "payroll-summary", label: "Payroll cost summary" },
  { value: "cost-by-tier", label: "Cost by tier" },
  { value: "cost-by-role", label: "Cost by job role" },
  { value: "cost-by-team", label: "Cost by team" },
  { value: "salary-history", label: "Salary history" },
  { value: "variable-pay", label: "Variable pay summary" },
] as const;

type ReportName = (typeof REPORTS)[number]["value"];

export default function ReportsPage() {
  const { company } = useSession();
  const money = (v: unknown) =>
    typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)))
      ? moneyFmt(Number(v), company.currency, company.locale)
      : String(v ?? "—");

  const [report, setReport] = useState<ReportName>("payroll-summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [table, setTable] = useState<ReportTable | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (report === "payroll-summary") params.set("months", "12");
    const qs = params.toString();
    setTable(null);
    setBusy(true);
    api<ReportTable>(`/reports/${report}${qs ? `?${qs}` : ""}`)
      .then(setTable)
      .catch(() => toast.error("Could not load the report."))
      .finally(() => setBusy(false));
  }, [report, from, to]);

  useEffect(query, [query]);

  async function exportCsv() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      await downloadFile(`/reports/${report}/csv${params.toString() ? `?${params}` : ""}`, `${report}.csv`);
      toast.success("Report downloaded.");
    } catch {
      toast.error("Download failed.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Pick a report, filter by date, export when ready.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download aria-hidden="true" /> Export to CSV
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <Select value={report} onValueChange={(v) => setReport(v as ReportName)}>
          <SelectTrigger className="w-64" aria-label="Report type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORTS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(report === "salary-history") && (
          <>
            <div>
              <Label htmlFor="from" className="sr-only">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            </div>
            <div>
              <Label htmlFor="to" className="sr-only">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
            </div>
          </>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{REPORTS.find((r) => r.value === report)?.label}</CardTitle>
          <CardDescription>
            {report === "payroll-summary" && "Total base pay cost per month, over the last 12 months."}
            {report.startsWith("cost-by") && "Active people grouped by tier, role, or team, with monthly cost."}
            {report === "salary-history" && "Every pay change in the period — old, new, and why."}
            {report === "variable-pay" && "Bonuses, commissions and other components currently active."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {busy ? (
            <div className="animate-pulse py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : table == null || table.rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No data for this report yet.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.columns.map((c) => (
                      <TableHead key={c}>{c.replace(/_/g, " ")}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => {
                        const isMoney = table.columns[j].includes("cost") || table.columns[j].includes("salary") || table.columns[j] === "total_monthly" || table.columns[j] === "value";
                        const isMoneyCol = isMoney && !(table.columns[j] === "percent");
                        return (
                          <TableCell key={j} className={isMoneyCol ? "tabular" : ""}>
                            {isMoneyCol && cell !== null && cell !== "" && !isNaN(Number(cell))
                              ? money(Number(cell))
                              : String(cell ?? "—")}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
