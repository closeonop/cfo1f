export const FINANCE_REPORTS = [
  { value:"payroll-summary", label:"Payroll snapshot", description:"Monthly base pay at month end. Not prorated payroll." },
  { value:"cost-by-tier", label:"Cost by pay band", description:"Current monthly base and recurring variable pay." },
  { value:"cost-by-role", label:"Cost by job role", description:"Compare monthly cost across job roles." },
  { value:"cost-by-team", label:"Cost by team", description:"See where current monthly spend sits." },
  { value:"salary-history", label:"Salary history", description:"Recorded pay changes, reasons and reversals." },
  { value:"variable-pay", label:"Variable pay", description:"Current components, rates and monthly equivalents." },
] as const;
export type FinanceReport = typeof FINANCE_REPORTS[number]["value"];

/** JSON and CSV use the same grouping and filters. */
export function financeReportPath(report: FinanceReport, from = "", to = "", csv = false) {
  const params = new URLSearchParams();
  if (report === "salary-history") { if (from) params.set("from",from); if (to) params.set("to",to); }
  if (report === "payroll-summary") params.set("months","12");
  let path = report as string;
  if (!csv && report.startsWith("cost-by-")) { path="cost-by"; params.set("group",report.slice(8)); }
  return `/reports/${path}${csv ? "/csv" : ""}${params.size ? `?${params}` : ""}`;
}

export function reportCellKind(column: string, row: (string | number | null)[], columns: string[]) {
  if (column === "percent" || column === "value" && row[columns.indexOf("calc_type")] === "PERCENT") return "percent";
  return /cost|salary|monthly|^value$/.test(column) ? "money" : "text";
}
