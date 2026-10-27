"use client";
import { useParams } from "next/navigation";
import { HrWorkspace } from "@/components/hr-workspace";
export default function Page() { const { group } = useParams<{group:string}>(); return <HrWorkspace group={group}/>; }
