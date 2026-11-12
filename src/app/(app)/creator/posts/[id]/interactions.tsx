"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Likes = { count: number; liked: boolean; canWrite: boolean };
type Comment = { id: string; body: string; handle: string; displayName: string; mine: boolean };
type Page = { items: Comment[]; nextCursor: string | null };

export function PostInteractions({ id }: { id: string }) {
  const path = `/creator/posts/${encodeURIComponent(id)}`;
  const [likes, setLikes] = useState<Likes>();
  const [page, setPage] = useState<Page>();
  const [editing, setEditing] = useState<Comment>();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api<Likes>(`${path}/like`), api<Page>(`${path}/comments`)]).then(
      ([summary, comments]) => {
        if (active) { setLikes(summary); setPage(comments); }
      },
      (failure: unknown) => { if (active) setError(message(failure)); },
    );
    return () => { active = false; };
  }, [path, revision]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      if (editing) {
        await api(`${path}/comments/${editing.id}`, { method: "PUT", body: { body } });
        setPage((previous) => previous && { ...previous, items: previous.items.map((comment) =>
          comment.id === editing.id ? { ...comment, body: body.trim() } : comment) });
      } else {
        const comment = await api<Comment>(`${path}/comments`, { method: "POST", body: { body } });
        setPage((previous) => previous && { ...previous, items: [comment, ...previous.items] });
      }
      setBody("");
      setEditing(undefined);
      setNotice(editing ? "Comment updated." : "Comment posted.");
    });
  }

  return <section aria-labelledby="post-comments" className="space-y-6 border-t pt-5">
    <div className="flex flex-wrap gap-2">
      {likes && <Button variant="outline" size="sm" disabled={busy || !likes.canWrite} aria-pressed={likes.liked}
        onClick={() => void run(async () => {
          setLikes(await api<Likes>(`${path}/like`, { method: likes.liked ? "DELETE" : "PUT" }));
        })}>{likes.liked ? "Liked" : "Like"} · {likes.count}</Button>}
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => {
        await navigator.clipboard.writeText(new URL(`/creator/posts/${id}`, window.location.origin).href);
        setNotice("Link copied.");
      })}>Copy link</Button>
      <Button variant="outline" size="sm" disabled={busy} aria-expanded={reporting}
        onClick={() => setReporting(!reporting)}>Report post</Button>
    </div>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {reporting && <form className="space-y-3 rounded-2xl border bg-card p-4" onSubmit={(event) => {
      event.preventDefault();
      const reason = new FormData(event.currentTarget).get("reason");
      void run(async () => {
        await api(`${path}/reports`, { method: "POST", body: { reason } });
        setReporting(false);
        setNotice("Report submitted for admin review.");
      });
    }}>
      <label className="grid gap-2 text-sm font-medium">Why are you reporting this post?
        <textarea name="reason" rows={3} maxLength={500} required disabled={busy}
          className="rounded-md border border-input bg-background px-3 py-2" />
      </label>
      <Button size="sm" disabled={busy}>Submit report</Button>
    </form>}
    <h2 id="post-comments" className="text-xl font-semibold">Comments</h2>
    {!page && !error && <p role="status" className="text-sm text-muted-foreground">Loading comments…</p>}
    {!page && error && <Button variant="outline" size="sm" onClick={() => {
      setError(""); setRevision((value) => value + 1);
    }}>Try again</Button>}
    {likes && !likes.canWrite && <p className="text-sm text-muted-foreground">Create a creator profile to like or comment.</p>}
    {likes?.canWrite && <form className="space-y-3" onSubmit={save}>
      <label className="grid gap-2 text-sm font-medium">
        {editing ? "Edit comment" : "Add a comment"}
        <textarea className="rounded-md border border-input bg-background px-3 py-2" rows={3}
          required maxLength={2000} disabled={busy} value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || !body.trim()}>{editing ? "Save comment" : "Post comment"}</Button>
        {editing && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => {
          setEditing(undefined); setBody("");
        }}>Cancel</Button>}
      </div>
    </form>}
    {page?.items.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
    {page?.items.map((comment) => <div key={comment.id} className="space-y-2 border-b pb-4">
      <p className="break-words text-sm text-muted-foreground">{comment.displayName} · @{comment.handle}</p>
      <p className="whitespace-pre-wrap break-words">{comment.body}</p>
      {comment.mine && <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => {
          setEditing(comment); setBody(comment.body);
        }}>Edit</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => {
          if (!window.confirm("Delete this comment?")) return;
          void run(async () => {
            await api(`${path}/comments/${comment.id}`, { method: "DELETE" });
            setPage((previous) => previous && { ...previous, items: previous.items.filter(({ id }) => id !== comment.id) });
            if (editing?.id === comment.id) { setEditing(undefined); setBody(""); }
            setNotice("Comment deleted.");
          });
        }}>Delete</Button>
      </div>}
    </div>)}
    {page?.nextCursor && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => {
      const next = await api<Page>(`${path}/comments?cursor=${encodeURIComponent(page.nextCursor!)}`);
      setPage({ items: [...page.items, ...next.items], nextCursor: next.nextCursor });
    })}>Load more comments</Button>}
  </section>;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
