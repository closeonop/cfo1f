"use client";
import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const LABELS: Record<string,string> = {firstName:"First name",lastName:"Last name",phone:"Phone",address:"Address",emergencyContact:"Emergency contact",accountHolder:"Account holder",bankName:"Bank",accountNumber:"Account number",ifsc:"IFSC"};
export function PrivateProfile({ employeeId }: { employeeId: number }) {
  const [profile,setProfile]=useState<{completed:boolean;details?:Record<string,string>}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function open(){setBusy(true);setError("");try{setProfile(await api(`/employees/${employeeId}/private-profile`));}catch(e){setError(e instanceof ApiError?e.message:"Could not open private details.");}finally{setBusy(false);}}
  return <Card data-tour="private-profile"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><LockKeyhole className="h-4 w-4" aria-hidden="true"/>Private profile</CardTitle><CardDescription>Only the personal or payment fields your role permits are shown. Opening this section is audited.</CardDescription></CardHeader><CardContent>
    {error&&<p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
    {!profile?<Button variant="outline" disabled={busy} onClick={()=>void open()}>{busy?"Opening…":"Open private details"}</Button>:<>{!profile.completed?<p className="text-sm text-muted-foreground">This employee has not completed their profile setup.</p>:<dl className="grid gap-4 text-sm sm:grid-cols-2">{Object.entries(profile.details??{}).map(([key,value])=><div key={key}><dt className="text-xs text-muted-foreground">{LABELS[key]??key}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>}<Button className="mt-4" variant="ghost" onClick={()=>setProfile(null)}>Hide details</Button></>}
  </CardContent></Card>;
}
