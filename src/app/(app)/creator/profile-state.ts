"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Profile = { id: string; handle: string; displayName: string; bio: string };
export type CreatorProfileState = { profile: Profile | null; demoVerification: boolean; imageUploads: boolean };
export const creatorEnabled = process.env.NEXT_PUBLIC_CREATOR_SPACE_ENABLED === "true";

export function useCreatorProfile() {
  const [state, setState] = useState<CreatorProfileState>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!creatorEnabled) return;
    let active = true;
    api<CreatorProfileState>("/creator/profile/me").then(
      (result) => { if (active) setState(result); },
      (failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : "Could not load your profile."); },
    );
    return () => { active = false; };
  }, []);
  return { state, error };
}
