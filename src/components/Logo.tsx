import Link from "next/link";

/* The mark: a tree whose roots settle into one straight line. */
export function GrovelineMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
        <path d="M32 46 V26" />
        <path d="M32 34 C 26 30, 22 24, 23 16" />
        <path d="M32 30 C 38 27, 42 21, 41 13" />
        <circle cx="21" cy="13" r="4.5" fill="currentColor" stroke="none" />
        <circle cx="43" cy="10" r="4.5" fill="currentColor" stroke="none" />
        <circle cx="32" cy="18" r="5.5" fill="currentColor" stroke="none" />
        <path d="M8 52 H56" />
      </g>
    </svg>
  );
}

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 ${
        light ? "text-cream" : "text-grove"
      }`}
      aria-label="Groveline home"
    >
      <GrovelineMark />
      <span className="font-display text-2xl font-semibold lowercase tracking-tight">
        groveline
      </span>
    </Link>
  );
}
