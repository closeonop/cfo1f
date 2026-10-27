"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Plus, Pencil, ArrowLeft, Check, Upload } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { api, ApiError, downloadFile } from "@/lib/api";
import { canWrite, groupSlug, visibleModule, manages, isHr, humanize, type HrModule, type HrRecord } from "@/lib/hr";
import type { Employee, JobRole } from "@/lib/types";
import { useSession } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { ActionDisclosure } from "@/components/action-disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { dateFmt } from "@/lib/format";
import { usePortalSync } from "@/lib/use-portal-sync";
const WORKFLOW:Record<string,string[]>={Hiring:["Open a role","Schedule the interview","Welcome your new hire"],Performance:["Define position metrics","Record evidence","Share a scored review"],Communication:["Set expectations","Share useful feedback","Hear the employee"],Development:["Set a goal","Plan the learning","Track progress"],Rewards:["Recognize the work","Link review evidence","Record the reward"],Discipline:["Set a fair policy","Document both sides","Agree support"],Work:["Create a project","Assign clear tasks","Track time & finish"],Leave:["Check the balance","Request time away","Manager reviews"],"Self service":["Choose your request","Share the details","Follow the reply"],Administration:["Set working hours","Choose your timezone","Save company policy"]};
const control = "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";
interface Insights { taskHours: Record<string,number>; today: string; positive: number; constructive: number; nextDisciplineStep?: string; trend: {date:string;score:number;employeeId:number}[]; disciplineConsistency: Record<string, Record<string,number>>; workload: Record<string, number>; missedDeadlines: HrRecord[] }
interface LeaveBalance { employeeId:number; title:string; year:number; allowance:number; used:number; remaining:number }
export function HrWorkspace({ group }: { group: string }) {
  const searchParams=useSearchParams();
  const router=useRouter();
  const { user } = useSession();
  const [catalog,setCatalog]=useState<HrModule[]>([]);
  const [selected,setSelected]=useState("");
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [positions,setPositions]=useState<JobRole[]>([]);
  const [records,setRecords]=useState<HrRecord[]>([]);
  const [refs,setRefs]=useState<Record<string,HrRecord[]>>({});
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [editor,setEditor]=useState<{record:HrRecord|null}|null>(null);
  const [saving,setSaving]=useState(false);
  const [action,setAction]=useState<{record:HrRecord;type:string}|null>(null);
  const [note,setNote]=useState("");
  const [insights,setInsights]=useState<Insights|null>(null);
  const [balances,setBalances]=useState<LeaveBalance[]>([]);
  const [taskView,setTaskView]=useState("all");
  const loadSequence=useRef(0);
  function changeSection(key:string){
    setSelected(key);setSearch("");setError("");
    const params=new URLSearchParams(searchParams.toString());params.set("module",key);
    if(filter==="all")params.delete("employeeId");else params.set("employeeId",filter);
    router.replace(`/portal/${group}?${params}`,{scroll:false});
  }
  useEffect(()=>{const id=searchParams.get("employeeId");setFilter(id&&/^\d+$/.test(id)?id:"all");setSelected(searchParams.get("module")??"");},[group,searchParams]);
  const modules=catalog.filter(m=>groupSlug(m.group)===group&&visibleModule(user,m));
  const module=modules.find(m=>m.key===selected)??modules[0];
  useEffect(()=>{
    let alive=true; setLoading(true);setError("");
    Promise.all([api<HrModule[]>("/hr/catalog"),api<Employee[]>("/employees"),api<JobRole[]>("/job-roles")])
      .then(([c,e,p])=>{if(alive){setCatalog(c);setEmployees(e);setPositions(p);}})
      .catch(()=>{if(alive)setError("Could not load the workspace. Check the API and try again.");}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[group]);
  const load=useCallback(async()=>{
    if(!module)return;
    const sequence=++loadSequence.current;
    setLoading(true);setError("");
    try {
      const needed=[...new Set([...module.fields.map(f=>f.reference).filter((r):r is string=>!!r&&r!=="position"&&r!=="employee"),...(module.key==="review"?["metric"]:[])])];
      const [r,related,balance,insight]=await Promise.all([
        api<HrRecord[]>(`/hr/records/${module.key}${filter!=="all"?`?employeeId=${filter}`:""}`),
        Promise.all(needed.map(async kind=>[kind,await api<HrRecord[]>(module.key==="reward"&&kind==="review"&&user.role==="CFO"?"/hr/reward-reviews":`/hr/records/${kind}`)] as const)),
        module.group==="Leave"?api<LeaveBalance[]>("/hr/leave-balances"):Promise.resolve([]),
        ["Performance","Discipline","Communication","Work"].includes(module.group)?api<Insights>(`/hr/insights${filter!=="all"?`?employeeId=${filter}`:""}`):Promise.resolve(null)
      ]);
      if(sequence!==loadSequence.current)return;
      setRecords(r);setRefs(Object.fromEntries(related));setBalances(balance);setInsights(insight);
    }catch(e){if(sequence===loadSequence.current){setError(e instanceof ApiError?e.message:"Could not load records. Try again.");setRecords([]);}}finally{if(sequence===loadSequence.current)setLoading(false);}
  },[module,filter,user.role]);
  useEffect(()=>{void load();return()=>{loadSequence.current++;};},[load]);
  usePortalSync(load,!editor&&!action&&!saving);
  const schema=useMemo(()=>z.object({employeeId:module?.employeeScoped?z.string().min(1,"Choose an employee."):z.string(),...Object.fromEntries((module?.fields??[]).map(f=>[f.key,f.required?z.string().trim().min(1,`${f.label} is required.`):z.string()]))}),[module]);
  const form=useForm<Record<string,string>>({resolver:zodResolver(schema)});
  const formEmployee=form.watch("employeeId");
  const selectedEmployee=employees.find(e=>e.id===Number(formEmployee));
  const assignable=employees.filter(e=>module&&canWrite(user,module,e));
  function open(record:HrRecord|null){
    if(!module)return;
    form.reset({employeeId:String(record?.employeeId??(filter!=="all"?filter:assignable[0]?.id??"")),...Object.fromEntries(module.fields.map(f=>[f.key,record?.data[f.key]!=null?(typeof record.data[f.key]==="object"?JSON.stringify(record.data[f.key]):String(record.data[f.key])):f.type==="select"?f.options[0]:f.type==="progress"?"0":f.type==="scores"?"{}":""]))});
    setError("");setEditor({record});
  }
  async function save(values:Record<string,string>){
    if(!module)return;setSaving(true);setError("");
    try{const data:Record<string,unknown>={...values};delete data.employeeId;
      if(module.key==="interview"&&!isHr(user)&&editor?.record) for(const key of ["candidateId","interviewerId","date","time"]) data[key]=editor.record.data[key];
      if(module.fields.some(f=>f.type==="scores"))data.scores=JSON.parse(values.scores||"{}");
      await api(`/hr/records/${module.key}${editor?.record?`/${editor.record.id}`:""}`,{method:editor?.record?"PUT":"POST",body:{employeeId:module.employeeScoped?Number(values.employeeId):null,data}});
      setEditor(null);toast.success("Saved.");await load();
    }catch(e){setError(e instanceof ApiError?e.message:"Could not save. Check the fields and try again.");}finally{setSaving(false);}
  }
  async function runAction(){if(!action)return;setSaving(true);setError("");
    try{const r=action.record;
      const path=action.type==="convert"?`/hr/candidates/${r.id}/convert`:`/hr/records/${r.kind}/${r.id}/${action.type}`;
      await api(path,{method:"POST",body:action.type==="convert"?{startDate:note}:{reply:note,note}});
      setAction(null);setNote("");toast.success(action.type==="convert"?"Employee created with an onboarding checklist. Create their sign-in in Accounts & roles.":"Updated.");await load();
    }catch(e){setError(e instanceof ApiError?e.message:"Could not update this record.");}finally{setSaving(false);}
  }
  function showValue(value:unknown,key:string){
    const field=module?.fields.find(f=>f.key===key);
    if(value==null)return "—";
    if(field?.reference){if(field.reference==="employee")return employees.find(e=>e.id===Number(value))?`${employees.find(e=>e.id===Number(value))?.firstName} ${employees.find(e=>e.id===Number(value))?.lastName}`:`Employee ${value}`;if(field.reference==="position")return positions.find(p=>p.id===Number(value))?.name??String(value);return String(refs[field.reference]?.find(r=>r.id===Number(value))?.data.title??value);}
    if(field?.type==="date")return dateFmt(String(value));
    if(field?.type==="datetime")return String(value).replace("T"," ")+" (company time)";
    if(field?.type==="scores"&&typeof value==="object")return Object.entries(value).map(([id,score])=>`${refs.metric?.find(r=>r.id===Number(id))?.data.title??id}: ${score}/5`).join(" · ");
    return typeof value==="object"?"Recorded":String(value).replace(/_/g," ");
  }
  const today=insights?.today??new Intl.DateTimeFormat("en-CA").format(new Date());
  const shown=records.filter(r=>`${Object.values(r.data).join(" ")} ${employees.find(e=>e.id===r.employeeId)?.firstName??""} ${employees.find(e=>e.id===r.employeeId)?.lastName??""}`.toLowerCase().includes(search.toLowerCase())).filter(r=>module?.key!=="task"||taskView==="all"||(r.data.status!=="DONE"&&(taskView==="today"?String(r.data.dueDate)===today:String(r.data.dueDate)<today)));
  if(!module)return <div className="space-y-4"><Button asChild variant="ghost"><Link href="/portal"><ArrowLeft/>Employee portal</Link></Button><p role={error?"alert":"status"}>{error|| (loading?"Loading workspace…":"This workspace is unavailable for your role.")}</p></div>;
  return <div data-tour-page={`portal-${module.key}`} data-tour-ready={!loading && !error} className="mx-auto max-w-6xl space-y-6">
    <Link href="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4"/>Employee portal</Link>
    <header data-tour="page-overview" className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"><div><p className="eyebrow text-primary">{module.group} / Employee portal</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{module.label}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{module.description}</p></div>{(module.access!=="hiring"||isHr(user))&&(module.employeeScoped?assignable.length>0:canWrite(user,module,undefined))&&<Button data-tour="add-record-btn" onClick={()=>open(null)}><Plus/>Add {module.label.toLowerCase().replace(/s$/,"")}</Button>}</header>
    <div className="workspace-section-bar flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1 basis-full sm:basis-auto"><Label htmlFor="workspace-module" className="text-xs text-muted-foreground">Switch section</Label><select data-tour="workspace-section" id="workspace-module" className={`${control} mt-2 max-w-md`} value={module.key} onChange={e=>changeSection(e.target.value)}>{modules.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></div><p className="pb-2 text-xs text-muted-foreground">{shown.length} {shown.length===1?"record":"records"} in this view</p></div>
    {module.access==="hiring"&&user.role==="MANAGER"&&<p className="rounded-xl border bg-accent/40 p-4 text-sm">You see the interviews assigned to you and their linked candidates. HR owns scheduling and candidate stages; you can add scores, notes and interview outcomes.</p>}
    <ol className="workflow-guide" aria-label={`${module.group} workflow`}>{(WORKFLOW[module.group]??[]).map((step,index)=><li key={step}><span>{index+1}</span>{step}</li>)}</ol>
    <div className="flex flex-wrap items-end gap-3"><div className="min-w-52 flex-1"><Label htmlFor="record-search">Search records</Label><Input data-tour="record-search" id="record-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search names or details"/></div>{module.employeeScoped&&<div><Label htmlFor="employee-filter">Employee</Label><select id="employee-filter" className={control} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All visible employees</option>{employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>}<Button variant="outline" onClick={()=>void downloadFile(`/hr/export/${module.key}${filter!=="all"?`?employeeId=${filter}`:""}`,`${module.key}.csv`).catch(()=>toast.error("Could not export."))}><Download/>Export CSV</Button>{module.key==="metric-value"&&["ADMIN","HR","MANAGER"].includes(user.role)&&<label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"><Upload className="h-4 w-4"/>Import metrics CSV<input aria-label="Import metric values CSV" type="file" accept=".csv" className="sr-only" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;const data=new FormData();data.append("file",file);try{const result=await api<{imported:number}>("/hr/metrics/import",{method:"POST",formData:data});toast.success(`Imported ${result.imported} rows.`);await load();}catch(err){toast.error(err instanceof ApiError?err.message:"Import failed.");}e.target.value="";}}/></label>}</div>
    {module.key==="metric-value"&&<p className="text-xs text-muted-foreground">CSV columns: employeeId,title,metricId,date,value,evidence. Employee and metric IDs are shown in their records. Import is all-or-nothing.</p>}
    {module.key==="task"&&<div className="flex gap-2" aria-label="Task view">{[["all","All tasks"],["today","Due today"],["overdue","Overdue"]].map(([key,label])=><Button key={key} variant={taskView===key?"default":"outline"} aria-pressed={taskView===key} onClick={()=>setTaskView(key)}>{label}</Button>)}</div>}
    {module.group==="Leave"&&<div className="grid gap-3 sm:grid-cols-2">{balances.filter(b=>filter==="all"||b.employeeId===Number(filter)).map(b=><Card key={`${b.employeeId}-${b.title}-${b.year}`}><CardContent className="p-4"><h2 className="font-semibold">{b.title} · {b.year}</h2><p className="text-xs text-muted-foreground">{employees.find(e=>e.id===b.employeeId)?.firstName} {employees.find(e=>e.id===b.employeeId)?.lastName}</p><p className="mt-2 text-lg tabular">{b.remaining} days remaining</p><p className="text-xs text-muted-foreground">{b.used} approved · {b.allowance} allowance</p></CardContent></Card>)}</div>}
    {module.group==="Work"&&!!insights?.missedDeadlines?.length&&<Card><CardContent className="space-y-2 p-5"><h2 className="font-semibold">Missed deadlines &amp; impact</h2>{insights.missedDeadlines.map(t=><p key={t.id} className="text-sm"><strong>{String(t.data.title)}</strong> · due {dateFmt(String(t.data.dueDate))} · {String(t.data.impact)}{records.some(r=>Number(r.data.dependsOnId)===t.id)?" · Dependent tasks may be affected.":""}</p>)}</CardContent></Card>}
    {error&&!editor&&!action&&<p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}<Button variant="ghost" onClick={()=>void load()}>Retry</Button></p>}
    {insights&&<div className="grid gap-4 sm:grid-cols-2">
      {module.group==="Communication"&&<Card><CardContent className="p-5"><h2 className="font-semibold">Feedback balance</h2><p className="mt-2 text-2xl tabular">{insights.positive} positive · {insights.constructive} constructive</p><p className="mt-1 text-sm text-muted-foreground">{insights.constructive?`${(insights.positive/insights.constructive).toFixed(1)} positive for each constructive entry`:"No constructive entries in this view."}</p></CardContent></Card>}
      {module.group==="Discipline"&&<Card><CardContent className="space-y-3 p-5"><h2 className="font-semibold">Policy consistency</h2>{insights.nextDisciplineStep&&<p className="text-sm">Next configured step: <strong>{insights.nextDisciplineStep}</strong>. Review the circumstances before choosing.</p>}{Object.entries(insights.disciplineConsistency).map(([incident,steps])=><p key={incident} className="text-sm">{incident}: {Object.entries(steps).map(([step,count])=>`${count} at step ${step}`).join(" · ")}</p>)}{!Object.keys(insights.disciplineConsistency).length&&<p className="text-sm text-muted-foreground">No incidents in this view.</p>}</CardContent></Card>}
      {module.group==="Performance"&&filter!=="all"&&<Card className="sm:col-span-2"><CardContent className="p-5"><h2 className="mb-4 font-semibold">Review trend (0–5)</h2>{insights.trend.length?<div className="h-52"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...insights.trend].sort((a,b)=>a.date.localeCompare(b.date))}><XAxis dataKey="date"/><YAxis domain={[0,5]}/><Tooltip/><Line isAnimationActive={false} dataKey="score" stroke="var(--primary)" strokeWidth={2}/></LineChart></ResponsiveContainer></div>:<p className="text-sm text-muted-foreground">Shared reviews will appear here.</p>}</CardContent></Card>}
      {module.group==="Work"&&<Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Open tasks by employee</h2>{Object.entries(insights.workload).map(([id,count])=><p key={id} className="text-sm">{employees.find(e=>e.id===Number(id))?.firstName??`Employee ${id}`}: {count}</p>)}{!Object.keys(insights.workload).length&&<p className="text-sm text-muted-foreground">No open tasks.</p>}</CardContent></Card>}
    </div>}
    <section data-tour="records-list">{loading?<p role="status" className="py-8">Loading records…</p>:shown.length===0?<Card><CardContent className="py-12 text-center"><h2 className="font-semibold">{search?"No matching records":"No records yet"}</h2><p className="mt-2 text-sm text-muted-foreground">{search?"Try another search or employee filter.":module.description}</p></CardContent></Card>:<div className="space-y-3">{shown.map(r=>{const employee=employees.find(e=>e.id===r.employeeId);const own=r.employeeId===user.employeeId;const reviewable=manages(user,employee)&&!own&&(!["profile-request","help-request"].includes(r.kind)||isHr(user));return <Card className="hr-record-card" key={r.id}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{String(r.data.title)}</h2><p className="mt-1 text-xs text-muted-foreground">{employee?`${employee.firstName} ${employee.lastName} · `:""}Record {r.id} · {dateFmt(r.createdAt)}</p></div><div className="flex items-center gap-2">{r.data.status!=null&&<Badge variant={r.data.status==="DONE"||r.data.status==="APPROVED"?"success":"secondary"}>{humanize(r.data.status)}</Badge>}{canWrite(user,module,employee)&&(!["request"].includes(module.access)||r.data.status==="PENDING")&&<Button size="sm" variant="outline" onClick={()=>open(r)}><Pencil className="h-4 w-4"/>Edit</Button>}</div></div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">{module.fields.filter(f=>["dueDate","startDate","endDate","date","target","progress","level","type","assignedTo"].includes(f.key)&&r.data[f.key]!=null).slice(0,3).map(f=><span key={f.key}>{f.label}: <strong className="font-medium text-foreground">{f.type==="select"?humanize(r.data[f.key]):showValue(r.data[f.key],f.key)}</strong>{f.key==="progress"?"%":""}</span>)}</div>
      {r.kind==="task"&&<p className="mt-3 text-sm text-primary">{Number(insights?.taskHours?.[String(r.id)]??0).toFixed(2)} hours tracked · {r.data.status==="DONE"?"Completed":"Work in progress"}</p>}
      <ActionDisclosure className="mt-4 record-details" label="View details"><dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">{module.fields.filter(f=>f.key!=="title"&&f.key!=="status"&&r.data[f.key]!=null).map(f=><div key={f.key} className={f.type==="textarea"?"sm:col-span-2":""}><dt className="text-xs text-muted-foreground">{f.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{showValue(r.data[f.key],f.key)}</dd></div>)}{r.data.reviewNote!=null&&<div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">HR / manager reply</dt><dd>{String(r.data.reviewNote)}</dd></div>}{r.data.reply!=null&&<div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Employee reply</dt><dd>{String(r.data.reply)}</dd></div>}</dl></ActionDisclosure>
      {r.kind==="policy"&&!!(r.data.acknowledgements as Record<string,string>|undefined)?.[String(user.employeeId)]&&<p className="mt-3 text-sm text-success">You have marked this policy as read.</p>}
      <ActionDisclosure className="mt-4" label="Record actions">{own&&["feedback","meeting","review","discipline"].includes(r.kind)&&<><Button size="sm" variant="outline" onClick={()=>{setAction({record:r,type:"reply"});setNote("");}}>Reply</Button>{!r.data.acknowledgedAt&&<Button size="sm" variant="outline" onClick={()=>{setAction({record:r,type:"acknowledge"});setNote("");}}><Check/>Acknowledge</Button>}</>}{r.kind==="policy"&&user.employeeId&&!(r.data.acknowledgements as Record<string,string>|undefined)?.[String(user.employeeId)]&&<Button size="sm" variant="outline" onClick={()=>{setAction({record:r,type:"acknowledge"});setNote("");}}>Mark as read</Button>}{r.data.acknowledgedAt!=null&&<span className="text-xs text-muted-foreground">Acknowledged {dateFmt(String(r.data.acknowledgedAt))}</span>}{["task","onboarding"].includes(r.kind)&&r.data.status!=="DONE"&&((own&&(r.kind!=="onboarding"||r.data.assignedTo!=="MANAGER"))||manages(user,employee))&&<Button size="sm" variant="outline" onClick={()=>{setAction({record:r,type:"complete"});setNote("");}}>Mark done</Button>}{module.access==="request"&&r.data.status==="PENDING"&&reviewable&&<><Button size="sm" onClick={()=>{setAction({record:r,type:r.kind==="help-request"?"resolve":"approve"});setNote("");}}>{r.kind==="help-request"?"Reply & resolve":"Approve"}</Button><Button size="sm" variant="outline" onClick={()=>{setAction({record:r,type:"reject"});setNote("");}}>Reject</Button></>}{r.kind==="candidate"&&r.data.status==="HIRED"&&!r.data.employeeRecordId&&<Button size="sm" onClick={()=>{setAction({record:r,type:"convert"});setNote("");}}>Create employee & checklist</Button>}{r.data.employeeRecordId!=null&&<Button asChild size="sm" variant="outline"><Link href={`/employees/${r.data.employeeRecordId}`}>Open employee</Link></Button>}</ActionDisclosure>
    </CardContent></Card>;})}</div>}
    </section>
    <Dialog open={!!editor} onOpenChange={open=>{if(!open)setEditor(null);}}><DialogContent data-tour="records-editor"><DialogHeader><DialogTitle>{editor?.record?"Edit":"Add"} {module.label.toLowerCase().replace(/s$/,"")}</DialogTitle><DialogDescription>{module.description}</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit(save)} className="space-y-4" noValidate>
      {module.employeeScoped&&<div className="space-y-1"><Label htmlFor="form-employee">Employee *</Label><select data-tour="record-employee" id="form-employee" className={control} {...form.register("employeeId")} disabled={!!editor?.record}><option value="">Choose employee</option>{assignable.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>}
      {module.fields.map(f=><fieldset data-tour={`record-field-${f.key}`} key={f.key} disabled={module.key==="interview"&&!isHr(user)&&["candidateId","interviewerId","date","time"].includes(f.key)} className="space-y-1"><Label htmlFor={`field-${f.key}`}>{f.label}{f.required?" *":""}</Label>{f.type==="select"?<select id={`field-${f.key}`} className={control} {...form.register(f.key)}>{f.options.map(o=><option key={o} value={o}>{o.replace(/_/g," ")}</option>)}</select>:f.type==="reference"?<select id={`field-${f.key}`} className={control} {...form.register(f.key)}><option value="">Choose {f.label.toLowerCase()}</option>{f.reference==="employee"?employees.filter(e=>e.status==="ACTIVE").map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>):f.reference==="position"?positions.map(p=><option key={p.id} value={p.id}>{p.name}</option>):(refs[f.reference??""]??[]).filter(r=>r.employeeId==null||r.employeeId===Number(formEmployee)||f.key==="dependsOnId").filter(r=>r.id!==editor?.record?.id||r.kind!==module.key).map(r=><option key={r.id} value={r.id}>{String(r.data.title)} (#{r.id})</option>)}</select>:f.type==="textarea"?<textarea id={`field-${f.key}`} rows={3} className={control} {...form.register(f.key)} aria-invalid={!!form.formState.errors[f.key]}/>:f.type==="scores"?<div className="space-y-3 rounded-md border p-3">{(refs.metric??[]).filter(m=>Number(m.data.positionId)===selectedEmployee?.jobRoleId).map(m=>{let scores:Record<string,string>={};try{scores=JSON.parse(form.watch("scores")||"{}");}catch{}return <div key={m.id} className="flex items-center justify-between gap-3"><Label htmlFor={`score-${m.id}`}>{String(m.data.title)}</Label><Input id={`score-${m.id}`} className="w-24" type="number" min={0} max={5} step="0.1" value={scores[m.id]??""} onChange={e=>form.setValue("scores",JSON.stringify({...scores,[m.id]:e.target.value}))}/></div>;})}<p className="text-xs text-muted-foreground">Score each position metric from 0 to 5 before sharing. If none appear, define the position’s metrics first.</p></div>:<Input id={`field-${f.key}`} type={f.type==="datetime"?"datetime-local":["date","time","email"].includes(f.type)?f.type:["number","positive","score","progress"].includes(f.type)?"number":"text"} step="any" {...form.register(f.key)} aria-invalid={!!form.formState.errors[f.key]}/>}<p role="alert" className="text-xs text-destructive">{String(form.formState.errors[f.key]?.message??"")}</p></fieldset>)}
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={()=>setEditor(null)}>Cancel</Button><Button data-tour="record-save" type="submit" disabled={saving}>{saving?"Saving…":"Save record"}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={!!action} onOpenChange={open=>{if(!open)setAction(null);}}><DialogContent><DialogHeader><DialogTitle>{action?.type==="convert"?"Create an employee":`${action?.type?.charAt(0).toUpperCase()}${action?.type?.slice(1)} record`}</DialogTitle><DialogDescription>{String(action?.record.data.title??"")}</DialogDescription></DialogHeader>{action?.type==="convert"?<div><Label htmlFor="start-date">Employee start date *</Label><Input id="start-date" type="date" value={note} onChange={e=>setNote(e.target.value)}/><p className="mt-2 text-xs text-muted-foreground">The new employee starts with salary zero. Finance can set pay; Admin or CFO can create their account.</p></div>:["reply","reject","resolve","approve"].includes(action?.type??"")?<div><Label htmlFor="action-note">{action?.type==="approve"?"Decision note (optional)":"Reply / reason *"}</Label><textarea id="action-note" rows={4} className={control} value={note} onChange={e=>setNote(e.target.value)}/></div>:<p className="text-sm">Confirm that you’ve read or completed this item.</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={()=>setAction(null)}>Cancel</Button><Button disabled={saving} onClick={()=>void runAction()}>{saving?"Saving…":"Confirm"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
