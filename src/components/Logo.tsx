import Link from "next/link";
import Image from "next/image";

/* The mark is a photo asset (public/logo/mark-*.png), not drawn code, so
   there are two pre-colored files rather than one currentColor SVG:
   mark-light.png (dark green leaf) for cream backgrounds, mark-dark.png
   (cream leaf) for the green footer. Both share the same alpha-cut
   silhouette, so the veins and string-hole read as cutouts either way. */
export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2"
      aria-label="Groveline home"
    >
      <Image
        src={light ? "/logo/mark-dark.png" : "/logo/mark-light.png"}
        alt=""
        width={512}
        height={965}
        className="h-[34px] w-auto shrink-0"
        priority
      />
      <span className={`font-display text-2xl font-semibold lowercase tracking-tight ${light ? "text-cream" : "text-grove"}`}>
        groveline
      </span>
    </Link>
  );
}
