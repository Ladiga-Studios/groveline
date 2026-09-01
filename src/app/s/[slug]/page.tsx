import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import FollowButton from "@/components/FollowButton";
import NewsletterForm from "@/components/NewsletterForm";
import Avatar from "@/components/Avatar";
import ShareButton from "@/components/ShareButton";
import FacebookShareButton from "@/components/FacebookShareButton";
import { stateName } from "@/lib/states";
import type { Drop, Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: shop } = await supabase.from("shops").select("name, town, bio").eq("slug", slug).maybeSingle();
  if (!shop) return { title: "Seller not found" };
  return {
    title: `${shop.name} in ${shop.town}`,
    description: shop.bio || `Drops from ${shop.name} in ${shop.town}. Follow to catch every batch.`,
    alternates: { canonical: `/s/${slug}` },
  };
}

type Stats = { followers: number; subscribers: number; drops_posted: number; items_sold: number; sold_out: number; member_since: string };

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: shop } = await supabase
    .from("shops")
    .select("*, owner:profiles!shops_owner_id_fkey(name, slug, avatar_url, payouts_enabled)")
    .eq("slug", slug)
    .maybeSingle();
  if (!shop) notFound();
  const owner = (Array.isArray(shop.owner) ? shop.owner[0] : shop.owner) as { name: string; slug: string; avatar_url: string | null; payouts_enabled: boolean } | null;
  const nowIso = new Date().toISOString();

  const [{ data: active }, { data: past }, statsRes, userRes] = await Promise.all([
    supabase.from("drops").select("*, shops!drops_seller_id_fkey(name, town, state, slug, avatar_url)").eq("seller_id", shop.id).eq("status", "active").gte("pickup_end", nowIso).order("pickup_start", { ascending: true }),
    supabase.from("drops").select("*, shops!drops_seller_id_fkey(name, town, state, slug, avatar_url)").eq("seller_id", shop.id).neq("status", "removed").lt("pickup_end", nowIso).order("pickup_start", { ascending: false }).limit(6),
    supabase.rpc("seller_stats", { p_seller: shop.id }),
    supabase.auth.getUser(),
  ]);
  const stats = (statsRes.data ?? {}) as Partial<Stats>;
  const user = userRes.data.user;
  let following = false;
  if (user) {
    const { data: f } = await supabase.from("follows").select("buyer_id").eq("buyer_id", user.id).eq("seller_id", shop.id).maybeSingle();
    following = !!f;
  }
  const since = stats.member_since ? new Date(stats.member_since).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  const s = shop as Shop;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start gap-5">
        <Avatar url={s.avatar_url} name={s.name} size={88} />
        <div className="min-w-0 grow">
          <h1 className="text-3xl font-semibold">{s.name}</h1>
          <p className="mt-1 text-muted">
            {s.town}, {stateName(s.state)}{since ? `. On Groveline since ${since}` : ""}{owner?.payouts_enabled ? ". Takes cards" : ""}
          </p>
          {owner && (
            <Link href={`/u/${owner.slug}`} className="mt-2 inline-flex items-center gap-2 text-sm text-grove hover:underline">
              <Avatar url={owner.avatar_url} name={owner.name} size={24} />
              Run by {owner.name}
            </Link>
          )}
          {s.bio && <p className="mt-3">{s.bio}</p>}
          {(s.contact_phone || s.social_url) && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {s.contact_phone && <a href={`sms:${s.contact_phone}`} className="text-grove underline">Text {s.contact_phone}</a>}
              {s.social_url && <a href={s.social_url} target="_blank" rel="noopener" className="text-grove underline">Facebook page</a>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <FollowButton sellerId={s.id} initiallyFollowing={following} loggedIn={!!user} />
          <FacebookShareButton url={`${site}/s/${s.slug}`} label="Share" />
          <ShareButton url={`${site}/s/${s.slug}`} title={`${s.name} on Groveline`} label="Copy link" />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Drops posted", stats.drops_posted ?? 0], ["Items sold", stats.items_sold ?? 0], ["Sold out", stats.sold_out ?? 0], ["Followers", (stats.followers ?? 0) + (stats.subscribers ?? 0)]].map(([label, value]) => (
          <div key={String(label)} className="tag-card p-4 text-center">
            <dd className="font-display text-2xl font-semibold text-grove">{value}</dd>
            <dt className="text-xs text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <section className="mt-8" aria-labelledby="active-drops">
        <h2 id="active-drops" className="text-2xl font-semibold">Up for grabs right now</h2>
        {active && active.length > 0 ? (
          <div className="mt-4 grid gap-4">{(active as Drop[]).map((d) => <DropCard key={d.id} drop={d} />)}</div>
        ) : (
          <p className="tag-card mt-4 p-6 text-muted">Nothing posted at the moment. Follow along or drop your email below so you don't miss the next one.</p>
        )}
      </section>

      <section className="tag-card mt-8 p-6" aria-labelledby="newsletter">
        <h2 id="newsletter" className="text-xl font-semibold">Hear about it the moment {s.name} posts</h2>
        <p className="mb-4 mt-1 text-sm text-muted">One email per drop, that's it. Unsubscribe whenever you want.</p>
        <NewsletterForm sellerId={s.id} />
      </section>

      {past && past.length > 0 && (
        <section className="mt-10" aria-labelledby="past-drops">
          <h2 id="past-drops" className="text-xl font-semibold text-muted">What they've posted before</h2>
          <div className="mt-4 grid gap-3 opacity-80">{(past as Drop[]).map((d) => <DropCard key={d.id} drop={d} />)}</div>
        </section>
      )}
    </div>
  );
}
