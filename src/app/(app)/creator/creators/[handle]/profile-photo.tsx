"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { completeImage, imageTypes, reserveImage, uploadDirect, validImage } from "../../direct-image";

const path = "/creator/profile/avatar";

export function ProfilePhoto({ profile, onChange }: {
  profile: { displayName: string; avatar: string | null; mine: boolean; imageUploads: boolean };
  onChange: () => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setError("");
    setBusy(true);
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update your photo."); }
    finally { setBusy(false); }
  }

  async function attach(id: string) {
    await completeImage(path, id);
    await onChange();
    setPendingId(undefined);
  }

  return <div className="-mt-10 space-y-2 sm:-mt-12">
    <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-primary/15 text-2xl font-semibold text-primary sm:size-24">
      {profile.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary handles authenticated delivery.
        <img src={profile.avatar} alt="" width={96} height={96} className="size-full object-cover" />
      ) : <span aria-hidden="true">{profile.displayName.trim().slice(0, 1).toUpperCase()}</span>}
    </div>
    {profile.mine && <>
      <input ref={input} type="file" accept={imageTypes} hidden onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!validImage(file)) { setError("Choose a JPG, PNG, or WebP photo up to 2 MB."); return; }
        void run(async () => {
          const reservation = await reserveImage(path, file);
          await uploadDirect(reservation, file);
          setPendingId(reservation.id);
          await attach(reservation.id);
        });
      }} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy || !profile.imageUploads}
          onClick={() => input.current?.click()}><Camera />{busy ? "Updating…" : profile.avatar ? "Change photo" : "Add profile photo"}</Button>
        {pendingId && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => attach(pendingId))}>Retry attachment</Button>}
        {profile.avatar && <Button size="sm" variant="ghost" disabled={busy || !profile.imageUploads} onClick={() => void run(async () => {
          await api(path, { method: "DELETE" });
          setPendingId(undefined);
          await onChange();
        })}>Remove photo</Button>}
      </div>
      {!profile.imageUploads && <p className="text-xs text-muted-foreground">Image storage is unavailable.</p>}
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
