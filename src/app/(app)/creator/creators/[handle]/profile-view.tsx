"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CreatorPosts } from "../../posts";
import { ProfilePhoto } from "./profile-photo";

type Creator = {
  handle: string; displayName: string; bio: string; followers: number; following: boolean; canFollow: boolean;
  mine: boolean; imageUploads: boolean; avatar: string | null;
};
export function CreatorProfile({ handle }: { handle: string }) {
  const path = `/creator/creators/${encodeURIComponent(handle)}`;
  const [profile, setProfile] = useState<Creator>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<Creator>(path).then(
      (creator) => { if (active) setProfile(creator); },
      (failure: unknown) => { if (active) setError(message(failure)); },
    );
    return () => { active = false; };
  }, [path]);

  async function toggle() {
    if (!profile || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`${path}/follow`, { method: profile.following ? "DELETE" : "PUT" });
      setProfile(await api<Creator>(path));
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-3xl space-y-7 py-8">
    <Link className="text-sm text-primary underline" href="/creator">Back to Creator Space</Link>
    {!profile && !error && <p role="status">Loading creator profile…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {profile && <>
      <header className="overflow-hidden rounded-2xl border bg-card">
        <div className="h-24 border-b bg-primary/10 sm:h-32" aria-hidden="true" />
        <div className="space-y-3 px-5 pb-6 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <ProfilePhoto profile={profile} onChange={async () => setProfile(await api<Creator>(path))} />
            {profile.mine && <Button asChild variant="outline" size="sm"><Link href="/creator/profile/edit">Edit profile</Link></Button>}
            {profile.canFollow && <Button variant={profile.following ? "outline" : "default"} disabled={busy}
              aria-pressed={profile.following} onClick={toggle}>{profile.following ? "Unfollow" : "Follow"}</Button>}
          </div>
          <h1 className="break-words text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight">{profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">@{profile.handle} · {profile.followers} {profile.followers === 1 ? "follower" : "followers"}</p>
          {profile.bio && <p className="whitespace-pre-wrap break-words">{profile.bio}</p>}
          {!profile.mine && !profile.canFollow && <Link href="/creator/profile/edit" className="text-sm text-primary underline">
            Set up your creator profile to follow
          </Link>}
        </div>
      </header>
      <CreatorPosts canWrite={false} handle={profile.handle} />
    </>}
  </div>;
}

function message(failure: unknown) {
  return failure instanceof Error ? failure.message : "Could not load or update the creator profile.";
}
