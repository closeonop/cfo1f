"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreatorPosts } from "./posts";
import { Composer } from "./composer";
import { creatorEnabled, useCreatorProfile } from "./profile-state";

export default function CreatorHome() {
  const { state, error } = useCreatorProfile();
  const [revision, setRevision] = useState(0);
  if (!creatorEnabled) return <h1 className="py-8 text-2xl font-semibold">Creator Space is unavailable</h1>;
  return <div className="mx-auto max-w-3xl space-y-4">
    <h1 className="border-b pb-4 text-2xl font-semibold tracking-tight">Home</h1>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {state?.profile && <Composer imageUploads={state.imageUploads} onPublished={() => setRevision((value) => value + 1)} />}
    {state && !state.profile && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <p className="text-sm">Set up your creator profile to start posting.</p>
      <Button asChild size="sm"><Link href="/creator/profile/edit">Set up profile</Link></Button>
    </div>}
    <CreatorPosts key={revision} canWrite={!!state?.profile} />
  </div>;
}
