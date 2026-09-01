"use client";
import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";

type Shop = { id: string; name: string; slug: string; avatar_url: string | null };

/* Everything a person is signed up to hear from, with a way out of each. */
export default function Subscriptions({ following, lists }: { following: Shop[]; lists: Shop[] }) {
  const [follows, setFollows] = useState(following);
  const [subs, setSubs] = useState(lists);
  const toast = useToast();

  async function unfollow(id: string) {
    const res = await fetch("/api/follows", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seller_id: id }) });
    if (res.ok) {
      setFollows((f) => f.filter((s) => s.id !== id));
      toast("Unfollowed.", "success");
    } else toast("Couldn't do that. Try again.", "error");
  }
  async function leave(id: string) {
    const res = await fetch("/api/newsletter/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seller_id: id }) });
    if (res.ok) {
      setSubs((l) => l.filter((s) => s.id !== id));
      toast("Off the list.", "success");
    } else toast("Couldn't do that. Try again.", "error");
  }

  const Row = ({ s, action, label }: { s: Shop; action: () => void; label: string }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <Link href={`/s/${s.slug}`} className="flex min-w-0 items-center gap-3 hover:underline">
        <Avatar url={s.avatar_url} name={s.name} size={32} />
        <span className="truncate font-medium">{s.name}</span>
      </Link>
      <button onClick={action} className="shrink-0 text-sm text-muted underline">{label}</button>
    </div>
  );

  return (
    <section className="tag-card mt-4 p-6">
      <h2 className="text-lg font-semibold">Who you hear from</h2>
      <p className="mt-1 text-sm text-muted">Shops you follow and email lists you joined. Each one emails you when they post.</p>

      <h3 className="mt-4 text-sm font-semibold text-muted">Following</h3>
      {follows.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Not following anyone yet. <Link href="/sellers" className="text-grove underline">Find sellers</Link>.</p>
      ) : (
        <div className="mt-1 divide-y divide-cream-dark">{follows.map((s) => <Row key={s.id} s={s} action={() => unfollow(s.id)} label="Unfollow" />)}</div>
      )}

      <h3 className="mt-5 text-sm font-semibold text-muted">Email lists</h3>
      {subs.length === 0 ? (
        <p className="mt-1 text-sm text-muted">You haven&apos;t joined any shop&apos;s email list with this address.</p>
      ) : (
        <div className="mt-1 divide-y divide-cream-dark">{subs.map((s) => <Row key={s.id} s={s} action={() => leave(s.id)} label="Leave list" />)}</div>
      )}
    </section>
  );
}
