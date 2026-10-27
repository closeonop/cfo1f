"use client";
import dynamic from "next/dynamic";
import {useRef,useState} from "react";
import {Compass} from "lucide-react";
import {useSession} from "@/components/auth-provider";
import {useTour} from "@/tours/tour-context";

const AssistantPanel=dynamic(()=>import("./assistant-panel"),{ssr:false});
export function AssistantLauncher(){
  const {user}=useSession();const {active}=useTour();
  const [opened,setOpened]=useState(false),[loaded,setLoaded]=useState(false);
  const launcher=useRef<HTMLButtonElement>(null);
  if(user.welcomeRequired||user.passwordChangeRequired)return null;
  return <>
    {!active&&<button ref={launcher} className="assistant-launcher" aria-label="Open portal help" aria-haspopup="dialog" aria-expanded={opened} onClick={()=>{setLoaded(true);setOpened(true);}}><Compass aria-hidden="true"/><span>Need a hand?</span></button>}
    {loaded&&<AssistantPanel key={user.id} open={opened&&!active} onOpenChange={setOpened} returnFocus={()=>launcher.current?.focus()}/>}
  </>;
}
