import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { money, whenLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My reservations" };

export default async function ReservationsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: claims } = await supabase
    .from("claims")
    .select("*, drops!inner(title, slug, pickup_place, pickup_start, pickup_end, price_cents, fulfillment, profiles!drops_seller_id_fkey(name, farm_name))")
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = claims ?? [];
  const upcoming = list.filter((c) => !c.cancelled_at && new Date(c.drops.pickup_end) >= new Date());
  const past = list.filter((c) => c.cancelled_at || new Date(c.drops.pickup_end) < new Date());

  const Row = ({ c }: { c: (typeof list)[number] }) => {
    const seller = Array.isArray(c.drops.profiles) ? c.drops.profiles[0] : c.drops.profiles;
    return (
      <Link href={`/r/${c.cancel_token}`} className="tag-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold">{c.drops.title} <span className="font-normal text-muted">x{c.quantity}</span></p>
          <p className="text-sm text-muted">
            {seller?.farm_name || seller?.name}. {c.delivery === "shipping" ? "Shipping to you" : `${whenLabel(c.drops)}${c.drops.pickup_place ? ` at ${c.drops.pickup_place}` : ""}`}
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
      <h1 className="text-3xl font-semibold">My reservations</h1>
      <p className="mt-1 text-muted">Everything you have reserved while logged in.</p>

      <h2 className="mt-8 text-xl font-semibold">Coming up</h2>
      {upcoming.length === 0 ? (
        <div className="tag-card mt-3 p-6">
          <p className="text-muted">Nothing coming up. Browse what is claimable near you.</p>
          <Link href="/browse" className="btn btn-primary mt-3">Browse drops</Link>
        </div>
      ) : (
        <div className="mt-3 grid gap-3">{upcoming.map((c) => <Row key={c.id} c={c} />)}</div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-semibold">Past</h2>
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
