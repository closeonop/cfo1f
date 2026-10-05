"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock, History, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Dashboard as DashboardData } from "@/lib/types";
import { dateFmt, moneyFmt, useMoney } from "@/lib/format";
import { useSession } from "@/components/auth-provider";

const CHANGE_LABELS: Record<string, string> = {
  LOGIN: "Signed in",
  LOGIN_FAILED: "Failed sign-in",
  EMPLOYEE_CREATED: "Employee added",
  EMPLOYEE_UPDATED: "Employee edited",
  EMPLOYEE_DEACTIVATED: "Employee deactivated",
  EMPLOYEE_ACTIVATED: "Employee reactivated",
  EMPLOYEES_IMPORTED: "CSV import done",
  IMPORT_UNDONE: "CSV import undone",
  EMPLOYEES_EXPORTED: "Employee list exported",
  EMPLOYEES_EXPORTED_WITH_SALARY: "Employee list exported (with pay)",
  EMPLOYEES_TIER_ASSIGNED: "People moved between tiers",
  TIER_CREATED: "Tier created",
  TIER_UPDATED: "Tier edited",
  TIER_ARCHIVED: "Tier archived",
  RAISE_PROPOSED: "Raise proposed",
  RAISE_APPROVED: "Raise approved",
  RAISE_APPLIED: "Raise applied",
  RAISE_CANCELLED: "Raise cancelled",
  RAISE_CREATED_APPROVED: "Raise given",
  SALARY_REVERSED: "Salary change reversed",
  COMPONENT_CREATED: "Pay component added",
  COMPONENT_DELETED: "Pay component removed",
  COMPENSATION_VIEWED: "Pay details viewed",
  REPORT_VIEWED: "Report opened",
  SETTINGS_UPDATED: "Settings changed",
  USER_CREATED: "Sign-in created",
};

export default function DashboardPage() {
  const { money } = useMoney();
  const { user, company } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    api<DashboardData>("/dashboard").then(setData).catch(() => setError(true));
  }, []);

  const tierData = (data?.byTier ?? [])
    .filter((t) => t.headcount > 0)
    .map((t) => ({ name: t.name, people: t.headcount, cost: t.monthlyCost }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{company.name} at a glance.</p>
      </header>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            Couldn&apos;t load the dashboard. <button className="underline" onClick={() => location.reload()}>Retry</button>
          </CardContent>
        </Card>
      )}

      {!data && !error && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64 sm:col-span-2" />
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular">{data.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">active people</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total monthly payroll cost
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular">
                  {data.totalMonthlyCost != null ? money(data.totalMonthlyCost) : "Hidden"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.totalMonthlyCost != null
                    ? `≈ ${money(data.totalMonthlyCost * 12, { decimals: false, compact: true })} a year`
                    : "You don't have access to pay figures"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Headcount and cost by tier</CardTitle>
              <CardDescription>Where your people sit, and what each tier costs each month.</CardDescription>
            </CardHeader>
            <CardContent>
              {tierData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No tiers with people yet.{" "}
                  {["ADMIN", "CFO", "HR"].includes(user.role) && (
                    <Link href="/tiers" className="text-primary underline">
                      Create a tier
                    </Link>
                  )}
                </p>
              ) : (
                <div className="h-64" role="img" aria-label={`Bar chart of headcount and monthly cost per tier. ${tierData.map((t) => `${t.name}: ${t.people} people${t.cost != null ? `, ${money(t.cost)}` : ""}`).join("; ")}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tierData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis yAxisId="people" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                      <YAxis yAxisId="cost" orientation="right" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => money(v, { compact: true, decimals: false })} width={80} />
                      <Tooltip
                        formatter={(value, name) =>
                          name === "cost" ? [money(value as number), "Monthly cost"] : [value, "People"]
                        }
                        cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                      />
                      <Bar yAxisId="people" dataKey="people" name="people" fill="var(--primary)" radius={[6, 6, 0, 0]} isAnimationActive={!reduceMotion} />
                      {data.totalMonthlyCost != null && (
                        <Bar yAxisId="cost" dataKey="cost" name="cost" fill="var(--accent)" stroke="var(--primary)" strokeDasharray="4 2" radius={[6, 6, 0, 0]} isAnimationActive={!reduceMotion} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">Upcoming raises</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.upcomingRaises.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
                ) : (
                  data.upcomingRaises.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <div className="font-medium">{r.scopeNote ?? "Raise"}</div>
                        <div className="text-xs text-muted-foreground">Effective {dateFmt(r.effectiveDate, company.locale)}</div>
                      </div>
                      <Badge variant={r.status === "APPROVED" ? "success" : "warning"}>
                        {r.status === "APPROVED" ? "Approved" : "Needs your approval"}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
                <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">Recent changes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {data.recentChanges.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-3">
                      <span>
                        {CHANGE_LABELS[c.action] ?? c.action}
                        {c.actor && <span className="text-muted-foreground"> — {c.actor}</span>}
                      </span>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat(company.locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(c.at))}
                      </time>
                    </li>
                  ))}
                  {data.recentChanges.length === 0 && (
                    <li className="text-muted-foreground">Nothing has happened yet.</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
