"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError, setAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

interface SetupStatus { email: string; verified: boolean; passwordRequired: boolean; demoMode: boolean; firstName: string; lastName: string; phone: string }
const PROFILE_FIELDS = [
  ["firstName", "First name", "given-name"], ["lastName", "Last name", "family-name"],
  ["phone", "Phone number", "tel"], ["address", "Home address", "street-address"],
  ["emergencyContact", "Emergency contact name and phone", "off"],
  ["accountHolder", "Bank account holder", "off"], ["bankName", "Bank name", "off"],
  ["accountNumber", "Account number", "off"], ["ifsc", "IFSC code", "off"],
] as const;

export default function WelcomePage() {
  const auth = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const next = await api<SetupStatus>("/auth/welcome/status");
      setStatus(next);
      setProfile(previous => ({ firstName: next.firstName, lastName: next.lastName, phone: next.phone, ...previous }));
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not load account setup."); }
  }, []);
  useEffect(() => {
    if (auth.status === "anonymous") router.replace("/login");
    if (auth.status === "authenticated") {
      if (!auth.user.welcomeRequired) router.replace("/portal");
      else void load();
    }
  }, [auth.status, auth.status === "authenticated" && auth.user.welcomeRequired, router, load]);

  const step = !status?.verified ? 0 : status.passwordRequired ? 1 : 2;
  async function perform(work: () => Promise<void>) {
    setBusy(true); setError("");
    try { await work(); }
    catch (e) { setError(e instanceof ApiError ? Object.values(e.fieldErrors ?? {}).join(" · ") || e.message : e instanceof Error ? e.message : "Could not save this step. Please try again."); }
    finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await perform(async () => {
      if (step === 0) {
        await api("/auth/welcome/verify-code", { method: "POST", body: { code } });
        setCode(""); await load();
      } else if (step === 1) {
        if (newPassword !== confirm) throw new Error("The passwords do not match.");
        const result = await api<{ accessToken: string }>("/auth/welcome/password", { method: "POST", body: { currentPassword, newPassword } });
        setAccessToken(result.accessToken); setCurrentPassword(""); setNewPassword(""); setConfirm("");
        await load();
      } else {
        await api("/auth/welcome/profile", { method: "POST", body: profile });
        setProfile({}); await auth.logout(); router.replace("/login?setup=complete");
      }
    });
  }
  return (
    <main className="setup-layout">
      <aside className="setup-story">
        <span className="eyebrow">People &amp; Pay / First things first</span>
        <h1 className="page-title">Your next chapter<br /><em>starts here.</em></h1>
        <p>Three quick steps to make this workspace yours. Your sign-in email stays linked to the account your administrator created.</p>
        <ol className="setup-steps">
          {[ [Mail, "Verify your email", "Confirm the sign-in address"], [LockKeyhole, "Make it yours", "Choose your own password"], [UserRound, "Complete your profile", "Personal and payment details"] ].map(([Icon, title, detail], index) => {
            const StepIcon = Icon as typeof Mail;
            return <li key={String(title)} aria-current={step === index ? "step" : undefined} data-active={step === index}><span>{step > index ? <Check aria-hidden="true" /> : <StepIcon aria-hidden="true" />}</span><div><strong>{String(title)}</strong><small>{String(detail)}</small></div></li>;
          })}
        </ol>
      </aside>
      <section className="setup-form" aria-labelledby="setup-title">
        <div className="flex items-center justify-between gap-4"><span className="eyebrow text-primary">Step {step + 1} of 3</span><Button variant="ghost" onClick={() => void auth.logout()}>Sign out</Button></div>
        <h2 id="setup-title" className="mt-5 text-3xl font-semibold tracking-tight">{["Let’s check your email.", "A fresh password.", "A few details, then you’re in."][step]}</h2>
        <p className="mb-7 mt-2 text-sm text-muted-foreground">{step === 0 ? status?.email : step === 1 ? "Use at least 10 characters, including a letter and a number." : "Personal details are for you and HR/Admin. Payment details are restricted to you and Finance/Admin."}</p>
        {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        {!status ? <p role="status">Loading your setup…</p> : <form onSubmit={submit} className="space-y-5">
          {step === 0 && <>
            {status.demoMode && <p className="rounded-xl border bg-accent p-4 text-sm"><strong>Local demo verification</strong><br />Use <code>123456</code>. No email is sent; this simulates verification.</p>}
            <Button type="button" variant="outline" disabled={busy} onClick={() => void perform(async () => { await api("/auth/welcome/request-code", { method: "POST" }); setSent(true); })}>{sent ? "Request a new code" : "Request verification code"}</Button>
            <div className="space-y-2"><Label htmlFor="setup-code">Six-digit code</Label><Input id="setup-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /><p className="text-xs text-muted-foreground">Request a code first. It expires in 10 minutes; five attempts are allowed.</p></div>
          </>}
          {step === 1 && <>
            <div className="space-y-2"><Label htmlFor="setup-current">Temporary password</Label><PasswordInput id="setup-current" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="setup-new">New password</Label><PasswordInput id="setup-new" autoComplete="new-password" minLength={10} required value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="setup-confirm">Confirm new password</Label><PasswordInput id="setup-confirm" autoComplete="new-password" minLength={10} required value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
            {newPassword && confirm && newPassword !== confirm && <p className="text-sm text-destructive">The passwords do not match.</p>}
          </>}
          {step === 2 && <div className="grid gap-5 sm:grid-cols-2">{PROFILE_FIELDS.map(([key, label, autoComplete], index) => <Fragment key={key}>
            {index === 5 && <h3 className="font-semibold sm:col-span-2">Payment details</h3>}
            <div className={key === "address" || key === "emergencyContact" ? "sm:col-span-2" : ""}>
            <Label htmlFor={`setup-${key}`}>{label} *</Label><Input id={`setup-${key}`} className="mt-2" autoComplete={autoComplete} type={key === "phone" ? "tel" : "text"} inputMode={key === "accountNumber" ? "numeric" : undefined} required maxLength={key === "address" ? 500 : key === "accountNumber" ? 34 : 160} value={profile[key] ?? ""} onChange={e => setProfile({ ...profile, [key]: key === "ifsc" ? e.target.value.toUpperCase() : e.target.value })} />
          </div></Fragment>)}</div>}
          <Button type="submit" className="w-full" disabled={busy || (step === 1 && newPassword !== confirm)}>{busy ? "Saving…" : ["Verify code", "Save password", "Complete setup & sign in"][step]}<ArrowRight aria-hidden="true" /></Button>
        </form>}
      </section>
    </main>
  );
}
