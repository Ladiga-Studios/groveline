"use client";
import { useState } from "react";
import Image from "next/image";

export default function PhotoGallery({ urls, alt }: { urls: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (urls.length === 0) return null;
  const many = urls.length > 1;
  const go = (n: number) => setActive((n + urls.length) % urls.length);

  return (
    <div
      className="mb-2 lg:mb-0"
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") go(active + 1);
        if (e.key === "ArrowLeft") go(active - 1);
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream-dark">
        <Image
          src={urls[active]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 720px"
          className="object-cover"
        />
        {many && (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-cream/90 text-ink shadow-lift transition-colors hover:bg-cream"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3 L5 9 L11 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-cream/90 text-ink shadow-lift transition-colors hover:bg-cream"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M7 3 L13 9 L7 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-cream" aria-live="polite">
              {active + 1} of {urls.length}
            </span>
          </>
        )}
      </div>
      {many && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors lg:h-20 lg:w-20 ${
                i === active ? "border-leaf" : "border-transparent hover:border-cream-dark"
              }`}
            >
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
