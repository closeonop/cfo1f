"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Post } from "../../posts";
import { PostInteractions } from "./interactions";
import { PostImages } from "./images";

const enabled = process.env.NEXT_PUBLIC_CREATOR_SPACE_ENABLED === "true";

export default function CreatorPost() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<{ id: string; post?: Post; error?: string }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api<Post>(`/creator/posts/${encodeURIComponent(id)}`).then(
      (post) => { if (active) setResult({ id, post }); },
      (error: unknown) => { if (active) setResult({ id, error: error instanceof Error ? error.message : "Post unavailable." }); },
    );
    return () => { active = false; };
  }, [id]);

  if (!enabled) return <h1 className="py-8 text-2xl font-semibold">Creator Space is unavailable</h1>;
  const current = result?.id === id ? result : undefined;
  return <div className="mx-auto max-w-3xl space-y-8 py-8">
    <Link className="text-sm text-primary underline" href="/creator">Back to Creator Space</Link>
    {!current && <p role="status">Loading post…</p>}
    {current?.error && <p role="alert">{current.error}</p>}
    {current?.post && <article className="space-y-5 border-t-2 border-primary pt-6">
      <h1 className="break-words text-[clamp(2rem,5vw,4rem)] font-semibold leading-tight tracking-tight">{current.post.title}</h1>
      <p className="break-words text-sm text-muted-foreground">{current.post.displayName} ·{" "}
        <Link className="hover:underline" href={`/creator/creators/${current.post.handle}`}>@{current.post.handle}</Link>
        {!current.post.publishedAt && " · Draft"}</p>
      {current.post.body !== current.post.title && <p className="whitespace-pre-wrap break-words leading-relaxed">{current.post.body}</p>}
      <PostImages key={`images-${id}`} id={id} />
      {current.post.publishedAt && <PostInteractions key={id} id={id} />}
    </article>}
  </div>;
}
