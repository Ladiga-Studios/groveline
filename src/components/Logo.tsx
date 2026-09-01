import Link from "next/link";

/* The mark: a leaf that is also a price tag, string and all. */
export function GrovelineMark({ size = 34, hole = "#faf6ef" }: { size?: number; hole?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {/* string loop */}
      <path d="M41 13 C 41 4, 54 3, 55 10 C 55.5 15, 47 16, 44 13" fill="none" stroke="#f2a65a" strokeWidth="3" strokeLinecap="round" />
      {/* leaf body */}
      <path d="M45 11 C 62 22, 58 48, 20 59 C 7 42, 20 18, 45 11 Z" fill="currentColor" />
      {/* tag hole */}
      <circle cx="42" cy="18" r="3.2" fill={hole} />
      {/* veins */}
      <g fill="none" stroke={hole} strokeWidth="2" strokeLinecap="round">
        <path d="M41 24 C 36 32, 30 42, 24 52" />
        <path d="M35 32 L 44 30" />
        <path d="M31 39 L 41 38" />
        <path d="M28 45 L 36 45" />
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
