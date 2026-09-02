import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import { stateName } from "@/lib/states";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shops",
  description: "Every shop on Groveline. Follow the ones near you to catch their next drop.",
  alternates: { canonical: "/sellers" },
};

export default async function SellersPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const supabase = await supabaseServer();
  let q = supabase.from("shops").select("id, name, town, state, slug, avatar_url, bio").order("created_at", { ascending: false }).limit(200);
  if (state) q = q.eq("state", state);
  const [{ data: shops }, { data: live }] = await Promise.all([
    q,
    supabase.from("drops").select("seller_id").eq("status", "active").gte("pickup_end", new Date().toISOString()).limit(5000),
  ]);
  const liveCount = new Map<string, number>();
  for (const d of live ?? []) liveCount.set(d.seller_id, (liveCount.get(d.seller_id) ?? 0) + 1);
  const list = (shops ?? []).sort((a, b) => (liveCount.get(b.id) ?? 0) - (liveCount.get(a.id) ?? 0));
  const states = Array.from(new Set((shops ?? []).map((s) => s.state))).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">Every shop on Groveline</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">Find shops near you and follow them to see new drops as they're posted.</p>
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
          <Image src="/illustrations/plants.jpg" alt="" width={1254} height={1254} className="mx-auto h-40 w-auto" />
          <p className="mt-4 font-display text-xl font-semibold">No shops in this area yet.</p>
          <Link href="/sell" className="btn btn-primary mt-4">Be the first to sell here</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const n = liveCount.get(s.id) ?? 0;
            return (
              <Link key={s.id} href={`/s/${s.slug}`} className="tag-card flex gap-4 p-5">
                <Avatar url={s.avatar_url} name={s.name} size={64} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">{s.town}, {s.state}</p>
                  {s.bio && <p className="mt-1.5 line-clamp-2 text-sm text-ink/80">{s.bio}</p>}
                  <p className={`mt-2 text-sm font-semibold ${n > 0 ? "text-grove" : "text-muted"}`}>
                    {n > 0 ? `${n} drop${n === 1 ? "" : "s"} up right now` : "Nothing posted at the moment"}
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
