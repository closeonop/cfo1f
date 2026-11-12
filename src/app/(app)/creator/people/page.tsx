"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { creatorEnabled, useCreatorProfile } from "../profile-state";

type Person = { handle: string; displayName: string; bio: string; mine: boolean; following: boolean; canFollow: boolean };
type Page = { items: Person[]; nextCursor: string | null };

export default function PeoplePage() {
  const { state } = useCreatorProfile();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<Page>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const path = `/creator/creators?q=${encodeURIComponent(query)}`;
  useEffect(() => {
    if (!creatorEnabled) return;
    let active = true;
    api<Page>(path).then(
      (result) => { if (active) setPage(result); },
      (failure: unknown) => { if (active) setError(message(failure)); },
    );
    return () => { active = false; };
  }, [path, revision]);

  function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(undefined);
    setError("");
    setQuery(search.trim());
    setRevision((value) => value + 1);
  }

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }

  if (!creatorEnabled) return <h1 className="py-8 text-2xl font-semibold">Creator Space is unavailable</h1>;
  return <section className="mx-auto max-w-3xl space-y-5">
    <h1 className="border-b pb-4 text-2xl font-semibold tracking-tight">People</h1>
    <form className="flex gap-2" onSubmit={find}>
      <Input aria-label="Search by name or handle" placeholder="Search by name or handle" value={search}
        onChange={(event) => setSearch(event.target.value)} maxLength={80} disabled={busy} />
      <Button type="submit" variant="outline" disabled={busy}>Search</Button>
    </form>
    {state && !state.profile && <p className="text-sm text-muted-foreground">
      <Link href="/creator/profile/edit" className="text-primary underline">Set up your creator profile</Link> to follow people.
    </p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!page && !error && <p role="status" className="text-sm text-muted-foreground">Loading people…</p>}
    {page?.items.length === 0 && <p className="text-sm text-muted-foreground">{query ? "No creators match that search." : "No creators yet."}</p>}
    <ul className="space-y-2">
      {page?.items.map((person) => <li key={person.handle} className="flex items-start justify-between gap-4 rounded-2xl border bg-card p-4">
        <div className="min-w-0">
          <Link href={person.mine ? "/creator/profile" : `/creator/creators/${encodeURIComponent(person.handle)}`}
            className="break-words font-semibold hover:underline">{person.displayName}</Link>
          <p className="text-sm text-muted-foreground">@{person.handle}{person.mine && " · You"}</p>
          {person.bio && <p className="mt-1 line-clamp-2 break-words text-sm">{person.bio}</p>}
        </div>
        {person.canFollow && <Button size="sm" variant={person.following ? "outline" : "default"}
          disabled={busy} aria-label={`${person.following ? "Unfollow" : "Follow"} @${person.handle}`}
          onClick={() => void run(async () => {
            await api(`/creator/creators/${encodeURIComponent(person.handle)}/follow`,
              { method: person.following ? "DELETE" : "PUT" });
            setPage((previous) => previous && { ...previous, items: previous.items.map((item) =>
              item.handle === person.handle ? { ...item, following: !person.following } : item) });
          })}>{person.following ? "Unfollow" : "Follow"}</Button>}
      </li>)}
    </ul>
    {page?.nextCursor && <Button variant="outline" disabled={busy} onClick={() => void run(async () => {
      const next = await api<Page>(`${path}&after=${encodeURIComponent(page.nextCursor!)}`);
      setPage({ items: [...page.items, ...next.items], nextCursor: next.nextCursor });
    })}>Load more people</Button>}
  </section>;
}

function message(failure: unknown) {
  return failure instanceof Error ? failure.message : "Could not load or update the people list.";
}
