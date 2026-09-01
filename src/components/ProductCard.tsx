import Image from "next/image";
import Link from "next/link";
import type { Drop } from "@/lib/types";
import { money, whenLabel } from "@/lib/format";

/* Storefront tile: photo up top, the essentials underneath. */
export default function ProductCard({ drop, muted = false }: { drop: Drop; muted?: boolean }) {
  const left = drop.quantity - drop.claimed;
  const soldOut = left <= 0 || drop.status !== "active";
  const cover = drop.photo_urls?.[0] || drop.photo_url;
  return (
    <Link
      href={`/d/${drop.slug}`}
      className={`tag-card block overflow-hidden ${muted ? "opacity-80" : ""}`}
      aria-label={`${drop.title}, ${money(drop.price_cents)}${soldOut ? ", sold out" : `, ${left} left`}`}
    >
      <div className="relative aspect-[4/3] w-full bg-cream-dark">
        {cover ? (
          <Image src={cover} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px" className="object-cover" loading="lazy" />
        ) : (
          <div aria-hidden="true" className="grid h-full w-full place-items-center text-4xl text-leaf">*</div>
        )}
        {soldOut ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-cream">Sold out</span>
        ) : left <= 3 ? (
          <span className="absolute left-3 top-3 rounded-full bg-peach px-2.5 py-1 text-xs font-semibold text-ink">Only {left} left</span>
        ) : null}
        {drop.fulfillment && drop.fulfillment !== "pickup" && (
          <span className="absolute right-3 top-3 rounded-full bg-cream/95 px-2.5 py-1 text-xs font-semibold text-ink">Ships</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-semibold">{drop.title}</h3>
          <span className="shrink-0 font-display text-lg font-semibold text-grove">{money(drop.price_cents)}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{whenLabel(drop)}</p>
        {!soldOut && <p className="mt-1 text-sm font-medium text-grove">{left} of {drop.quantity} left</p>}
      </div>
    </Link>
  );
}
