import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import FollowButton from "@/components/FollowButton";
import NewsletterForm from "@/components/NewsletterForm";
import Avatar from "@/components/Avatar";
import ShareButton from "@/components/ShareButton";
import { stateName } from "@/lib/states";
import type { Drop, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: seller } = await supabase.from("profiles").select("name, farm_name, town, bio").eq("slug", slug).maybeSingle();
  if (!seller) return { title: "Seller not found" };
  const name = seller.farm_name || seller.name;
  return {
    title: `${name} in ${seller.town}`,
    description: seller.bio || `Drops from ${name} in ${seller.town}. Follow to catch every batch.`,
    alternates: { canonical: `/s/${slug}` },
  };
}

type Stats = { followers: number; subscribers: number; drops_posted: number; items_sold: number; sold_out: number; member_since: string };

export default async function SellerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: seller } = await supabase.from("profiles").select("*").eq("slug", slug).maybeSingle<Profile>();
  if (!seller) notFound();

  const [{ data: active }, { data: past }, statsRes, userRes] = await Promise.all([
    supabase
      .from("drops")
      .select("*, profiles!drops_seller_id_fkey(name, farm_name, town, state, slug, avatar_url)")
      .eq("seller_id", seller.id).eq("status", "active").gte("pickup_end", new Date().toISOString())
      .order("pickup_start", { ascending: true }),
    supabase
      .from("drops")
      .select("*, profiles!drops_seller_id_fkey(name, farm_name, town, state, slug, avatar_url)")
      .eq("seller_id", seller.id).neq("status", "removed").lt("pickup_end", new Date().toISOString())
      .order("pickup_start", { ascending: false }).limit(6),
    supabase.rpc("seller_stats", { p_seller: seller.id }),
    supabase.auth.getUser(),
  ]);
  const stats = (statsRes.data ?? {}) as Partial<Stats>;
  const user = userRes.data.user;
  let following = false;
  if (user) {
    const { data: f } = await supabase.from("follows").select("buyer_id").eq("buyer_id", user.id).eq("seller_id", seller.id).maybeSingle();
    following = !!f;
  }

  const name = seller.farm_name || seller.name;
  const since = stats.member_since ? new Date(stats.member_since).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start gap-5">
        <Avatar url={seller.avatar_url} name={name} size={88} />
        <div className="min-w-0 grow">
          <h1 className="text-3xl font-semibold">{name}</h1>
          <p className="mt-1 text-muted">
            {seller.town}, {stateName(seller.state)}{since ? `. On Groveline since ${since}` : ""}
            {seller.payouts_enabled ? ". Takes cards" : ""}
          </p>
          {seller.bio && <p className="mt-3">{seller.bio}</p>}
          {(seller.contact_phone || seller.social_url) && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {seller.contact_phone && <a href={`sms:${seller.contact_phone}`} className="text-grove underline">Text {seller.contact_phone}</a>}
              {seller.social_url && <a href={seller.social_url} target="_blank" rel="noopener" className="text-grove underline">Facebook page</a>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <FollowButton sellerId={seller.id} initiallyFollowing={following} loggedIn={!!user} />
          <ShareButton url={`${site}/s/${seller.slug}`} title={`${name} on Groveline`} label="Share" />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Drops posted", stats.drops_posted ?? 0],
          ["Items sold", stats.items_sold ?? 0],
          ["Sold out", stats.sold_out ?? 0],
          ["Following", (stats.followers ?? 0) + (stats.subscribers ?? 0)],
        ].map(([label, value]) => (
          <div key={String(label)} className="tag-card p-4 text-center">
            <dd className="font-display text-2xl font-semibold text-grove">{value}</dd>
            <dt className="text-xs text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <section className="mt-8" aria-labelledby="active-drops">
        <h2 id="active-drops" className="text-2xl font-semibold">Claimable now</h2>
        {active && active.length > 0 ? (
          <div className="mt-4 grid gap-4">{(active as Drop[]).map((d) => <DropCard key={d.id} drop={d} />)}</div>
        ) : (
          <p className="tag-card mt-4 p-6 text-muted">Nothing active right now. Follow or join the email list below to catch the next one.</p>
        )}
      </section>

      <section className="tag-card mt-8 p-6" aria-labelledby="newsletter">
        <h2 id="newsletter" className="text-xl font-semibold">Get an email when {name} posts a drop</h2>
        <p className="mb-4 mt-1 text-sm text-muted">One email per drop, nothing else. Unsubscribe any time.</p>
        <NewsletterForm sellerId={seller.id} />
      </section>

      {past && past.length > 0 && (
        <section className="mt-10" aria-labelledby="past-drops">
          <h2 id="past-drops" className="text-xl font-semibold text-muted">Recent drops</h2>
          <div className="mt-4 grid gap-3 opacity-80">{(past as Drop[]).map((d) => <DropCard key={d.id} drop={d} />)}</div>
        </section>
      )}
    </div>
  );
}
