import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

const sections = [["tiers", "Pay bands"], ["roles", "Job roles"], ["compensation", "Compensation"], ["reports", "Reports"]] as const;

export function FinanceHeader({ section, title, description, action, reports = true }: {
  section: string; title: string; description: string; action?: ReactNode; reports?: boolean;
}) {
  return <header data-tour="page-overview" className="finance-header">
    <div className="finance-heading"><div><p className="eyebrow text-primary">People &amp; finance / {sections.find(([key]) => key === section)?.[1]}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>
    <nav aria-label="People and finance" className="finance-nav">{sections.filter(([key]) => reports || key !== "reports").map(([key, label]) => <Link key={key} href={`/${key}`} aria-current={section === key ? "page" : undefined}>{label}<ArrowUpRight aria-hidden="true" /></Link>)}</nav>
  </header>;
}

export function FinanceMetric({ label, value, note, accent = false }: { label: string; value: ReactNode; note: string; accent?: boolean }) {
  return <div className={`finance-metric${accent ? " finance-metric-accent" : ""}`}><span className="eyebrow">{label}</span><strong className="tabular">{value}</strong><p>{note}</p></div>;
}
