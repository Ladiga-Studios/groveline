import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import RefreshOnReturn from "@/components/RefreshOnReturn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sellers I follow", robots: { index: false } };

export default async function FollowingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: follows } = await supabase
    .from("follows")
    .select("seller_id, shops!follows_seller_id_fkey(id, name, town, state, slug, avatar_url)")
    .eq("buyer_id", user.id);
  const sellers = (follows ?? []).map((f) => (Array.isArray(f.shops) ? f.shops[0] : f.shops)).filter(Boolean);
  const ids = sellers.map((s) => s.id);
  const { data: live } = ids.length
    ? await supabase.from("drops").select("seller_id").in("seller_id", ids).eq("status", "active").gte("pickup_end", new Date().toISOString())
    : { data: [] };
  const count = new Map<string, number>();
  for (const d of live ?? []) count.set(d.seller_id, (count.get(d.seller_id) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <RefreshOnReturn />
      <h1 className="text-3xl font-semibold">Who you're following</h1>
      <p className="mt-1 text-muted">An email lands in your inbox every time one of them posts something new.</p>
      {sellers.length === 0 ? (
        <div className="tag-card mt-6 p-6">
          <p className="text-muted">Not following anyone yet. Go find your people.</p>
          <Link href="/sellers" className="btn btn-primary mt-3">Browse sellers</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {sellers.map((s) => {
            const n = count.get(s.id) ?? 0;
            return (
              <Link key={s.id} href={`/s/${s.slug}`} className="tag-card flex items-center gap-4 p-4">
                <Avatar url={s.avatar_url} name={s.name} size={48} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">{s.town}, {s.state}</p>
                  <p className={`text-sm font-medium ${n > 0 ? "text-grove" : "text-muted"}`}>{n > 0 ? `${n} up for grabs now` : "Nothing posted right now"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
