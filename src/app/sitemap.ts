import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/browse`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/sell`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
