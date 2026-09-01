/* A quiet two-leaf seedling. Decoration only, used sparingly in a few
   warm spots (never as a functional icon, never as the logo). Solid
   shapes rather than a thin line, so it holds up at small sizes. */
export default function Sprout({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g fill="currentColor">
        {/* left leaf */}
        <path d="M19.2 23.5 C11 24, 6 19.5, 6.5 12 C14.5 11.5, 19.5 16, 19.2 23.5 Z" />
        {/* right leaf, a touch larger so it doesn't read as a symmetric bow */}
        <path d="M20.8 23.5 C20.5 15, 26 9.5, 34.5 10 C35 18.5, 29.5 24, 20.8 23.5 Z" />
        {/* stem */}
        <path d="M18.6 34 C18.6 27, 19 24, 20 21.5 C21 24, 21.4 27, 21.4 34 Z" />
      </g>
    </svg>
  );
}
