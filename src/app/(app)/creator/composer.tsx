"use client";

import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeImage, imageTypes, reserveImage, uploadDirect, validImage } from "./direct-image";
import type { Post } from "./posts";

type Attachment = { key: string; file: File; alt: string; id?: string; ready?: boolean };

export function Composer({ imageUploads, onPublished }: { imageUploads: boolean; onPublished: () => void }) {
  const [draft, setDraft] = useState<string>();
  const [images, setImages] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const files = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") !== "draft";
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const text = String(fields.get("body") ?? "").trim();
      if (!text) throw new Error("Write something before posting.");
      const title = String(fields.get("title") ?? "").trim() || text.split(/\r?\n/, 1)[0].slice(0, 150);
      const body = { title, body: text };
      const post = await api<Post>(draft ? `/creator/posts/${draft}` : "/creator/posts", { method: draft ? "PUT" : "POST", body });
      setDraft(post.id);
      const path = `/creator/posts/${post.id}/images`;
      for (const image of images) {
        if (image.ready) continue;
        let id = image.id;
        if (!id) {
          const reservation = await reserveImage(path, image.file, image.alt);
          try {
            await uploadDirect(reservation, image.file);
          } catch (failure) {
            await api(`${path}/${reservation.id}`, { method: "DELETE" }).catch(() => {});
            throw failure;
          }
          id = reservation.id;
          setImages((items) => items.map((item) => item.key === image.key ? { ...item, id } : item));
        }
        await completeImage(path, id);
        setImages((items) => items.map((item) => item.key === image.key ? { ...item, ready: true } : item));
      }
      if (publish) {
        await api(`/creator/posts/${post.id}/publish`, { method: "POST" });
        onPublished();
      }
      form.reset();
      setImages([]);
      setDraft(undefined);
      setNotice(publish ? "Post published." : "Draft saved in Studio.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save your post.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(image: Attachment) {
    setError("");
    setBusy(true);
    try {
      if (draft && image.id) await api(`/creator/posts/${draft}/images/${image.id}`, { method: "DELETE" });
      setImages((items) => items.filter(({ key }) => key !== image.key));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not remove the image.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5" aria-label="Create a post">
    <h2 className="text-lg font-semibold">Create a post</h2>
    {error && <p role="alert" className="text-sm text-destructive">{error}{draft && <> Your draft is in <Link href="/creator/studio" className="underline">Studio</Link>.</>}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <form className="space-y-3" onSubmit={submit}>
      <Input name="title" aria-label="Title (optional)" placeholder="Title (optional)" maxLength={150} disabled={busy} />
      <textarea name="body" aria-label="Post text" placeholder="What’s happening?" required maxLength={20000} rows={3}
        disabled={busy} className="w-full rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring" />
      {images.map((image) => <div key={image.key} className="grid gap-2 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm">{image.file.name}{image.ready && " · Attached"}</span>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void remove(image)}>Remove</Button>
        </div>
        <Input aria-label={`Image description for ${image.file.name}`} placeholder="Image description" value={image.alt}
          required maxLength={200} disabled={busy || !!image.id} onChange={(event) => {
            const alt = event.target.value;
            setImages((items) => items.map((item) => item.key === image.key ? { ...item, alt } : item));
          }} />
      </div>)}
      <input ref={files} type="file" accept={imageTypes} multiple hidden onChange={(event) => {
        const selected = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (images.length + selected.length > 5 || selected.some((file) => !validImage(file))) {
          setError("Choose up to five JPG, PNG, or WebP images, each up to 2 MB.");
          return;
        }
        setError("");
        setImages((items) => [...items, ...selected.map((file) => ({ key: crypto.randomUUID(), file, alt: "" }))]);
      }} />
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button type="button" variant="ghost" size="sm" disabled={busy || images.length >= 5 || !imageUploads}
          onClick={() => files.current?.click()}><ImagePlus /> Add images</Button>
        {!imageUploads && <span className="text-xs text-muted-foreground">Image storage is unavailable.</span>}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" value="draft" disabled={busy}>Save draft</Button>
          <Button size="sm" value="publish" disabled={busy}>{busy ? "Saving…" : "Post"}</Button>
        </div>
      </div>
    </form>
  </section>;
}
