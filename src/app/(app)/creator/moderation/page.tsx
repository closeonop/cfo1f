"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Entry = { id: string; postId: string; title: string; body: string; handle: string; reason: string | null };
type Page = { items: Entry[]; nextCursor: string | null };
type Action = "hide" | "restore" | "remove" | "dismiss";
const labels: Record<Action, string> = {
  hide: "Hide post", restore: "Restore post", remove: "Remove post", dismiss: "Dismiss reports",
};

function ModerationQueue() {
  const [hidden, setHidden] = useState(false);
  const [page, setPage] = useState<Page>();
  const [selected, setSelected] = useState<{ entryId: string; postId: string; action: Action }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const path = `/admin/content?hidden=${hidden}`;

  useEffect(() => {
    let active = true;
    api<Page>(path).then(
      (data) => { if (active) setPage(data); },
      (failure: unknown) => { if (active) setError(message(failure)); },
    );
    return () => { active = false; };
  }, [path, revision]);

  function selectTab(value: boolean) {
    if (value === hidden) return;
    setError("");
    setNotice("");
    setPage(undefined);
    setSelected(undefined);
    setHidden(value);
  }

  async function act(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const reason = new FormData(event.currentTarget).get("reason");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/admin/content/posts/${selected.postId}/${selected.action}`, { method: "POST", body: { reason } });
      setPage((previous) => previous && { ...previous, items: previous.items.filter(({ postId }) => postId !== selected.postId) });
      setSelected(undefined);
      setNotice("Moderation decision saved.");
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }

  async function more() {
    if (!page?.nextCursor || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await api<Page>(`${path}&cursor=${encodeURIComponent(page.nextCursor)}`);
      setPage({ items: [...page.items, ...next.items], nextCursor: next.nextCursor });
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }

  const actions: Action[] = hidden ? ["restore", "remove"] : ["hide", "dismiss", "remove"];
  return <section className="mx-auto max-w-4xl space-y-6 py-8">
    <h1 className="border-t-2 border-primary pt-6 text-[clamp(2rem,5vw,3.75rem)] font-semibold tracking-tight">Content moderation</h1>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" aria-pressed={!hidden} disabled={busy} onClick={() => selectTab(false)}>Open reports</Button>
      <Button size="sm" variant="outline" aria-pressed={hidden} disabled={busy} onClick={() => selectTab(true)}>Hidden posts</Button>
    </div>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!page && !error && <p role="status">Loading moderation queue…</p>}
    {!page && error && <Button variant="outline" onClick={() => {
      setError(""); setRevision((value) => value + 1);
    }}>Try again</Button>}
    {page?.items.length === 0 && <p className="text-sm text-muted-foreground">{hidden ? "No hidden posts." : "No open reports."}</p>}
    {page?.items.map((entry) => <article key={entry.id} className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="break-words text-lg font-semibold">{entry.title}</h2>
        <p className="text-sm text-muted-foreground">@{entry.handle}</p>
      </div>
      <details className="space-y-2">
        <summary className="cursor-pointer text-sm font-medium">Read post</summary>
        <p className="whitespace-pre-wrap break-words">{entry.body}</p>
      </details>
      {entry.reason && <p className="whitespace-pre-wrap break-words text-sm"><strong>Report reason</strong><br />{entry.reason}</p>}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => <Button key={action} variant="outline" size="sm" disabled={busy}
          onClick={() => setSelected({ entryId: entry.id, postId: entry.postId, action })}>{labels[action]}</Button>)}
      </div>
      {selected?.entryId === entry.id && (
        <form key={selected.action} className="space-y-3 border-t pt-4" onSubmit={act}>
          <label className="grid gap-2 text-sm font-medium">Reason for decision
            <textarea name="reason" rows={3} required maxLength={500} disabled={busy}
              className="rounded-md border border-input bg-background px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy}>{labels[selected.action]}</Button>
            <Button size="sm" type="button" variant="outline" disabled={busy} onClick={() => setSelected(undefined)}>Cancel</Button>
          </div>
        </form>
      )}
    </article>)}
    {page?.nextCursor && <Button variant="outline" disabled={busy} onClick={more}>Load more</Button>}
  </section>;
}

function message(failure: unknown) {
  return failure instanceof Error ? failure.message : "Could not load or update the queue.";
}

export default function ModerationPage() {
  const { user } = useSession();
  if (process.env.NEXT_PUBLIC_CREATOR_SPACE_ENABLED !== "true" || user.role !== "ADMIN") {
    return <h1 className="py-8 text-2xl font-semibold">Content moderation is unavailable</h1>;
  }
  return <ModerationQueue key={user.id} />;
}
