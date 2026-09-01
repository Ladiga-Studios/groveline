import Image from "next/image";
import Link from "next/link";
import type { Drop } from "@/lib/types";
import { money, whenLabel } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";

export default function DropCard({ drop }: { drop: Drop }) {
  const left = drop.quantity - drop.claimed;
  const soldOut = left <= 0 || drop.status === "closed";
  const cover = drop.photo_urls?.[0] || drop.photo_url;
  return (
    <Link
      href={`/d/${drop.slug}`}
      className="tag-card flex gap-4 p-4"
      aria-label={`${drop.title}, ${money(drop.price_cents)}${
        soldOut ? ", sold out" : `, ${left} left`
      }`}
    >
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-cream-dark">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full w-full place-items-center text-3xl text-leaf"
          >
            *
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-lg font-semibold">{drop.title}</h3>
          <span className="shrink-0 font-display text-lg font-semibold text-grove">
            {money(drop.price_cents)}
          </span>
        </div>
        {drop.shops && (
          <p className="truncate text-sm text-muted">
            {drop.shops.name} in {drop.pickup_city || drop.shops.town}
          </p>
        )}
        <p className="mt-1 text-sm">{whenLabel(drop)}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span
            className={`font-semibold ${soldOut ? "text-muted" : "text-grove"}`}
          >
            {soldOut ? "Sold out" : `${left} of ${drop.quantity} left`}
          </span>
          {drop.category && drop.category !== "other" && (
            <span className="rounded-full bg-cream-dark px-2 py-0.5 text-xs font-medium text-ink">
              {categoryLabel(drop.category)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
