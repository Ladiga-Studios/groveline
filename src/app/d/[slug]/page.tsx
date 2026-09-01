import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import ClaimForm from "@/components/ClaimForm";
import ShareButton from "@/components/ShareButton";
import FacebookShareButton from "@/components/FacebookShareButton";
import PhotoGallery from "@/components/PhotoGallery";
import PickupMap from "@/components/PickupMap";
import ReportButton from "@/components/ReportButton";
import Avatar from "@/components/Avatar";
import NewsletterForm from "@/components/NewsletterForm";
import { money, pickupWindow, shortDate, whenLabel } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";
import { fullAddress } from "@/lib/geocode";
import type { Drop } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getDrop(slug: string): Promise<Drop | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("drops")
    .select("*, shops!drops_seller_id_fkey(id, name, town, state, slug, avatar_url, contact_phone, owner:profiles!shops_owner_id_fkey(payouts_enabled))")
    .eq("slug", slug)
    .maybeSingle();
  return data as Drop | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const drop = await getDrop(slug);
  if (!drop || drop.status === "removed") return { title: "Drop not found" };
  const seller = drop.shops?.name || "a local seller";
  const when = whenLabel(drop) + (drop.pickup_place && drop.fulfillment !== "shipping" ? ` at ${drop.pickup_place}` : "");
  const short = `${money(drop.price_cents)} each from ${seller}. ${when}. Reserve in seconds, no account needed.`;
  const long = drop.description ? `${drop.description.slice(0, 220)}${drop.description.length > 220 ? "..." : ""}\n\n${short}` : short;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  const photos = drop.photo_urls?.length ? drop.photo_urls : drop.photo_url ? [drop.photo_url] : [];
  return {
    title: drop.title,
    description: short.slice(0, 160),
    alternates: { canonical: `/d/${drop.slug}` },
    openGraph: {
      title: `${drop.title}, ${money(drop.price_cents)} each`,
      description: long,
      url: `${site}/d/${drop.slug}`,
      type: "website",
      images: [
        ...photos.slice(0, 1).map((u) => ({ url: u, alt: drop.title })),
        { url: `${site}/d/${drop.slug}/opengraph-image`, width: 1200, height: 630, alt: drop.title },
      ],
    },
    twitter: { card: "summary_large_image", title: `${drop.title}, ${money(drop.price_cents)} each`, description: short.slice(0, 200) },
  };
}

