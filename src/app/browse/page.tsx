import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import type { Drop } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse drops",
  description:
    "See every active drop near you. Bread, produce, beef shares, plants, and plate sales, all claimable in seconds.",
  alternates: { canonical: "/browse" },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ town?: string }>;
}) {
  const { town } = await searchParams;
  const supabase = await supabaseServer();

  let query = supabase
    .from("drops")
    .select("*, profiles!drops_seller_id_fkey(name, farm_name, town, slug)")
    .eq("status", "active")
    .gte("pickup_end", new Date().toISOString())
    .order("pickup_start", { ascending: true })
    .limit(60);

  const { data: drops } = await query;

  const towns = Array.from(
    new Set((drops ?? []).map((d) => d.profiles?.town).filter(Boolean))
  ).sort() as string[];

  const filtered = town
    ? (drops ?? []).filter((d) => d.profiles?.town === town)
    : drops ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Drops near you</h1>
      <p className="mt-2 text-muted">
        Everything currently claimable. Reserve in seconds, pick up in person.
      </p>

      {towns.length > 1 && (
        <nav aria-label="Filter by town" className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/browse"
            className={`btn !min-h-11 !px-4 ${!town ? "btn-grove" : "btn-outline"}`}
          >
            All towns
          </Link>
          {towns.map((t) => (
            <Link
              key={t}
              href={`/browse?town=${encodeURIComponent(t)}`}
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
            No active drops right now.
          </p>
          <p className="mt-2 text-muted">
            Sellers post through the week, most pickups happen on weekends.
            Check back soon, or be the first to post.
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
