import Image from "next/image";

/* Profile photo with an initials fallback in brand colors. */
export default function Avatar({
  url,
  name,
  size = 48,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-grove font-display font-semibold text-cream"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials || "G"}
    </div>
  );
}
