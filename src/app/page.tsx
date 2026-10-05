"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === "authenticated") router.replace("/dashboard");
    if (auth.status === "anonymous") router.replace("/login");
  }, [auth.status, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
    </main>
  );
}
