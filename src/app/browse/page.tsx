import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import type { Drop } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse drops",
  description:
    "See everything for sale near you. Baked goods, produce, meat shares, plants, handmade goods, and plate sales, all claimable in seconds.",
  alternates: { canonical: "/browse" },
};

function filterHref(town?: string, cat?: string) {
  const params = new URLSearchParams();
  if (town) params.set("town", town);
  if (cat) params.set("cat", cat);
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ town?: string; cat?: string }>;
}) {
  const { town, cat } = await searchParams;
  const supabase = await supabaseServer();

  let query = supabase
    .from("drops")
    .select("*, profiles!drops_seller_id_fkey(name, farm_name, town, slug)")
    .eq("status", "active")
    .gte("pickup_end", new Date().toISOString())
    .order("pickup_start", { ascending: true })
    .limit(60);
  if (cat) query = query.eq("category", cat);

  const { data: drops } = await query;

  const towns = Array.from(
    new Set((drops ?? []).map((d) => d.profiles?.town).filter(Boolean))
  ).sort() as string[];

  const filtered = town
    ? (drops ?? []).filter((d) => d.profiles?.town === town)
    : drops ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">For sale near you</h1>
      <p className="mt-2 text-muted">
        Everything currently claimable. Reserve in seconds, pick up in person.
      </p>

      <nav aria-label="Filter by category" className="mt-6 flex flex-wrap gap-2">
        <Link
          href={filterHref(town, undefined)}
          className={`btn !min-h-11 !px-4 ${!cat ? "btn-grove" : "btn-outline"}`}
        >
          Everything
        </Link>
        {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
          <Link
            key={c.value}
            href={filterHref(town, c.value)}
            className={`btn !min-h-11 !px-4 ${cat === c.value ? "btn-grove" : "btn-outline"}`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {towns.length > 1 && (
        <nav aria-label="Filter by town" className="mt-3 flex flex-wrap gap-2">
          <Link
            href={filterHref(undefined, cat)}
            className={`btn !min-h-11 !px-4 ${!town ? "btn-grove" : "btn-outline"}`}
          >
            All towns
          </Link>
          {towns.map((t) => (
            <Link
              key={t}
              href={filterHref(t, cat)}
              className={`btn !min-h-11 !px-4 ${town === t ? "btn-grove" : "btn-outline"}`}
            >
              {t}
            </Link>
          ))}
        </nav>
      )}

      {filtered.length === 0 ? (
        <div className="tag-card mt-8 p-8 text-center">
          <p className="font-display text-xl font-semibold">
            Nothing here right now.
          </p>
          <p className="mt-2 text-muted">
            {cat || town
              ? "Try a different filter, or check back soon."
              : "Sellers post through the week, most pickups happen on weekends. Check back soon, or be the first to post."}
          </p>
          <Link href="/sell" className="btn btn-primary mt-4">
            Start selling
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {(filtered as Drop[]).map((drop) => (
            <DropCard key={drop.id} drop={drop} />
          ))}
        </div>
      )}
    </div>
  );
}
