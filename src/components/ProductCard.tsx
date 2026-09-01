import Image from "next/image";
import Link from "next/link";
import type { Drop } from "@/lib/types";
import { money, whenLabel } from "@/lib/format";

/* Storefront tile: photo up top, the essentials underneath, and a thin
   bar showing how much of the batch is already spoken for. */
export default function ProductCard({ drop, muted = false, manage = false }: { drop: Drop; muted?: boolean; manage?: boolean }) {
  const left = drop.quantity - drop.claimed;
  const soldOut = left <= 0 || drop.status !== "active";
  const cover = drop.photo_urls?.[0] || drop.photo_url;
  const pct = drop.quantity > 0 ? Math.min(100, Math.round((drop.claimed / drop.quantity) * 100)) : 0;
  return (
    <Link
      href={manage ? `/dashboard/drops/${drop.id}` : `/d/${drop.slug}`}
      className={`tag-card group flex h-full flex-col overflow-hidden ${muted ? "opacity-80" : ""}`}
      aria-label={`${drop.title}, ${money(drop.price_cents)}${soldOut ? ", sold out" : `, ${left} left`}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-dark">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div aria-hidden="true" className="grid h-full w-full place-items-center text-4xl text-leaf">*</div>
        )}
        {drop.status === "closed" ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-cream">Closed</span>
        ) : soldOut ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-cream">Sold out</span>
        ) : left <= 3 ? (
          <span className="absolute left-3 top-3 rounded-full bg-peach px-2.5 py-1 text-xs font-semibold text-ink">Only {left} left</span>
        ) : null}
        {drop.fulfillment && drop.fulfillment !== "pickup" && (
          <span className="absolute right-3 top-3 rounded-full bg-cream/95 px-2.5 py-1 text-xs font-semibold text-ink">Ships</span>
        )}
      </div>
      <div className="flex grow flex-col p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{drop.title}</h3>
          <span className="shrink-0 font-display text-xl font-semibold text-grove">{money(drop.price_cents)}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{whenLabel(drop)}</p>

        <div className="mt-auto pt-3">
          {!soldOut ? (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-grove">{left} of {drop.quantity} left</span>
                {!manage && <span className="font-semibold text-ink transition-colors group-hover:text-grove">Reserve</span>}
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-cream-dark" aria-hidden="true">
                <div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{drop.claimed} reserved</p>
          )}
          {manage && (
            <p className="mt-2 text-sm font-semibold text-grove">
              {drop.claimed} reserved. Open to manage or print.
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
