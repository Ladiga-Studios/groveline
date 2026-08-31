import Link from "next/link";

/* The mark: a full grove canopy whose roots settle into one shared line. */
export function GrovelineMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <circle cx="32" cy="15" r="10" />
        <circle cx="20" cy="24" r="8" />
        <circle cx="44" cy="24" r="8" />
        <circle cx="32" cy="26" r="9" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
        <path d="M32 30 V44" />
        <path d="M32 44 L19 53" />
        <path d="M32 44 L45 53" />
        <path d="M32 44 V54" />
        <path d="M6 58 H58" />
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
