import Link from "next/link";

/* The mark: an upright leaf that is also a price tag, string and all. */
export function GrovelineMark({ size = 34, hole = "#faf6ef" }: { size?: number; hole?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {/* string loop */}
      <path d="M31.5 19 C 28 12, 27 4, 31 3 C 36 2, 37 11, 33 19" fill="none" stroke="#f2a65a" strokeWidth="2.6" strokeLinecap="round" />
      {/* leaf body */}
      <path d="M32 61 C 13 46, 12 26, 32 11 C 52 26, 51 46, 32 61 Z" fill="currentColor" />
      {/* tag hole */}
      <circle cx="32" cy="21" r="3.6" fill={hole} />
      {/* veins */}
      <g fill="none" stroke={hole} strokeWidth="2.2" strokeLinecap="round">
        <path d="M32 28 V53" />
        <path d="M32 33 L24 39 M32 33 L40 39" />
        <path d="M32 42 L24.5 48 M32 42 L39.5 48" />
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
