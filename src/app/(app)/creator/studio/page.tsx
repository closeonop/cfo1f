"use client";

import Link from "next/link";
import { CreatorPosts } from "../posts";
import { creatorEnabled, useCreatorProfile } from "../profile-state";

export default function CreatorStudio() {
  const { state, error } = useCreatorProfile();
  if (!creatorEnabled) return <h1 className="py-8 text-2xl font-semibold">Creator Space is unavailable</h1>;
  if (error) return <p role="alert">{error}</p>;
  if (!state) return <p role="status">Loading Studio…</p>;
  if (!state.profile) return <Link className="underline" href="/creator/profile/edit">Set up your creator profile</Link>;
  return <CreatorPosts canWrite studioMode />;
}
