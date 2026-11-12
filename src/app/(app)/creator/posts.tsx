"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CloudImage, type CloudImageData } from "./cloud-image";

export type Post = {
  id: string;
  title: string;
  body: string;
  handle: string;
  displayName: string;
  publishedAt: string | null;
};
type Page = { items: Post[]; nextCursor: string | null; previews: Record<string, CloudImageData> };

type View = "latest" | "following" | "studio";

export function CreatorPosts({ canWrite, handle, studioMode = false }: { canWrite: boolean; handle?: string; studioMode?: boolean }) {
  const [view, setView] = useState<View>(studioMode ? "studio" : "latest");
  const [editing, setEditing] = useState<Post | null>(null);
  const [page, setPage] = useState<Page>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const studio = view === "studio";
  const path = studio ? "/creator/posts/mine"
    : `/creator/feed?tab=${view}${handle ? `&handle=${encodeURIComponent(handle)}` : ""}`;
  const more = useRef<HTMLButtonElement>(null);
  const loadingMore = useRef(false);

  useEffect(() => {
    let active = true;
    api<Page>(path).then(
      (result) => { if (active) setPage(result); },
      (failure: unknown) => { if (active) setError(errorMessage(failure)); },
    );
    return () => { active = false; };
  }, [path, revision]);

  function select(next: View) {
    if (next === view) return;
    setPage(undefined);
    setError("");
    setNotice("");
    setEditing(null);
    setView(next);
  }

  const loadMore = useCallback(async () => {
    if (!page?.nextCursor || pending || loadingMore.current) return;
    loadingMore.current = true;
    setPending(true);
    setError("");
    try {
      const next = await api<Page>(`${path}${studio ? "?" : "&"}cursor=${encodeURIComponent(page.nextCursor)}`);
      const known = new Set(page.items.map(({ id }) => id));
      setPage({ items: [...page.items, ...next.items.filter(({ id }) => !known.has(id))],
        nextCursor: next.nextCursor, previews: { ...page.previews, ...next.previews } });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      loadingMore.current = false;
      setPending(false);
    }
  }, [page, path, pending, studio]);

  useEffect(() => {
    if (studio || error || pending || !page?.nextCursor || !more.current
      || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void loadMore();
    }, { rootMargin: "240px 0px" });
    observer.observe(more.current);
    return () => observer.disconnect();
  }, [error, loadMore, page?.nextCursor, pending, studio]);

  async function mutate(operation: () => Promise<unknown>, success: string) {
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await operation();
      setEditing(null);
      setNotice(success);
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const fields = new FormData(event.currentTarget);
    const body = { title: fields.get("title"), body: fields.get("body") };
    void mutate(() => api(`/creator/posts/${editing.id}`, { method: "PUT", body }), "Changes saved.");
  }

  const selected = editing;
  return (
    <section className="mx-auto max-w-3xl space-y-4 py-4" aria-labelledby="creator-posts-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight" id="creator-posts-heading">
          {studio ? "Studio" : handle ? "Posts" : view === "following" ? "Following" : "Latest posts"}
        </h2>
        {canWrite && !handle && !studioMode && <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" aria-pressed={view === "latest"} disabled={pending} onClick={() => select("latest")}>Latest</Button>
          <Button variant="outline" size="sm" aria-pressed={view === "following"} disabled={pending} onClick={() => select("following")}>Following</Button>
        </div>}
        {studioMode && <Button asChild size="sm"><Link href="/creator/compose">New post</Link></Button>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {editing && <form key={selected?.id ?? "new"} onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-5">
        <label className="grid gap-2 text-sm font-medium">Title
          <Input name="title" required maxLength={150} defaultValue={selected?.title} />
        </label>
        <label className="grid gap-2 text-sm font-medium">Post
          <textarea name="body" required maxLength={20000} rows={8} defaultValue={selected?.body}
            className="rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending}>{selected?.publishedAt ? "Save changes" : "Save draft"}</Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(null)}>Cancel</Button>
        </div>
      </form>}
      {!page && !error && <p role="status" className="text-sm text-muted-foreground">Loading posts…</p>}
      {!page && error && <Button variant="outline" onClick={() => { setError(""); setRevision((value) => value + 1); }}>Try again</Button>}
      {page?.items.length === 0 && <p className="text-sm text-muted-foreground">
        {studio ? "You have no posts yet." : view === "following" ? <>
          No posts from creators you follow yet. <Link className="text-primary underline" href="/creator/people">Find people to follow</Link>
        </> : "No posts have been published yet."}
      </p>}
      {page?.items.map((post) => <article key={post.id} className="space-y-3 rounded-2xl border bg-card p-5 sm:p-6">
        <h3 className="break-words text-lg font-semibold"><Link className="hover:underline" href={`/creator/posts/${post.id}`}>{post.title}</Link></h3>
        <p className="break-words text-sm text-muted-foreground">{post.displayName} ·{" "}
          <Link className="hover:underline" href={`/creator/creators/${post.handle}`}>@{post.handle}</Link>
          {!post.publishedAt && " · Draft"}</p>
        {post.body !== post.title && <p className="line-clamp-3 whitespace-pre-wrap break-words">{post.body.slice(0, 500)}</p>}
        {page.previews[post.id] && <CloudImage image={page.previews[post.id]} />}
        {studio && <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(post)}>Edit</Button>
          <Button asChild size="sm" variant="outline"><Link href={`/creator/posts/${post.id}#images`}>Manage images</Link></Button>
          {!post.publishedAt && <Button size="sm" disabled={pending} onClick={() => void mutate(
            () => api(`/creator/posts/${post.id}/publish`, { method: "POST" }), "Post published.",
          )}>Publish</Button>}
          <Button size="sm" variant="outline" disabled={pending} onClick={() => {
            if (window.confirm("Delete this post?")) void mutate(
              () => api(`/creator/posts/${post.id}`, { method: "DELETE" }), "Post deleted.",
            );
          }}>Delete</Button>
        </div>}
      </article>)}
      {page?.nextCursor && <Button ref={more} variant="outline" disabled={pending} onClick={loadMore}>
        {pending ? "Loading…" : "Load more"}
      </Button>}
    </section>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
