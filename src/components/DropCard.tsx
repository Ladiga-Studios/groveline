import Image from "next/image";
import Link from "next/link";
import type { Drop } from "@/lib/types";
import { money, pickupWindow } from "@/lib/format";

export default function DropCard({ drop }: { drop: Drop }) {
  const left = drop.quantity - drop.claimed;
  const soldOut = left <= 0 || drop.status === "closed";
  return (
    <Link
      href={`/d/${drop.slug}`}
      className="tag-card flex gap-4 p-4"
      aria-label={`${drop.title}, ${money(drop.price_cents)}${
        soldOut ? ", sold out" : `, ${left} left`
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-cream-dark">
        {drop.photo_url ? (
          <Image
            src={drop.photo_url}
            alt=""
            fill
            sizes="96px"
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
        {drop.profiles && (
          <p className="truncate text-sm text-muted">
            {drop.profiles.farm_name || drop.profiles.name} in{" "}
            {drop.profiles.town}
          </p>
        )}
        <p className="mt-1 text-sm">
          Pickup {pickupWindow(drop.pickup_start, drop.pickup_end)}
        </p>
        <p
          className={`mt-1 text-sm font-semibold ${
            soldOut ? "text-muted" : "text-grove"
          }`}
        >
          {soldOut ? "Sold out" : `${left} of ${drop.quantity} left`}
        </p>
      </div>
    </Link>
  );
}
