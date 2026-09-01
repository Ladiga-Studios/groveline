/* A quiet fiddlehead flourish. Decoration only, used sparingly in a few
   warm spots (never as a functional icon, never as the logo). */
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
      <path
        d="M15 34 C15 24, 14 20, 18 17 C22 14, 26 16, 25.5 20 C25.2 22.5, 22.5 23.5, 21 21.8 C19.8 20.5, 21 18.8, 22.3 19.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
