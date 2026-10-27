"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowUp,ArrowUpRight,Compass,RotateCcw} from "lucide-react";
import {Dialog,DialogContent,DialogDescription,DialogTitle} from "@/components/ui/dialog";
import {getAccessToken,refreshSession} from "@/lib/api";
import {useSession} from "@/components/auth-provider";
import type {AssistantAnswer,ChatMessage} from "@/lib/assistant/policy";

type Turn=ChatMessage&{action?:AssistantAnswer["action"];error?:boolean};
export default function AssistantPanel({open,onOpenChange,returnFocus}:{open:boolean;onOpenChange:(value:boolean)=>void;returnFocus:()=>void}){
  const {user}=useSession();
  const suggestions=user.employeeId?["How do I start attendance?","How do I request leave?","How do I raise a complaint?"]
    :["ADMIN","CFO","HR"].includes(user.role)?["How do I add a job role?",user.role==="HR"?"How do I find the employee directory?":"How do I manage accounts and permissions?","How do I view attendance totals?"]
    :["How do I use the employee portal?","How do I find an employee?","Where are company policies?"];
  const router=useRouter();const [turns,setTurns]=useState<Turn[]>([]),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false);
  const list=useRef<HTMLDivElement>(null),request=useRef<AbortController|null>(null),sending=useRef(false);
  const mounted=useRef(true);
  useEffect(()=>{if(open)list.current?.scrollTo({top:list.current.scrollHeight});},[turns,busy,open]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
  async function send(question:string){
    const content=question.trim();if(!content||content.length>500||sending.current)return;
    sending.current=true;setBusy(true);setDraft("");
    const next:Turn[]=[...turns,{role:"user",content}];setTurns(next);
    const controller=new AbortController();request.current=controller;
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const body=JSON.stringify({messages:next.filter(t=>!t.error).slice(-6).map(t=>({role:t.role,content:t.content.slice(0,500)}))});
      const fetchAnswer=()=>fetch("/api/assistant",{method:"POST",cache:"no-store",signal:controller.signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${getAccessToken()??""}`},body});
      let response=await fetchAnswer();if(response.status===401&&!controller.signal.aborted&&await refreshSession()&&!controller.signal.aborted)response=await fetchAnswer();
      const answer=await response.json();
      if(!response.ok)throw new Error(typeof answer.error==="string"?answer.error:"Portal help is unavailable. Please try again.");
      if(mounted.current)setTurns(previous=>[...previous,{role:"assistant",content:answer.reply,action:answer.action}]);
    }catch(error){if(mounted.current)setTurns(previous=>[...previous,{role:"assistant",content:controller.signal.aborted?"That took too long. Please try again.":error instanceof Error?error.message:"Could not connect. Please try again.",error:true}]);}
    finally{clearTimeout(timeout);sending.current=false;if(mounted.current)setBusy(false);}
  }
  function navigate(route:string){
    // Server-authored map routes only; defense in depth for the navigation sink.
    if(!route.startsWith("/")||route.startsWith("//")||/[\\\r\n]/.test(route))return;
    onOpenChange(false);
    window.dispatchEvent(new CustomEvent("portal-help-tour",{detail:route}));
    router.push(route);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="assistant-panel" aria-describedby="assistant-description" onCloseAutoFocus={event=>{event.preventDefault();returnFocus();}}>
    <header className="assistant-heading"><div className="assistant-mark"><Compass aria-hidden="true"/></div><div><p className="assistant-eyebrow">PEOPLE & PAY / PORTAL GUIDE</p><DialogTitle className="assistant-title">A little direction.</DialogTitle></div></header>
    <DialogDescription id="assistant-description" className="assistant-description">Find the right page. Get the next step.</DialogDescription>
    <div className="assistant-conversation" ref={list} role="log" aria-label="Portal help conversation" aria-live="polite" aria-relevant="additions text">
      {!turns.length?<section className="assistant-welcome"><span className="assistant-index">01 / START HERE</span><h2>Less searching.<br/><em>More doing.</em></h2><p>I can guide you through this portal’s features and open the right page for your role.</p><div className="assistant-suggestions">{suggestions.map(question=><button key={question} onClick={()=>void send(question)} disabled={busy}>{question}<ArrowUpRight aria-hidden="true"/></button>)}</div></section>:turns.map((turn,index)=><article key={index} className={`assistant-message assistant-message-${turn.role}`}><span className="assistant-speaker">{turn.role==="user"?"YOU":"PORTAL GUIDE"}</span><p>{turn.content}</p>{turn.action&&<button className="assistant-action" onClick={()=>navigate(turn.action!.route)}>{turn.action.label}<ArrowUpRight aria-hidden="true"/></button>}{turn.error&&<small role="status">You can try again with a short feature question.</small>}</article>)}
      {busy&&<div className="assistant-thinking" role="status"><span/><span/><span/><span className="sr-only">Finding your next step…</span></div>}
    </div>
    <footer className="assistant-footer"><p>Navigation help only. Keep names, passwords and private concerns out of chat; use the protected HR form for details.</p><form onSubmit={event=>{event.preventDefault();void send(draft);}}><label className="sr-only" htmlFor="assistant-question">Ask about a portal feature</label><textarea id="assistant-question" rows={2} maxLength={500} value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Where do I…?" disabled={busy} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void send(draft);}}}/><button type="submit" aria-label="Send help question" disabled={busy||!draft.trim()}><ArrowUp aria-hidden="true"/></button></form><div className="assistant-footer-meta"><span>{draft.length}/500 · Powered by Groq</span><button disabled={busy||!turns.length} onClick={()=>{setTurns([]);setDraft("");}}><RotateCcw aria-hidden="true"/>Clear chat</button></div></footer>
  </DialogContent></Dialog>;
}
