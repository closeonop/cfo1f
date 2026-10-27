"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, CalendarCheck, CheckSquare, ClipboardList, GraduationCap, HeartHandshake, MessagesSquare, ShieldCheck, UserPlus, Users, Settings, Clock3 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { usePortalSync } from "@/lib/use-portal-sync";
import { useSession } from "@/components/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { groupSlug, visibleModule, humanize, type HrModule } from "@/lib/hr";
import type { Employee } from "@/lib/types";
import { dateFmt } from "@/lib/format";
const ICONS = { Hiring: UserPlus, Performance: ClipboardList, Communication: MessagesSquare, Development: GraduationCap, Rewards: HeartHandshake, Discipline: ShieldCheck, Work: CheckSquare, Leave: CalendarCheck, "Self service": Users, Administration: Settings };
const DESCRIPTIONS: Record<string,string> = {
  Work: "Know the next move. Follow projects, tasks and progress.", Leave: "Make room for time away. Request leave and follow decisions.",
  Hiring: "From first conversation to first day. Keep interviews and onboarding together.", Performance: "Clear expectations, useful evidence and shared reviews.",
  Communication: "Better conversations. Keep feedback and commitments in one place.", Development: "Build what comes next with goals, skills and learning.",
  Rewards: "Recognize the contribution. Keep reward decisions connected to evidence.", Discipline: "Document fairly, hear the employee and agree support.",
  "Self service": "Find policies, request a change or ask HR for help.", Administration: "Set the working hours and policies behind the workspace.",
};
interface FocusItem { id:number; kind:string; title:string; status:string; date:string; group:string; employeeId:number|null }
interface Home { counts:Record<string,number>; focus:FocusItem[]; pendingApprovals:number }
const ORDER=["Work","Leave","Hiring","Performance","Communication","Development","Self service","Rewards","Discipline","Administration"];
export default function PortalPage() {
  const { user } = useSession();
  const [catalog,setCatalog]=useState<HrModule[]>([]),[home,setHome]=useState<Home|null>(null),[employees,setEmployees]=useState<Employee[]>([]);
  const [error,setError]=useState(""),[loading,setLoading]=useState(true),[scope,setScope]=useState("all");
  const load=useCallback(async()=>{
    try { const [c,h,e]=await Promise.all([api<HrModule[]>("/hr/catalog"),api<Home>("/hr/home"),api<Employee[]>("/employees")]);setCatalog(c);setHome(h);setEmployees(e);setError(""); }
    catch(e){setError(e instanceof ApiError?e.message:"Could not refresh your workspace.");}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]); usePortalSync(load);
  const modules=catalog.filter(m=>visibleModule(user,m));
  const groups=ORDER.filter(group=>modules.some(m=>m.group===group));
  const person=employees.find(e=>e.id===user.employeeId);
  const reviewer=["ADMIN","HR","MANAGER"].includes(user.role);
  const queue=(home?.focus??[]).filter(item=>scope!=="mine"||item.employeeId===user.employeeId);
  return <div data-tour-page="portal" data-tour-ready={!loading && !error} className="portal-home mx-auto max-w-6xl space-y-7">
    <header data-tour="page-overview" className="portal-welcome"><div><span className="eyebrow">Employee portal / {user.role === "EMPLOYEE" ? "Your workspace" : "Your team workspace"}</span><h1 className="page-title mt-4">{person?`Hey, ${person.firstName}.`:"Hello, people person."}<br/><span>{user.role==="EMPLOYEE"?"Let’s make today count.":user.role==="CFO"?"People time. Clear numbers.":"Keep good work moving."}</span></h1><p className="mt-4 max-w-lg text-sm">{user.role==="EMPLOYEE"?"Your work, time off and next steps. Everything here follows your employee account.":"A shared picture of work, requests and progress, with access matched to your role."}</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/attendance"><Clock3 aria-hidden="true"/>Open time & attendance<ArrowUpRight aria-hidden="true"/></Link></Button>{user.employeeId&&<Button asChild variant="outline"><Link href="/portal/profile">My personal details</Link></Button>}</div></div><div className="portal-day-card"><span className="eyebrow">At a glance</span><div><strong>{reviewer?home?.pendingApprovals??"—":home?.counts[user.role==="CFO"?"reward":"task"]??"—"}</strong><span>{reviewer?"requests ready for your review":user.role==="CFO"?"reward records in your view":"tasks in your workspace"}</span></div>{reviewer?<Link href="/approvals">Open approval inbox<ArrowRight className="h-4 w-4" aria-hidden="true"/></Link>:<Link href="/portal/leave?module=leave-request">My leave requests<ArrowRight className="h-4 w-4" aria-hidden="true"/></Link>}<p>Shared records · refresh every 30 seconds while this tab is open.</p></div></header>
    {error&&<p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}<Button variant="ghost" size="sm" onClick={()=>void load()}>Retry</Button></p>}
    {!user.employeeId&&<p className="rounded-xl border bg-card p-4 text-sm">This account is not linked to an employee. Admin or CFO can link it in Accounts & roles to enable personal requests and attendance.</p>}
    <section data-tour="portal-next-steps" aria-labelledby="focus-title" className="portal-focus"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow text-primary">Start here</p><h2 id="focus-title" className="mt-2 text-xl font-semibold tracking-tight">What’s on the radar.</h2></div>{reviewer&&user.employeeId&&<div className="flex gap-2"><Button variant={scope==="all"?"secondary":"ghost"} size="sm" aria-pressed={scope==="all"} onClick={()=>setScope("all")}>In my view</Button><Button variant={scope==="mine"?"secondary":"ghost"} size="sm" aria-pressed={scope==="mine"} onClick={()=>setScope("mine")}>Assigned to me</Button></div>}</div>
      {loading?<p role="status" className="py-6 text-sm text-muted-foreground">Loading your next steps…</p>:!queue.length?<p className="py-6 text-sm text-muted-foreground">No open items in this view. Choose a workspace below to get started.</p>:<div className="portal-focus-list">{queue.slice(0,6).map(item=>{const employee=employees.find(e=>e.id===item.employeeId);return <Link key={`${item.kind}-${item.id}`} href={`/portal/${groupSlug(item.group)}?module=${item.kind}${item.employeeId?`&employeeId=${item.employeeId}`:""}`}><span className="focus-dot" aria-hidden="true"/><div className="min-w-0 flex-1"><span className="text-xs text-muted-foreground">{item.group}{employee?` · ${employee.firstName} ${employee.lastName}`:""}</span><h3 className="mt-1 truncate text-sm font-semibold">{item.title}</h3></div><div className="shrink-0 text-right"><Badge variant={item.status==="PENDING"?"warning":"secondary"}>{humanize(item.status||"DRAFT")}</Badge>{item.date&&<p className="mt-1 text-xs text-muted-foreground">{dateFmt(item.date)}</p>}</div><ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true"/></Link>;})}</div>}
    </section>
    <section data-tour="portal-workspaces" aria-labelledby="workspaces-title"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="eyebrow text-muted-foreground">A place for everything</p><h2 id="workspaces-title" className="mt-2 text-2xl font-semibold tracking-tight">Your workspaces.</h2></div><p className="text-xs text-muted-foreground">{groups.length} available for your role</p></div>
    <div className="portal-workspace-grid">{groups.map((group,index)=>{const Icon=ICONS[group as keyof typeof ICONS]??Users;const groupModules=modules.filter(m=>m.group===group);return <Card key={group} className={`workspace-directory ${index===0?"workspace-featured":""}`}><CardContent className="p-6"><div className="flex items-center justify-between gap-4"><span className="portal-icon"><Icon className="h-5 w-5" aria-hidden="true"/></span><span className="eyebrow opacity-60">{String(index+1).padStart(2,"0")}</span></div><h3 className="mt-5 text-xl font-semibold tracking-tight">{group}</h3><p className="mb-5 mt-2 max-w-md text-sm opacity-75">{DESCRIPTIONS[group]}</p><ul className="workspace-section-links">{groupModules.map(m=><li key={m.key}><Link href={`/portal/${groupSlug(group)}?module=${m.key}`}><span>{m.label}</span><span className="ml-auto text-xs tabular opacity-60">{home?.counts[m.key]??"—"}</span><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true"/></Link></li>)}</ul></CardContent></Card>;})}</div></section>
  </div>;
}
