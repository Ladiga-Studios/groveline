import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ClaimForm from "@/components/ClaimForm";
import { money, pickupWindow } from "@/lib/format";
import ShareButton from "@/components/ShareButton";
import PhotoGallery from "@/components/PhotoGallery";
import type { Drop } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getDrop(slug: string): Promise<Drop | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("drops")
    .select("*, profiles!drops_seller_id_fkey(id, name, farm_name, town, slug)")
    .eq("slug", slug)
    .maybeSingle();
  return data as Drop | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const drop = await getDrop(slug);
  if (!drop) return { title: "Drop not found" };
  const seller = drop.profiles?.farm_name || drop.profiles?.name || "a local seller";
  const desc = `${money(drop.price_cents)} each from ${seller}. Pickup ${pickupWindow(
    drop.pickup_start,
    drop.pickup_end
  )} at ${drop.pickup_place}. Reserve in seconds, no account needed.`;
  return {
    title: drop.title,
    description: desc.slice(0, 160),
    alternates: { canonical: `/d/${drop.slug}` },
    openGraph: { title: `${drop.title} for ${money(drop.price_cents)}`, description: desc },
  };
}

export default async function DropPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drop = await getDrop(slug);
  if (!drop) notFound();

  const left = drop.quantity - drop.claimed;
  const seller = drop.profiles;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: drop.title,
    description: drop.description || undefined,
    image: drop.photo_urls?.length ? drop.photo_urls : drop.photo_url ? [drop.photo_url] : undefined,
    offers: {
      "@type": "Offer",
      price: (drop.price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability:
        left > 0 && drop.status === "active"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
    },
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PhotoGallery
        urls={drop.photo_urls?.length ? drop.photo_urls : drop.photo_url ? [drop.photo_url] : []}
        alt={drop.title}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-semibold">{drop.title}</h1>
        <p className="font-display text-3xl font-semibold text-grove">
          {money(drop.price_cents)}
          <span className="ml-1 text-base font-normal text-muted">each</span>
        </p>
      </div>

      {seller && (
        <p className="mt-1 text-muted">
          From{" "}
          <Link
            href={`/s/${seller.slug}`}
            className="font-medium text-grove underline underline-offset-2"
          >
            {seller.farm_name || seller.name}
          </Link>{" "}
          in {seller.town}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p
          className={`text-lg font-semibold ${left > 0 ? "text-grove" : "text-muted"}`}
          aria-live="polite"
        >
          {drop.status === "closed"
            ? "This drop has closed"
            : left > 0
              ? `${left} of ${drop.quantity} left`
              : "Sold out"}
        </p>
        <p>
          Pickup {pickupWindow(drop.pickup_start, drop.pickup_end)} at{" "}
          <span className="font-medium">{drop.pickup_place}</span>
        </p>
      </div>

      {drop.description && (
        <p className="mt-4 whitespace-pre-line text-lg">{drop.description}</p>
      )}

      <div className="mt-8">
        {new Date(drop.pickup_end) < new Date() ? (
          <div className="tag-card p-6">
            <p className="font-display text-xl font-semibold">
              This pickup time has passed.
            </p>
            <p className="mt-2 text-muted">
              {seller
                ? `Follow ${seller.farm_name || seller.name} or join their email list to catch the next one.`
                : "Check the browse page for what is claimable now."}
            </p>
            <Link href="/browse" className="btn btn-primary mt-4">
              See what is claimable now
            </Link>
          </div>
        ) : (
          <ClaimForm drop={drop} />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ShareButton
          url={`${process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io"}/d/${drop.slug}`}
          title={`${drop.title} for ${money(drop.price_cents)}`}
          text="Reserve yours before it is gone."
        />
        <p className="text-sm text-muted">
          Know somebody who would want this? Send it to them.
        </p>
      </div>
    </div>
  );
}
