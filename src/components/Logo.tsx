import Link from "next/link";

/* The mark: a leaf that is also a price tag, string and all.

   Kept deliberately plain. Every extra stroke in here disappears below
   about 24px and just muddies the silhouette, so the tag reads through
   the hole and the loop rather than through fine detail. */
export function GrovelineMark({ size = 34, hole = "#faf6ef" }: { size?: number; hole?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {/* string, looped through the hole */}
      <path
        d="M32 18 C26 15, 23.5 8.5, 27.5 6.5 C31.5 4.5, 34.5 10, 32.5 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* leaf body, doubling as the tag */}
      <path
        d="M32 10 C44 17, 52 25, 52 34 C52 45, 42 53, 32 59 C22 53, 12 45, 12 34 C12 25, 20 17, 32 10 Z"
        fill="currentColor"
      />
      {/* tag hole */}
      <circle cx="32" cy="21" r="3.6" fill={hole} />
      {/* a sprig for the veins: two pairs, no more */}
      <g fill="none" stroke={hole} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 53 V31" />
        <path d="M32 40 L24 33.5 M32 40 L40 33.5" />
        <path d="M32 48 L25.5 42.5 M32 48 L38.5 42.5" />
      </g>
    </svg>
  );
}

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 ${light ? "text-cream" : "text-grove"}`}
      aria-label="Groveline home"
    >
      <GrovelineMark hole={light ? "#1e4d2b" : "#faf6ef"} />
      <span className="font-display text-2xl font-semibold lowercase tracking-tight">groveline</span>
    </Link>
  );
}
