"use client";

import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "anonymous") router.replace("/login");
  }, [auth.status, router]);

  if (auth.status !== "authenticated") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </main>
    );
  }

  return <AppShell>{children}</AppShell>;
}
