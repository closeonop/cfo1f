"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { moneyFmt } from "@/lib/format";
import type { CompensationView } from "@/lib/types";

/** Employee self-service: see your own pay, clearly broken down. */
export default function MyCompensationPage() {
  const { company, user } = useSession();
  const money = (v: number | null | undefined) => moneyFmt(v, company.currency, company.locale);
  const [comp, setComp] = useState<CompensationView | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (user.employeeId == null) return;
    api<CompensationView>(`/employees/${user.employeeId}/compensation`)
      .then(setComp)
      .catch(() => setErr(true));
  }, [user.employeeId]);

  return (
    <div data-tour-page="my-pay" data-tour-ready={!!comp && !err} className="mx-auto max-w-3xl space-y-6">
      <header data-tour="page-overview">
        <h1 className="text-2xl font-semibold tracking-tight">My pay</h1>
        <p className="text-sm text-muted-foreground">Only you and Finance can see this page.</p>
      </header>

      {user.employeeId == null ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Your sign-in isn&apos;t linked to an employee record yet. Ask your administrator to link it
            (Settings → create your account with your employee record).
          </CardContent>
        </Card>
      ) : err ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">Couldn&apos;t load your pay details.</CardContent>
        </Card>
      ) : !comp ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <Card data-tour="my-pay-summary">
            <CardHeader>
              <CardTitle className="text-base">Your monthly pay</CardTitle>
              <CardDescription>Base salary plus anything variable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-4xl font-semibold tabular">{money(comp.totalMonthly)}</div>
              <p className="text-sm text-muted-foreground">
                base {money(comp.baseSalary)} + variable {money(comp.variableMonthly)}
              </p>
            </CardContent>
          </Card>

          {comp.history.length > 0 && (
            <Card data-tour="my-pay-history">
              <CardHeader>
                <CardTitle className="text-base">Your pay history</CardTitle>
                <CardDescription>Every change, with the reason.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {comp.history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                      <span>
                        <span className="tabular font-medium">
                          {money(h.oldSalary)} → {money(h.newSalary)}
                        </span>
                        {h.reason && <span className="text-muted-foreground"> — {h.reason}</span>}
                      </span>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat(company.locale, { dateStyle: "medium" }).format(new Date(h.effectiveDate))}
                      </time>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
