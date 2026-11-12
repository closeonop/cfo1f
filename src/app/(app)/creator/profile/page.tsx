"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { creatorEnabled, useCreatorProfile } from "../profile-state";
import { CreatorProfile } from "../creators/[handle]/profile-view";

export default function MyCreatorProfile() {
  const { state, error } = useCreatorProfile();
  if (!creatorEnabled) return <h1 className="py-8 text-2xl font-semibold">Creator Space is unavailable</h1>;
  if (error) return <p role="alert">{error}</p>;
  if (!state) return <p role="status">Opening your profile…</p>;
  if (!state.profile) return <Button asChild><Link href="/creator/profile/edit">Set up your creator profile</Link></Button>;
  return <CreatorProfile key={state.profile.handle} handle={state.profile.handle} />;
}
