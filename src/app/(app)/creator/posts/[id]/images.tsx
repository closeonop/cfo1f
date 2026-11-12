"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CloudImage, type CloudImageData } from "../../cloud-image";
import { completeImage, imageTypes, reserveImage, uploadDirect, validImage } from "../../direct-image";

type Gallery = { images: CloudImageData[]; canUpload: boolean };

export function PostImages({ id }: { id: string }) {
  const path = `/creator/posts/${encodeURIComponent(id)}/images`;
  const [gallery, setGallery] = useState<Gallery>();
  const [revision, setRevision] = useState(0);
  const [uploadId, setUploadId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<Gallery>(path).then(
      (result) => { if (active) setGallery(result); },
      (failure: unknown) => { if (active) setError(message(failure)); },
    );
    return () => { active = false; };
  }, [path, revision]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }

  async function attach(reservation: string) {
    await completeImage(path, reservation);
    setUploadId(undefined);
    setRevision((value) => value + 1);
    setNotice("Image attached.");
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("file");
    if (!(file instanceof File) || !validImage(file)) {
      setError("Choose a JPG, PNG, or WebP image up to 2 MB.");
      return;
    }
    void run(async () => {
      const reservation = await reserveImage(path, file, String(values.get("alt") ?? ""));
      setUploadId(reservation.id);
      await uploadDirect(reservation, file);
      form.reset();
      await attach(reservation.id);
    });
  }

  async function remove(imageId: string) {
    await api(`${path}/${encodeURIComponent(imageId)}`, { method: "DELETE" });
    if (imageId === uploadId) setUploadId(undefined);
    setGallery((value) => value && { ...value, images: value.images.filter((image) => image.id !== imageId) });
    setNotice("Image removed.");
  }

  if (!gallery?.images.length && !gallery?.canUpload && !error) return null;
  return <section id="images" aria-label="Post images" className="space-y-4">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {gallery?.images.map((image) => (
      <figure key={image.id} className="space-y-2">
        <CloudImage image={image} />
        {gallery.canUpload && <Button variant="outline" size="sm" disabled={busy} onClick={() => {
          if (window.confirm("Remove this image?")) void run(() => remove(image.id));
        }}>Remove image</Button>}
      </figure>
    ))}
    {uploadId && <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => attach(uploadId))}>Retry attachment</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => remove(uploadId))}>Cancel upload</Button>
    </div>}
    {gallery?.canUpload && gallery.images.length < 5 && !uploadId && (
      <form className="grid gap-3 rounded-2xl border bg-card p-4 sm:p-5" onSubmit={upload}>
        <label className="grid gap-2 text-sm font-medium">Add an image
          <Input type="file" name="file" accept={imageTypes} required disabled={busy} />
        </label>
        <label className="grid gap-2 text-sm font-medium">Image description
          <Input name="alt" maxLength={200} required disabled={busy} />
        </label>
        <p className="text-sm text-muted-foreground">JPG, PNG, or WebP up to 2 MB. Five images per post.</p>
        <Button size="sm" className="justify-self-start" disabled={busy}>{busy ? "Uploading…" : "Upload image"}</Button>
      </form>
    )}
  </section>;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Could not load or save the image.";
}
