import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import type { Drop } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { stateName } from "@/lib/states";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse drops",
  description:
    "Search everything for sale near you. Baked goods, produce, meat shares, plants, handmade goods, and plate sales, all claimable in seconds.",
  alternates: { canonical: "/browse" },
};

type Params = { q?: string; town?: string; state?: string; cat?: string };

function href(p: Params) {
  const params = new URLSearchParams();
  if (p.q) params.set("q", p.q);
  if (p.state) params.set("state", p.state);
  if (p.town) params.set("town", p.town);
  if (p.cat) params.set("cat", p.cat);
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { q, town, state, cat } = await searchParams;
  const supabase = await supabaseServer();

  let query = supabase
    .from("drops")
    .select("*, profiles!drops_seller_id_fkey(name, farm_name, town, state, slug)")
    .eq("status", "active")
    .gte("pickup_end", new Date().toISOString())
    .order("pickup_start", { ascending: true })
    .limit(100);
  if (cat) query = query.eq("category", cat);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data: drops } = await query;
  const all = (drops ?? []) as Drop[];

  const states = Array.from(
    new Set(all.map((d) => d.profiles?.state).filter(Boolean))
  ).sort() as string[];
  const towns = Array.from(
    new Set(
      all
        .filter((d) => !state || d.profiles?.state === state)
        .map((d) => d.profiles?.town)
        .filter(Boolean)
    )
  ).sort() as string[];

  const filtered = all.filter(
    (d) =>
      (!state || d.profiles?.state === state) &&
      (!town || d.profiles?.town === town)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">For sale near you</h1>
      <p className="mt-2 text-muted">
        Everything currently claimable. Reserve in seconds, pick up in person.
      </p>

      <form
        action="/browse"
        method="get"
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        {cat && <input type="hidden" name="cat" value={cat} />}
        <div className="grow">
          <label htmlFor="browse-q" className="sr-only">
            Search drops
          </label>
          <input
            id="browse-q"
            name="q"
            className="field"
            placeholder="Search sourdough, tomatoes, soap..."
            defaultValue={q ?? ""}
          />
        </div>
        {states.length > 1 && (
          <div>
            <label htmlFor="browse-state" className="sr-only">
              State
            </label>
            <select
              id="browse-state"
              name="state"
              className="field sm:w-44"
              defaultValue={state ?? ""}
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {stateName(s)}
                </option>
              ))}
            </select>
          </div>
        )}
        {towns.length > 1 && (
          <div>
            <label htmlFor="browse-town" className="sr-only">
              Town
            </label>
            <select
              id="browse-town"
              name="town"
              className="field sm:w-44"
              defaultValue={town ?? ""}
            >
              <option value="">All towns</option>
              {towns.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
        <button className="btn btn-grove">Search</button>
      </form>

      <nav aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
        <Link
          href={href({ q, town, state })}
          className={`btn !min-h-11 !px-4 ${!cat ? "btn-grove" : "btn-outline"}`}
        >
          Everything
        </Link>
        {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
          <Link
            key={c.value}
            href={href({ q, town, state, cat: c.value })}
            className={`btn !min-h-11 !px-4 ${cat === c.value ? "btn-grove" : "btn-outline"}`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <div className="tag-card mt-8 p-8 text-center">
          <p className="font-display text-xl font-semibold">
            Nothing here right now.
          </p>
          <p className="mt-2 text-muted">
            {q || cat || town || state
              ? "Nothing matches those filters. Try widening your search, or check back soon."
              : "Sellers post through the week, most pickups happen on weekends. Check back soon, or be the first to post."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {(q || cat || town || state) && (
              <Link href="/browse" className="btn btn-outline">
                Clear filters
              </Link>
            )}
            <Link href="/sell" className="btn btn-primary">
              Start selling
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {filtered.map((drop) => (
            <DropCard key={drop.id} drop={drop} />
          ))}
        </div>
      )}
    </div>
  );
}
