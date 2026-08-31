"use client";
import { useState } from "react";
import Image from "next/image";

export default function PhotoGallery({ urls, alt }: { urls: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (urls.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream-dark">
        <Image
          src={urls[active]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 672px) 100vw, 672px"
          className="object-cover"
        />
      </div>
      {urls.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={url}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? "border-leaf" : "border-transparent"
              }`}
            >
              <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
