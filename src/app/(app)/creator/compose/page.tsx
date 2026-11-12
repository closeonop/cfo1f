"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Composer } from "../composer";
import { creatorEnabled, useCreatorProfile } from "../profile-state";

export default function ComposePage() {
  const router = useRouter();
  const { state, error } = useCreatorProfile();
  if (!creatorEnabled) return <h1 className="py-8 text-2xl font-semibold">Creator Space is unavailable</h1>;
  if (error) return <p role="alert">{error}</p>;
  if (!state) return <p role="status">Loading composer…</p>;
  return <div className="mx-auto max-w-3xl">
    {state.profile ? <Composer imageUploads={state.imageUploads} onPublished={() => router.push("/creator")} />
      : <Link className="underline" href="/creator/profile/edit">Set up your creator profile to post</Link>}
  </div>;
}
