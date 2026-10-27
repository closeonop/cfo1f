"use client";
import Link from "next/link";
import { useSession } from "@/components/auth-provider";
import { PrivateProfile } from "@/components/private-profile";

export default function PersonalProfilePage(){
  const {user}=useSession();
  return <div data-tour-page="personal-details" data-tour-ready="true" className="mx-auto max-w-4xl space-y-6"><Link href="/portal" className="text-sm text-primary">← Employee portal</Link><header><p className="eyebrow text-primary">Your account</p><h1 className="page-title mt-3">Your personal details.</h1><p className="mt-3 text-sm text-muted-foreground">Your bank account is masked here. Use a profile-change request for contact corrections; ask Finance to correct payment details.</p></header>{user.employeeId?<PrivateProfile employeeId={user.employeeId}/>:<p>Ask Admin to link this account to an employee.</p>}</div>;
}
