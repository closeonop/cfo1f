"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email },
        skipAuth: true,
      });
      setMessage(res.message);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            Enter your work email and we&apos;ll send you a link to choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="space-y-4">
              <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success" role="status">
                {message}
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-center text-sm">
                <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
