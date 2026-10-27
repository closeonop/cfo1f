"use client";

import { useSession } from "@/components/auth-provider";

/** Formats money with the company's locale & currency (en-IN gives lakh/crore grouping). */
export function useMoney() {
  const { company } = useSession();
  return {
    money: (amount: number | null | undefined, opts?: { compact?: boolean; decimals?: boolean }) =>
      moneyFmt(amount, company.currency, company.locale, opts),
    currency: company.currency,
    locale: company.locale,
    salaryPeriod: company.salaryPeriod as "MONTHLY" | "ANNUAL",
  };
}

export function moneyFmt(
  amount: number | null | undefined,
  currency: string,
  locale: string,
  opts?: { compact?: boolean; decimals?: boolean }
): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: opts?.compact ? "compact" : "standard",
      minimumFractionDigits: opts?.decimals === false ? 0 : 2,
      maximumFractionDigits: opts?.decimals === false ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function dateFmt(iso: string | null | undefined, locale = "en-GB"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function numFmt(value: number | null | undefined, locale = "en-GB"): string {
  if (value == null) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

export function pctFmt(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}%`;
}

/** Parses what a human typed into a number: symbols, lakh/crore or thousand grouping, decimal comma. */
export function parseMoneyInput(raw: string): number | null {
  if (!raw.trim()) return null;
  let s = raw.replace(/[\p{Sc}\s]/gu, "");
  if (!/^[+-]?[\d.,]+$/.test(s)) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(".") > s.lastIndexOf(",")) s = s.replace(/,/g, "");
    else s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    const last = s.lastIndexOf(",");
    const decimalComma =
      last >= s.length - 3 && s.indexOf(",") === last && !s.slice(0, last).includes(",");
    s = decimalComma ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
