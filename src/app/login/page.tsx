"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowRight, Asterisk, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // already signed in (e.g. pressed Back after login)? go straight to the app
  useEffect(() => {
    if (auth.status === "authenticated") router.replace(auth.user.welcomeRequired ? "/welcome" : "/portal");
  }, [auth, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      // The authenticated-state effect chooses setup or the portal.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story" aria-labelledby="login-headline">
        <div className="flex items-center gap-3 text-lg font-semibold tracking-tight"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--highlight)] text-[var(--highlight-foreground)]"><Asterisk aria-hidden="true" /></span>People &amp; Pay</div>
        <div><div className="eyebrow mt-8 text-sidebar-primary">Your people. Your pace.</div><h1 id="login-headline">Good work.<br /><em>Great people.</em></h1><p>People, pay and all the moments in between. A clearer space to make work happen.</p></div>
        <div className="login-art orbit-mark" aria-hidden="true"><Asterisk /></div>
        <footer className="flex items-center justify-between gap-4 border-t border-sidebar-border pt-5 text-xs text-sidebar-foreground/70"><span>Less admin. More human.</span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></footer>
      </section>
      <section className="login-form-panel" aria-labelledby="sign-in-title">
      <div>
        <div className="mb-10"><span className="eyebrow text-muted-foreground">Your workspace awaits</span><h2 id="sign-in-title" className="mt-3 font-semibold">Hey, welcome back.</h2><p className="mt-3 text-sm text-muted-foreground">Sign in and pick up where you left off.</p></div>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Signing in…" : "Let’s get to work"}<ArrowRight aria-hidden="true" />
            </Button>
            <div className="flex flex-wrap justify-between gap-4 text-sm">
              <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
                Forgot password?
              </Link>
              <Link href="/onboarding" className="text-muted-foreground underline-offset-4 hover:underline">
                New company? Set up here
              </Link>
            </div>
          </form>
        <p className="mt-10 flex items-center gap-2 border-t pt-5 text-xs text-muted-foreground"><Layers className="h-4 w-4" aria-hidden="true" />One workspace for your working world.</p>
      </div>
      </section>
    </main>
  );
}
