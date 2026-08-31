import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api", "/admin", "/r/", "/reservations"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
