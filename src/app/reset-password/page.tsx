"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don't match. Please type them again.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword: password },
        skipAuth: true,
      });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          This link is missing its reset code. Please request a new email.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 10 characters, with at least one letter and one number.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Type it again</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Choose a new password</CardTitle>
          <CardDescription>Pick something you haven&apos;t used before.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="animate-pulse text-sm text-muted-foreground">Loading…</div>}>
            <ResetForm />
          </Suspense>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
