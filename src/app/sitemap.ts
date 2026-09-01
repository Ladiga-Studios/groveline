import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { FOR_PAGES } from "@/lib/for";

/* Rebuilt hourly rather than at build time, so a drop posted this
   afternoon can be indexed today instead of at the next deploy. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/sell`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/sellers`, changeFrequency: "daily", priority: 0.7 },
    ...FOR_PAGES.map((p) => ({
      url: `${base}/for/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/support`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  /* Drops and shops are the pages worth finding, so they belong here too.
     Anything goes wrong reading them, the static list still ships: a
     partial sitemap beats a 500. */
  let dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [{ data: drops }, { data: shops }] = await Promise.all([
      // Only drops people can still act on. An expired drop in a sitemap
      // is a page Google indexes and then finds empty.
      supabase
        .from("drops")
        .select("slug, created_at, pickup_end")
        .eq("status", "active")
        .gte("pickup_end", new Date().toISOString())
        .order("pickup_start", { ascending: true })
        .limit(2000),
      supabase.from("shops").select("slug, created_at").limit(2000),
    ]);

    dynamicPages = [
      ...(drops ?? []).map((d) => ({
        url: `${base}/d/${d.slug}`,
        lastModified: d.created_at ? new Date(d.created_at) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...(shops ?? []).map((s) => ({
        url: `${base}/s/${s.slug}`,
        lastModified: s.created_at ? new Date(s.created_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    dynamicPages = [];
  }

  return [...staticPages, ...dynamicPages];
}
