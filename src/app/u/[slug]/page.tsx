import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import { stateName } from "@/lib/states";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: p } = await supabase.from("profiles").select("name, town").eq("slug", slug).maybeSingle();
  return { title: p ? `${p.name} on Groveline` : "Not found", robots: { index: false } };
}

/* A person's page: who they are, the shops they run, and the shops they follow. */
export default async function UserPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: p } = await supabase.from("profiles").select("id, name, town, state, slug, avatar_url, created_at").eq("slug", slug).maybeSingle();
  if (!p) notFound();

  const [{ data: shops }, { data: follows }, userRes] = await Promise.all([
    supabase.from("shops").select("id, name, slug, avatar_url, town, state").eq("owner_id", p.id).order("created_at"),
    supabase.from("follows").select("shops!follows_seller_id_fkey(id, name, slug, avatar_url, town, state)").eq("buyer_id", p.id),
    supabase.auth.getUser(),
  ]);
  const following = (follows ?? []).map((f) => (Array.isArray(f.shops) ? f.shops[0] : f.shops)).filter(Boolean);
  const isMe = userRes.data.user?.id === p.id;
  const since = new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const ShopRow = ({ s }: { s: { id: string; name: string; slug: string; avatar_url: string | null; town: string; state: string } }) => (
    <Link href={`/s/${s.slug}`} className="tag-card flex items-center gap-4 p-4">
      <Avatar url={s.avatar_url} name={s.name} size={44} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{s.name}</p>
        <p className="text-sm text-muted">{s.town}, {s.state}</p>
      </div>
    </Link>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar url={p.avatar_url} name={p.name} size={88} />
        <div className="grow">
          <h1 className="text-3xl font-semibold">{p.name}</h1>
          <p className="mt-1 text-muted">{p.town}, {stateName(p.state)}. Been here since {since}.</p>
        </div>
        {isMe && <Link href="/dashboard/settings" className="btn btn-outline">Edit profile</Link>}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{isMe ? "My shops" : `${p.name}'s shops`}</h2>
        {shops && shops.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{shops.map((s) => <ShopRow key={s.id} s={s} />)}</div>
        ) : (
          <p className="tag-card mt-3 p-4 text-muted">{isMe ? "No shop yet." : "Nothing here yet."}{isMe && <> <Link href="/dashboard" className="text-grove underline">Start one</Link>, it only takes a minute.</>}</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Following {following.length > 0 ? `(${following.length})` : ""}</h2>
        {following.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{following.map((s) => <ShopRow key={s.id} s={s} />)}</div>
        ) : (
          <p className="tag-card mt-3 p-4 text-muted">{isMe ? "You haven't followed anyone yet." : `${p.name} isn't following anyone yet.`}</p>
        )}
      </section>
    </div>
  );
}
