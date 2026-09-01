import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { money, whenLabel } from "@/lib/format";
import RefreshOnReturn from "@/components/RefreshOnReturn";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My reservations" };

export default async function ReservationsPage() {
  noStore();
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: claims } = await supabase
    .from("claims")
    .select("*, drops!inner(title, slug, pickup_place, pickup_start, pickup_end, price_cents, fulfillment, shops!drops_seller_id_fkey(name))")
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = claims ?? [];
  const upcoming = list.filter((c) => !c.cancelled_at && new Date(c.drops.pickup_end) >= new Date());
  const past = list.filter((c) => c.cancelled_at || new Date(c.drops.pickup_end) < new Date());

  const Row = ({ c }: { c: (typeof list)[number] }) => {
    const seller = Array.isArray(c.drops.shops) ? c.drops.shops[0] : c.drops.shops;
    return (
      <Link href={`/r/${c.cancel_token}`} className="tag-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold">{c.drops.title} <span className="font-normal text-muted">x{c.quantity}</span></p>
          <p className="text-sm text-muted">
            {seller?.name}. {c.delivery === "shipping" ? "Shipping to you" : `${whenLabel(c.drops)}${c.drops.pickup_place ? ` at ${c.drops.pickup_place}` : ""}`}
          </p>
        </div>
        <p className="text-sm font-medium">
          {c.cancelled_at ? "Cancelled" : c.picked_up ? "Picked up" : money(c.drops.price_cents * c.quantity)}
        </p>
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <RefreshOnReturn />
      <h1 className="text-3xl font-semibold">What you've got coming</h1>
      <p className="mt-1 text-muted">Everything you've reserved while logged into this account.</p>

      <h2 className="mt-8 text-xl font-semibold">On the way</h2>
      {upcoming.length === 0 ? (
        <div className="tag-card mt-3 p-6">
          <p className="text-muted">Nothing on your list yet. Go see what's up for grabs nearby.</p>
          <Link href="/browse" className="btn btn-primary mt-3">Browse drops</Link>
        </div>
      ) : (
        <div className="mt-3 grid gap-3">{upcoming.map((c) => <Row key={c.id} c={c} />)}</div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-semibold">Already done</h2>
          <div className="mt-3 grid gap-3">{past.map((c) => <Row key={c.id} c={c} />)}</div>
        </>
      )}
      <div className="mt-10 flex gap-4 text-sm">
        <Link href="/following" className="text-grove underline">Sellers I follow</Link>
        <Link href="/dashboard/settings" className="text-muted underline">Account settings</Link>
      </div>
    </div>
  );
}