export default async function DropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const drop = await getDrop(slug);
  if (!drop || drop.status === "removed") notFound();

  // Count the view. Fire and forget, never blocks the page.
  try {
    supabaseAdmin().rpc("increment_views", { p_drop: drop.id }).then(() => {});
  } catch {
    /* fine */
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isOwner = false;
  if (user && drop.shops?.id) {
    const { data: own } = await supabase.from("shops").select("id").eq("id", drop.shops.id).eq("owner_id", user.id).maybeSingle();
    isOwner = !!own;
  }
  let prefill: { name?: string; email?: string } | undefined;
  if (user) {
    const { data: me } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    prefill = { name: me?.name, email: user.email ?? undefined };
  }

  const left = drop.quantity - drop.claimed;
  const seller = drop.shops as (Partial<import("@/lib/types").Shop> & { owner?: { payouts_enabled?: boolean } | { payouts_enabled?: boolean }[] }) | undefined;
  const owner = Array.isArray(seller?.owner) ? seller?.owner[0] : seller?.owner;
  const address = fullAddress(drop);
  const ended = new Date(drop.pickup_end) < new Date();
  const photos = drop.photo_urls?.length ? drop.photo_urls : drop.photo_url ? [drop.photo_url] : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: drop.title,
    description: drop.description || undefined,
    image: photos.length ? photos : undefined,
    offers: {
      "@type": "Offer",
      price: (drop.price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: left > 0 && drop.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  const url = `${site}/d/${drop.slug}`;
  const stock =
    drop.status === "closed" ? "Closed" : left > 0 ? `${left} of ${drop.quantity} left` : "Sold out";

  /* Layout: one column on phones in reading order (photos, the facts,
     description, reserve form, map). On large screens the facts and the
     form move into a sticky right rail so reserving is always one click
     away while the photos, description, and map fill the left. The
     wrappers use display: contents on small screens so the order-*
     utilities can interleave both columns. */
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {isOwner && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-leaf bg-cream px-4 py-3">
          <p className="font-semibold text-grove">This is your drop. {drop.claimed} of {drop.quantity} reserved{drop.status === "closed" ? ", closed" : ""}.</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/drops/${drop.id}`} className="btn btn-grove !min-h-10 !px-4 text-sm">See who reserved</Link>
            <a href={`/api/drops/${drop.id}/report?format=pdf`} className="btn btn-outline !min-h-10 !px-4 text-sm">Print sheet</a>
            <Link href={`/dashboard/drops/${drop.id}/edit`} className="btn btn-outline !min-h-10 !px-4 text-sm">Edit</Link>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-12">
        {/* Left: photos, description, map, share, newsletter */}
        <div className="contents lg:block lg:space-y-8">
          <div className="order-1">
            <PhotoGallery urls={photos} alt={drop.title} />
          </div>

          {drop.description && (
            <section className="order-3" aria-labelledby="about">
              <h2 id="about" className="text-lg font-semibold lg:text-xl">About this drop</h2>
              <p className="mt-2 whitespace-pre-line text-lg leading-relaxed">{drop.description}</p>
            </section>
          )}

          {drop.fulfillment !== "shipping" && drop.pickup_place && (
            <section className="order-5" aria-labelledby="where">
              <h2 id="where" className="text-lg font-semibold lg:text-xl">Where to pick up</h2>
              <p className="mt-1 text-muted">{pickupWindow(drop.pickup_start, drop.pickup_end)}</p>
              <div className="mt-3">
                <PickupMap lat={drop.pickup_lat} lng={drop.pickup_lng} address={address} place={drop.pickup_place} />
              </div>
            </section>
          )}

          <div className="order-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <FacebookShareButton url={url} />
              <ShareButton url={url} title={`${drop.title} for ${money(drop.price_cents)}`} text="Reserve yours before it is gone." />
            </div>
            <ReportButton dropId={drop.id} />
          </div>

          {seller && (
            <section className="tag-card order-7 p-6">
              <h2 className="text-lg font-semibold">Want to know next time {seller.name} posts?</h2>
              <p className="mb-3 mt-1 text-sm text-muted">One email per drop, nothing else, and you can unsubscribe whenever.{seller.contact_phone ? ` Got a question? Text ${seller.contact_phone}.` : ""}</p>
              <NewsletterForm sellerId={seller.id!} />
            </section>
          )}
        </div>

        {/* Right rail: the facts and the reserve form, sticky on desktop */}
        <aside className="contents lg:sticky lg:top-24 lg:block lg:space-y-5">
          <div className="order-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h1 className="text-2xl font-semibold sm:text-3xl">{drop.title}</h1>
              <p className="font-display text-2xl font-semibold text-grove sm:text-3xl">
                {money(drop.price_cents)}<span className="ml-1 text-base font-normal text-muted">each</span>
              </p>
            </div>

            {seller && (
              <Link href={`/s/${seller.slug}`} className="mt-3 inline-flex items-center gap-3 rounded-full pr-3 hover:bg-cream-dark">
                <Avatar url={seller.avatar_url} name={seller.name || ""} size={40} />
                <span>
                  <span className="block font-medium text-grove">{seller.name}</span>
                  <span className="block text-sm text-muted">{drop.pickup_city || seller.town}{drop.pickup_state ? `, ${drop.pickup_state}` : ""}</span>
                </span>
              </Link>
            )}

            <dl className="mt-4 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr] sm:text-base">
              <dt className="text-muted">Available</dt>
              <dd className={`font-semibold ${left > 0 && drop.status === "active" ? "text-grove" : "text-muted"}`} aria-live="polite">{stock}</dd>
              <dt className="text-muted">{drop.fulfillment === "shipping" ? "Shipping" : "Pickup"}</dt>
              <dd>
                {drop.fulfillment === "shipping"
                  ? `Order by ${shortDate(drop.pickup_end)}, ships to you`
                  : `${pickupWindow(drop.pickup_start, drop.pickup_end)}${drop.pickup_place ? ` at ${drop.pickup_place}` : ""}`}
                {drop.fulfillment === "both" ? ", or shipped to you" : ""}
                {drop.fulfillment !== "pickup" && drop.shipping_cents ? ` (${money(drop.shipping_cents)} shipping)` : ""}
              </dd>
              <dt className="text-muted">Category</dt>
              <dd>{categoryLabel(drop.category)}</dd>
            </dl>
          </div>

          <div className="order-4">
            {ended ? (
              <div className="tag-card p-6">
                <p className="font-display text-xl font-semibold">This pickup time has passed.</p>
                <p className="mt-2 text-muted">
                  {seller ? `Follow ${seller.name} or join their email list so you catch the next one.` : "Head over to browse to see what's still up for grabs."}
                </p>
                <Link href="/browse" className="btn btn-primary mt-4">See what is claimable now</Link>
              </div>
            ) : (
              <ClaimForm drop={drop} acceptsCard={!!owner?.payouts_enabled} prefill={prefill} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
