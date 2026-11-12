"use client";

import { useParams } from "next/navigation";
import { creatorEnabled } from "../../profile-state";
import { CreatorProfile } from "./profile-view";

export default function CreatorProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  if (!creatorEnabled) return <h1 className="py-8 text-2xl font-semibold">Creator Space is unavailable</h1>;
  return <CreatorProfile key={handle} handle={handle} />;
}
