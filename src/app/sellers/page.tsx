import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import { stateName } from "@/lib/states";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sellers",
  description: "Every seller on Groveline. Follow the ones near you to catch their next drop.",
  alternates: { canonical: "/sellers" },
};

export default async function SellersPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const supabase = await supabaseServer();
  let q = supabase.from("profiles").select("id, name, farm_name, town, state, slug, avatar_url, bio, payouts_enabled").eq("is_seller", true).order("created_at", { ascending: false }).limit(200);
  if (state) q = q.eq("state", state);
  const [{ data: sellers }, { data: live }] = await Promise.all([
    q,
    supabase.from("drops").select("seller_id").eq("status", "active").gte("pickup_end", new Date().toISOString()).limit(5000),
  ]);
  const liveCount = new Map<string, number>();
  for (const d of live ?? []) liveCount.set(d.seller_id, (liveCount.get(d.seller_id) ?? 0) + 1);
  const list = (sellers ?? []).sort((a, b) => (liveCount.get(b.id) ?? 0) - (liveCount.get(a.id) ?? 0));
  const states = Array.from(new Set((sellers ?? []).map((s) => s.state))).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Sellers</h1>
      <p className="mt-2 text-muted">Follow the ones near you and get an email every time they post.</p>
      {states.length > 1 && (
        <nav aria-label="Filter by state" className="mt-4 flex flex-wrap gap-2">
          <Link href="/sellers" className={`btn !min-h-11 !px-4 ${!state ? "btn-grove" : "btn-outline"}`}>All</Link>
          {states.map((s) => (
            <Link key={s} href={`/sellers?state=${s}`} className={`btn !min-h-11 !px-4 ${state === s ? "btn-grove" : "btn-outline"}`}>{stateName(s)}</Link>
          ))}
        </nav>
      )}
      {list.length === 0 ? (
        <div className="tag-card mt-8 p-8 text-center">
          <p className="font-display text-xl font-semibold">No sellers here yet.</p>
          <Link href="/sell" className="btn btn-primary mt-4">Be the first</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const n = liveCount.get(s.id) ?? 0;
            return (
              <Link key={s.id} href={`/s/${s.slug}`} className="tag-card flex gap-4 p-4">
                <Avatar url={s.avatar_url} name={s.farm_name || s.name} size={56} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.farm_name || s.name}</p>
                  <p className="text-sm text-muted">{s.town}, {s.state}</p>
                  <p className={`mt-1 text-sm font-medium ${n > 0 ? "text-grove" : "text-muted"}`}>
                    {n > 0 ? `${n} drop${n === 1 ? "" : "s"} claimable now` : "Nothing active right now"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
