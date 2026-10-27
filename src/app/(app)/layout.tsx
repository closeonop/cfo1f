"use client";

import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TourProvider } from "@/tours/tour-provider";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import "@/components/assistant/assistant.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "anonymous") router.replace("/login");
    if (auth.status === "authenticated" && auth.user.welcomeRequired) router.replace("/welcome");
  }, [auth, router]);

  if (auth.status !== "authenticated" || auth.user.welcomeRequired) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </main>
    );
  }

  return <TourProvider><AppShell>{children}</AppShell><AssistantLauncher /></TourProvider>;
}
