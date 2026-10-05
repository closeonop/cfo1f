// API types mirroring the Spring Boot backend (emp mg2)

export type AccessRole = "ADMIN" | "CFO" | "HR" | "MANAGER" | "EMPLOYEE";

export interface User {
  id: number;
  email: string;
  role: AccessRole;
  companyId: number;
  employeeId: number | null;
}

export interface Company {
  id: number;
  name: string;
  currency: string;
  locale: string;
  salaryPeriod: "MONTHLY" | "ANNUAL";
  roundingRule: "NONE" | "NEAREST_1" | "NEAREST_10" | "NEAREST_100";
  hrCanSeeSalary: boolean;
}

export interface Employee {
  id: number;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobRoleId: number | null;
  jobRole: string | null;
  tierId: number | null;
  tier: string | null;
  tierMin: number | null;
  tierMax: number | null;
  tierColor: string | null;
  managerId: number | null;
  manager: string | null;
  team: string | null;
  startDate: string;
  status: "ACTIVE" | "INACTIVE";
  baseSalary: number | null;
  salaryOutsideTier: "ABOVE" | "BELOW" | null;
}

export interface Tier {
  id: number;
  name: string;
  description: string | null;
  minSalary: number | null;
  maxSalary: number | null;
  color: string | null;
  sortOrder: number;
  archived: boolean;
}

export interface TierStat {
  id: number;
  name: string;
  color: string | null;
  headcount: number;
  totalMonthlyCost: number | null;
  averageSalary: number | null;
  minSalary: number | null;
  maxSalary: number | null;
}

export interface JobRole {
  id: number;
  name: string;
  defaultTierId: number | null;
  defaultTierName: string | null;
  minSalary: number | null;
  maxSalary: number | null;
  defaultComponents: string | null;
  archived: boolean;
}

export interface ComponentView {
  id: number;
  name: string;
  calcType: "FIXED" | "PERCENT" | "TARGET";
  value: number;
  period: "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

export interface HistoryView {
  id: number;
  effectiveDate: string;
  oldSalary: number;
  newSalary: number;
  percent: number | null;
  reason: string | null;
  changedBy: string | null;
  isReversal: boolean;
  reversalOfId: number | null;
}

export interface CompensationView {
  baseSalary: number | null;
  salaryPeriod: string;
  components: ComponentView[];
  variableMonthly: number | null;
  oneTimeTotal: number | null;
  totalMonthly: number | null;
  history: HistoryView[];
  tierWarning: string | null;
}

export interface RaiseSummary {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "APPLIED" | "CANCELLED";
  percent: number | null;
  fixedAmount: number | null;
  effectiveDate: string;
  reason: string;
  scopeNote: string | null;
  itemCount: number;
  totalOldMonthly: number | null;
  totalNewMonthly: number | null;
  monthlyDelta: number | null;
  createdAt: string;
  cappedCount: number;
}

export interface PreviewItem {
  employeeId: number;
  name: string;
  tier: string | null;
  oldSalary: number;
  newSalary: number;
  percentApplied: number | null;
  capped: boolean;
  tierWarning: string | null;
  tierChanged: boolean | null;
}

export interface RaisePreview {
  items: PreviewItem[];
  affected: number;
  totalOldMonthly: number;
  totalNewMonthly: number;
  monthlyDelta: number;
  annualDelta: number;
  warnings: string[];
}

export interface ImportRow {
  row: number;
  data: Record<string, string>;
  action: "CREATE" | "UPDATE" | "SKIP" | "ERROR";
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  columns: string[];
  mapping: Record<string, string>;
  rows: ImportRow[];
  create: number;
  update: number;
  skip: number;
  error: number;
}

export interface ImportResult {
  batchId: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface ImportBatchInfo {
  id: number;
  fileName: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  undone: boolean;
  createdAt: string;
}

export interface Dashboard {
  totalEmployees: number;
  totalMonthlyCost: number | null;
  byTier: { id: number | null; name: string; color: string | null; headcount: number; monthlyCost: number | null }[];
  upcomingRaises: { id: number; status: string; effectiveDate: string; scopeNote: string | null; affected: number; monthlyDelta: number | null }[];
  recentChanges: { action: string; actor: string | null; at: string; detail: string | null }[];
}

export interface ReportTable {
  columns: string[];
  rows: (string | number | null)[][];
  totals: unknown;
}

export interface AuditEntry {
  id: number;
  action: string;
  actor: string | null;
  entityType: string | null;
  entityId: string | null;
  detail: string | null;
  ip: string | null;
  at: string;
}
