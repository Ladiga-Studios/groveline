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
import { money, pickupWindow, whenLabel } from "@/lib/format";
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
        { url: `${site}/d/${drop.slug}/opengraph-image`, width: 1200, height: 630, alt: drop.title },
        ...photos.slice(0, 1).map((u) => ({ url: u, alt: drop.title })),
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PhotoGallery urls={photos} alt={drop.title} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-semibold">{drop.title}</h1>
        <p className="font-display text-3xl font-semibold text-grove">
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

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className={`text-lg font-semibold ${left > 0 ? "text-grove" : "text-muted"}`} aria-live="polite">
          {drop.status === "closed" ? "This drop has closed" : left > 0 ? `${left} of ${drop.quantity} left` : "Sold out"}
        </p>
        <span className="rounded-full bg-cream-dark px-2.5 py-1 text-xs font-medium">{categoryLabel(drop.category)}</span>
      </div>

      <p className="mt-2">{whenLabel(drop)}{drop.fulfillment !== "pickup" && drop.shipping_cents ? ` (${money(drop.shipping_cents)} shipping)` : ""}</p>

      {drop.description && <p className="mt-4 whitespace-pre-line text-lg">{drop.description}</p>}

      {drop.fulfillment !== "shipping" && drop.pickup_place && (
        <div className="mt-6">
          <PickupMap lat={drop.pickup_lat} lng={drop.pickup_lng} address={address} place={drop.pickup_place} />
        </div>
      )}

      <div className="mt-8">
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FacebookShareButton url={`${process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io"}/d/${drop.slug}`} />
          <ShareButton
            url={`${process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io"}/d/${drop.slug}`}
            title={`${drop.title} for ${money(drop.price_cents)}`}
            text="Reserve yours before it is gone."
          />
        </div>
        <ReportButton dropId={drop.id} />
      </div>

      {seller && (
        <section className="tag-card mt-8 p-6">
          <h2 className="text-lg font-semibold">Want to know next time {seller.name} posts?</h2>
          <p className="mb-3 mt-1 text-sm text-muted">One email per drop, nothing else, and you can unsubscribe whenever.{seller.contact_phone ? ` Got a question? Text ${seller.contact_phone}.` : ""}</p>
          <NewsletterForm sellerId={seller.id!} />
        </section>
      )}
    </div>
  );
}
