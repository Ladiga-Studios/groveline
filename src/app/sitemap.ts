import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/browse`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/sell`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/sellers`, changeFrequency: "daily", priority: 0.7 },
    ...["kitchen", "workshop", "greenhouse", "fundraisers"].map((f) => ({ url: `${base}/for/${f}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
