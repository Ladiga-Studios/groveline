import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import type { Drop } from "@/lib/types";
import { CATEGORY_GROUPS, categoryLabel } from "@/lib/categories";
import { stateName } from "@/lib/states";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse drops",
  description:
    "Everything for sale near you across 130 categories. Baked goods, produce, meat shares, plants, handmade goods, and plate sales, claimable in seconds.",
  alternates: { canonical: "/browse" },
};

type Params = { q?: string; city?: string; state?: string; cat?: string; group?: string };

function href(p: Params) {
  const params = new URLSearchParams();
  if (p.q) params.set("q", p.q);
  if (p.state) params.set("state", p.state);
  if (p.city) params.set("city", p.city);
  if (p.cat) params.set("cat", p.cat);
  if (p.group) params.set("group", p.group);
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

function CategoryTree({
  params,
  catCounts,
  total,
}: {
  params: Params;
  catCounts: Map<string, number>;
  total: number;
}) {
  const { q, city, state, cat, group } = params;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Categories</h2>
        {(cat || group) && (
          <Link href={href({ q, city, state })} className="text-sm text-grove underline">Clear</Link>
        )}
      </div>
      <Link
        href={href({ q, city, state })}
        className={`mt-2 block rounded-lg px-3 py-2 font-medium ${!cat && !group ? "bg-grove text-cream" : "hover:bg-cream-dark"}`}
      >
        Everything ({total})
      </Link>
      <div className="mt-2 space-y-1">
        {CATEGORY_GROUPS.map((grp) => {
          const groupCount = grp.items.reduce((n, i) => n + (catCounts.get(i.value) ?? 0), 0);
          const isOpen = group === grp.id || (!!cat && grp.items.some((i) => i.value === cat)) || groupCount > 0;
          return (
            <details key={grp.id} open={isOpen} className="rounded-lg">
              <summary
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 font-medium ${groupCount > 0 ? "text-ink" : "text-muted"} ${group === grp.id ? "bg-cream-dark" : "hover:bg-cream-dark"}`}
              >
                <span>{grp.label}</span>
                <span className="text-sm">{groupCount > 0 ? `(${groupCount})` : ""}</span>
              </summary>
              <ul className="mb-2 ml-3 space-y-0.5 border-l border-cream-dark pl-3">
                {groupCount > 0 && (
                  <li>
                    <Link
                      href={href({ q, city, state, group: grp.id })}
                      className={`block rounded px-2 py-1 text-sm ${group === grp.id && !cat ? "font-semibold text-grove" : "text-ink hover:bg-cream-dark"}`}
                    >
                      All {grp.label.toLowerCase()} ({groupCount})
                    </Link>
                  </li>
                )}
                {grp.items.map((c) => {
                  const n = catCounts.get(c.value) ?? 0;
                  return (
                    <li key={c.value}>
                      {n > 0 ? (
                        <Link
                          href={href({ q, city, state, cat: c.value })}
                          className={`block rounded px-2 py-1 text-sm ${cat === c.value ? "bg-grove font-semibold text-cream" : "font-medium text-ink hover:bg-cream-dark"}`}
                        >
                          {c.label} ({n})
                        </Link>
                      ) : (
                        <span className="block px-2 py-1 text-sm text-muted/60" aria-disabled="true">{c.label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { q, city, state, cat, group } = params;
  const supabase = await supabaseServer();
  const nowIso = new Date().toISOString();

  const { data: live } = await supabase
    .from("drops")
    .select("category, pickup_state, pickup_city")
    .eq("status", "active")
    .gte("pickup_end", nowIso)
    .limit(5000);

  const catCounts = new Map<string, number>();
  const stateCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  for (const d of live ?? []) {
    catCounts.set(d.category, (catCounts.get(d.category) ?? 0) + 1);
    if (d.pickup_state) stateCounts.set(d.pickup_state, (stateCounts.get(d.pickup_state) ?? 0) + 1);
    if (d.pickup_city && (!state || d.pickup_state === state))
      cityCounts.set(d.pickup_city, (cityCounts.get(d.pickup_city) ?? 0) + 1);
  }
  const groupValues = group ? CATEGORY_GROUPS.find((g) => g.id === group)?.items.map((i) => i.value) : undefined;

  let query = supabase
    .from("drops")
    .select("*, profiles!drops_seller_id_fkey(name, farm_name, town, state, slug, avatar_url)")
    .eq("status", "active")
    .gte("pickup_end", nowIso)
    .order("pickup_start", { ascending: true })
    .limit(100);
  if (cat) query = query.eq("category", cat);
  else if (groupValues?.length) query = query.in("category", groupValues);
  if (state) query = query.eq("pickup_state", state);
  if (city) query = query.eq("pickup_city", city);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data: drops } = await query;
  const results = (drops ?? []) as Drop[];
  const total = live?.length ?? 0;
  const filtering = !!(q || cat || group || city || state);
  const groupLabel = group ? CATEGORY_GROUPS.find((g) => g.id === group)?.label : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">For sale near you</h1>
      <p className="mt-2 text-muted">
        {total} {total === 1 ? "drop" : "drops"} claimable right now. Reserve in seconds, pick it up or have it shipped.
      </p>

      <form action="/browse" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
        {cat && <input type="hidden" name="cat" value={cat} />}
        {group && <input type="hidden" name="group" value={group} />}
        <div className="grow">
          <label htmlFor="browse-q" className="sr-only">Search drops</label>
          <input id="browse-q" name="q" className="field" placeholder="Search sourdough, tomatoes, soap..." defaultValue={q ?? ""} />
        </div>
        <div>
          <label htmlFor="browse-state" className="sr-only">State</label>
          <select id="browse-state" name="state" className="field sm:w-44" defaultValue={state ?? ""}>
            <option value="">All states</option>
            {Array.from(stateCounts.entries()).sort().map(([s, n]) => (
              <option key={s} value={s}>{stateName(s)} ({n})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="browse-city" className="sr-only">City</label>
          <select id="browse-city" name="city" className="field sm:w-44" defaultValue={city ?? ""}>
            <option value="">All cities</option>
            {Array.from(cityCounts.entries()).sort().map(([c, n]) => (
              <option key={c} value={c}>{c} ({n})</option>
            ))}
          </select>
        </div>
        <button className="btn btn-grove">Search</button>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <details className="tag-card !pl-4 p-4 lg:hidden" open={!!(cat || group)}>
          <summary className="cursor-pointer font-semibold">
            Categories{cat ? `: ${categoryLabel(cat)}` : groupLabel ? `: ${groupLabel}` : ""}
          </summary>
          <div className="mt-3">
            <CategoryTree params={params} catCounts={catCounts} total={total} />
          </div>
        </details>
        <aside className="hidden lg:block">
          <CategoryTree params={params} catCounts={catCounts} total={total} />
        </aside>

        <div>
          {(cat || groupLabel) && (
            <p className="mb-4 text-muted">
              Showing <span className="font-semibold text-ink">{cat ? categoryLabel(cat) : groupLabel}</span>
              {city ? ` in ${city}` : state ? ` in ${stateName(state)}` : ""}.
            </p>
          )}
          {results.length === 0 ? (
            <div className="tag-card p-8 text-center">
              <p className="font-display text-xl font-semibold">Nothing here right now.</p>
              <p className="mt-2 text-muted">
                {filtering
                  ? "Nothing matches those filters. Try widening your search, or check back soon."
                  : "Sellers post through the week, most pickups happen on weekends. Check back soon, or be the first to post."}
              </p>
              <div className="mt-4 flex justify-center gap-3">
                {filtering && <Link href="/browse" className="btn btn-outline">Clear filters</Link>}
                <Link href="/sell" className="btn btn-primary">Start selling</Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {results.map((drop) => <DropCard key={drop.id} drop={drop} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
