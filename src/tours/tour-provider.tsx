"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/components/auth-provider";
import { TourContext } from "./tour-context";
import { stepsForRole,tourConfig } from "./tourConfig";
import { presentTourSteps,runTour } from "./tourRunner";

export function TourProvider({children}:{children:React.ReactNode}) {
  const {user,company,completeTour}=useSession();
  const pathname=usePathname();
  const [page,setPage]=useState<string|null>(null);
  const [active,setActive]=useState(false);
  const [helpRoute,setHelpRoute]=useState<string|null>(null);
  const running=useRef(false);
  const cancellation=useRef<AbortController|null>(null);
  const closed=useRef(new Set<string>());
  const identity=useRef(user.id);
  const mounted=useRef(true);
  identity.current=user.id;
  const stop=useCallback(()=>{cancellation.current?.abort();cancellation.current=null;running.current=false;setActive(false);},[]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    const receive=(event:Event)=>{if(event instanceof CustomEvent && typeof event.detail==="string" && event.detail.startsWith("/") && !event.detail.startsWith("//"))setHelpRoute(event.detail);};
    window.addEventListener("portal-help-tour",receive);
    return()=>window.removeEventListener("portal-help-tour",receive);
  },[]);

  useEffect(()=>{
    const inspect=()=>{
      const root=document.querySelector<HTMLElement>("#main [data-tour-page][data-tour-ready='true']");
      setPage(root?.dataset.tourPage??null);
    };
    const observer=new MutationObserver(inspect);
    observer.observe(document.getElementById("main")??document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["data-tour-page","data-tour-ready"]});
    inspect();return()=>observer.disconnect();
  },[pathname]);
  useEffect(()=>()=>{stop();},[pathname,page,user.id,stop]);

  const start=useCallback((replay=false)=>{
    if(!page || running.current || user.welcomeRequired || user.passwordChangeRequired)return;
    const definition=tourConfig[page];
    if(!definition || !replay && (closed.current.has(`${user.id}:${page}`)||(user.toursCompleted??[]).includes(page)))return;
    if(document.querySelector("[role=dialog][data-state=open]"))return;
    const steps=presentTourSteps(stepsForRole(definition,user,company));
    if(!steps.length)return;
    const controller=new AbortController();cancellation.current=controller;running.current=true;setActive(true);
    const currentUser=user.id;
    const persist=async()=>{
      try{await completeTour(page);}
      catch {if(mounted.current && identity.current===currentUser)toast.error("Tour closed, but its completion could not be saved.",{duration:10000,action:{label:"Retry saving",onClick:()=>{if(mounted.current && identity.current===currentUser)void persist();}}});}
    };
    void runTour(steps,controller.signal,()=>{
      closed.current.add(`${user.id}:${page}`);stop();void persist();
    },()=>{
      stop();toast.error("This walkthrough could not find a required control. Use ‘Take the tour again’ to retry.");
    }).catch(()=>{if(!controller.signal.aborted){stop();toast.error("Could not load the walkthrough. You can retry from your profile menu.");}});
  },[page,user,company,completeTour,stop]);

  useEffect(()=>{
    const timer=setTimeout(()=>start(),450);
    return()=>clearTimeout(timer);
  },[start]);
  useEffect(()=>{
    if(!helpRoute||!page)return;
    const target=new URL(helpRoute,window.location.origin);
    if(target.pathname!==pathname)return;
    const module=target.searchParams.get("module");
    if(module&&page!==`portal-${module}`)return;
    const timer=setTimeout(()=>{start(true);setHelpRoute(null);},450);
    return()=>clearTimeout(timer);
  },[helpRoute,page,pathname,start]);
  const available=!!page && !!tourConfig[page] && stepsForRole(tourConfig[page],user,company).length>0;
  return <TourContext.Provider value={{active,available,replay:()=>start(true)}}>{children}</TourContext.Provider>;
}
