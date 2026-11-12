"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreatorProfileState, Profile } from "../../profile-state";

function CreatorProfile() {
  const router = useRouter();
  const [state, setState] = useState<CreatorProfileState>();
  const [challenge, setChallenge] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api<CreatorProfileState>("/creator/profile/me").then(
      (value) => { if (active) setState(value); },
      (failure: unknown) => { if (active) setError(message(failure)); },
    );
    return () => { active = false; };
  }, [attempt]);

  async function requestCode() {
    setPending(true);
    setError("");
    try {
      const value = await api<{ id: string }>("/creator/profile/challenge", { method: "POST" });
      setChallenge(value.id);
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state || pending) return;
    const fields = new FormData(event.currentTarget);
    const details = { displayName: fields.get("displayName"), bio: fields.get("bio") };
    setPending(true);
    setError("");
    try {
      if (state.profile) {
        await api<Profile>("/creator/profile/me", { method: "PUT", body: details });
      } else {
        await api<Profile>("/creator/profile", {
          method: "POST",
          body: { ...details, handle: fields.get("handle"), acceptedGuidelines: fields.has("guidelines"),
            ...(state.demoVerification ? { challengeId: challenge, code: fields.get("code") }
              : { currentPassword: fields.get("currentPassword") }) },
        });
      }
      router.push("/creator/profile");
    } catch (failure) {
      setError(message(failure));
    } finally {
      setPending(false);
    }
  }

  const profile = state?.profile;
  return (
    <section className="mx-auto max-w-xl py-5">
      <div className="min-w-0 rounded-2xl border bg-card p-5 sm:p-8">
        <h1 className="text-2xl font-semibold">{profile ? "Edit profile" : "Create your creator profile"}</h1>
        {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
        {!state && (error
          ? <Button className="mt-4" variant="outline" onClick={() => { setError(""); setAttempt(attempt + 1); }}>Try again</Button>
          : <p className="mt-4 text-sm text-muted-foreground" role="status">Loading profile…</p>)}
        {state && (
          <form key={profile?.id ?? "new"} onSubmit={save} className="mt-6 space-y-5">
            {profile ? <p className="break-words text-sm text-muted-foreground">@{profile.handle}</p> : (
              <label className="grid gap-2 text-sm font-medium">
                Handle
                <Input name="handle" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}"
                  autoCapitalize="none" aria-describedby="creator-handle-help" />
                <span id="creator-handle-help" className="font-normal text-muted-foreground">3–20 letters, numbers, or underscores.</span>
              </label>
            )}
            <label className="grid gap-2 text-sm font-medium">
              Display name
              <Input name="displayName" defaultValue={profile?.displayName} required maxLength={80} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Bio <span className="sr-only">(optional)</span>
              <textarea name="bio" defaultValue={profile?.bio} maxLength={300} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
            </label>
            {!profile && (
              <>
                <label className="flex items-start gap-2 text-sm">
                  <input className="mt-1 accent-primary" type="checkbox" name="guidelines" required />
                  <span>I agree to respect colleagues and keep confidential company and personal information out of my posts.</span>
                </label>
                {state.demoVerification ? <div className="space-y-3 border-t pt-4">
                  <Button type="button" variant="outline" onClick={requestCode} disabled={pending}>
                    {challenge ? "Request a new demo code" : "Request demo code"}
                  </Button>
                  {challenge && (
                    <label className="grid gap-2 text-sm font-medium">
                      Verification code
                      <Input name="code" inputMode="numeric" required pattern="[0-9]{6}" maxLength={6}
                        aria-describedby="creator-code-help" />
                      <span id="creator-code-help" className="font-normal text-muted-foreground">Development only. Use 123456.</span>
                    </label>
                  )}
                </div> : <label className="grid gap-2 text-sm font-medium">
                  Confirm your current password
                  <Input type="password" name="currentPassword" autoComplete="current-password" maxLength={128} required />
                </label>}
              </>
            )}
            <Button disabled={pending || (!profile && state.demoVerification && !challenge)}>{profile ? "Save profile" : "Create profile"}</Button>
          </form>
        )}
      </div>
    </section>
  );
}

function message(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Creator Space is unavailable.";
    return Object.values(error.fieldErrors ?? {})[0] ?? error.message;
  }
  return "Something went wrong. Please try again.";
}

export default function CreatorSpace() {
  const { user } = useSession();
  if (process.env.NEXT_PUBLIC_CREATOR_SPACE_ENABLED !== "true") {
    return <h1 className="py-8 text-2xl font-semibold">Creator Space is unavailable</h1>;
  }
  return <CreatorProfile key={user.id} />;
}
