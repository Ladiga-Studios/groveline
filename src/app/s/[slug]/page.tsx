import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProductCard from "@/components/ProductCard";
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
  const { data: shop } = await supabase.from("shops").select("name, town, state, bio, avatar_url").eq("slug", slug).maybeSingle();
  if (!shop) return { title: "Seller not found" };
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  const desc = shop.bio || `Drops from ${shop.name} in ${shop.town}, ${shop.state}. Reserve in seconds, no account needed.`;
  return {
    title: `${shop.name} in ${shop.town}`,
    description: desc.slice(0, 160),
    alternates: { canonical: `/s/${slug}` },
    openGraph: {
      title: `${shop.name} on Groveline`,
      description: desc.slice(0, 200),
      url: `${site}/s/${slug}`,
      type: "website",
      ...(shop.avatar_url ? { images: [{ url: shop.avatar_url, alt: shop.name }] } : {}),
    },
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
  const sel = "*, shops!drops_seller_id_fkey(name, town, state, slug, avatar_url)";

  const [{ data: active }, { data: past }, statsRes, userRes] = await Promise.all([
    supabase.from("drops").select(sel).eq("seller_id", shop.id).eq("status", "active").gte("pickup_end", nowIso).order("pickup_start", { ascending: true }),
    supabase.from("drops").select(sel).eq("seller_id", shop.id).neq("status", "removed").lt("pickup_end", nowIso).order("pickup_start", { ascending: false }).limit(6),
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
  const isOwner = user?.id === shop.owner_id;
  const since = stats.member_since ? new Date(stats.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  const s = shop as Shop;
  const live = (active ?? []) as Drop[];
  const shipsAny = live.some((d) => d.fulfillment && d.fulfillment !== "pickup");
  const following_total = (stats.followers ?? 0) + (stats.subscribers ?? 0);

  return (
    <div>
      {/* Storefront header */}
      <div className="bg-grove text-cream">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="rounded-full bg-cream p-1.5 shadow-lift">
              <Avatar url={s.avatar_url} name={s.name} size={112} />
            </div>
            <div className="min-w-0 grow">
              <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">{s.name}</h1>
              <p className="mt-2 text-cream/85">
                {s.town}, {stateName(s.state)}
                {since ? ` · Here since ${since}` : ""}
                {owner?.payouts_enabled ? " · Takes cards" : " · Cash at pickup"}
                {shipsAny ? " · Ships" : ""}
              </p>
              {s.bio && <p className="mt-3 max-w-2xl text-lg text-cream/95">{s.bio}</p>}
              {(s.contact_phone || s.social_url) && (
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {s.contact_phone && <a href={`sms:${s.contact_phone}`} className="underline underline-offset-2">Text {s.contact_phone}</a>}
                  {s.social_url && <a href={s.social_url} target="_blank" rel="noopener" className="underline underline-offset-2">Facebook page</a>}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
              {isOwner ? (
                <>
                  <Link href="/dashboard/new" className="btn btn-primary">Post a drop</Link>
                  <Link href={`/dashboard/shops/${s.id}`} className="btn btn-outline-cream">Edit shop</Link>
                </>
              ) : (
                <FollowButton sellerId={s.id} initiallyFollowing={following} loggedIn={!!user} />
              )}
              <div className="flex gap-2">
                <FacebookShareButton url={`${site}/s/${s.slug}`} label="Share" />
                <ShareButton url={`${site}/s/${s.slug}`} title={`${s.name} on Groveline`} label="Copy link" />
              </div>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Drops posted", stats.drops_posted ?? 0],
              ["Items sold", stats.items_sold ?? 0],
              ["Sold out", stats.sold_out ?? 0],
              ["Followers", following_total],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-cream/10 p-4 text-center">
                <dd className="font-display text-2xl font-semibold">{value}</dd>
                <dt className="text-xs text-cream/75">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {owner && !isOwner && (
          <Link href={`/u/${owner.slug}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-grove">
            <Avatar url={owner.avatar_url} name={owner.name} size={22} />
            Run by {owner.name}
          </Link>
        )}

        <section className="mt-6" aria-labelledby="active-drops">
          <div className="flex items-baseline justify-between">
            <h2 id="active-drops" className="text-2xl font-semibold">Up for grabs right now</h2>
            {live.length > 0 && <p className="text-sm text-muted">{live.length} {live.length === 1 ? "drop" : "drops"}</p>}
          </div>
          {live.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((d) => <ProductCard key={d.id} drop={d} />)}
            </div>
          ) : (
            <div className="tag-card mt-4 p-8 text-center">
              <p className="font-display text-xl font-semibold">Nothing posted at the moment.</p>
              <p className="mt-2 text-muted">
                {isOwner ? "Your shop is ready. Post something and it shows up right here." : `Follow ${s.name} or drop your email below and you'll hear the moment something goes up.`}
              </p>
              {isOwner && <Link href="/dashboard/new" className="btn btn-primary mt-4">Post a drop</Link>}
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="newsletter">
          <div className="tag-card p-6">
            <h2 id="newsletter" className="text-xl font-semibold">Hear about it the moment {s.name} posts</h2>
            <p className="mb-4 mt-1 text-sm text-muted">One email per drop, that&apos;s it. Unsubscribe whenever you want.</p>
            <NewsletterForm sellerId={s.id} />
          </div>
          <div className="tag-card p-6">
            <h2 className="text-xl font-semibold">How buying works here</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Tap a drop, pick how many, leave your name and number. No account needed.</li>
              <li>{owner?.payouts_enabled ? "Pay cash at pickup, or by card when you reserve." : "Pay cash when you pick up."}</li>
              {shipsAny && <li>Some drops ship. Look for the Ships tag.</li>}
              <li>Plans change? Cancel from your reservation page and it goes to the next person.</li>
            </ul>
          </div>
        </section>

        {past && past.length > 0 && (
          <section className="mt-12" aria-labelledby="past-drops">
            <h2 id="past-drops" className="text-xl font-semibold text-muted">What they&apos;ve posted before</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(past as Drop[]).map((d) => <ProductCard key={d.id} drop={d} muted />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
