import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { money, whenLabel } from "@/lib/format";
import { fullAddress } from "@/lib/geocode";
import PickupMap from "@/components/PickupMap";
import CancelButton from "./CancelButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your reservation", robots: { index: false } };

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { token } = await params;
  const { paid, cancelled } = await searchParams;
  const admin = supabaseAdmin();
  const { data: claim } = await admin
    .from("claims")
    .select("*, drops!inner(*, shops!drops_seller_id_fkey(name, slug))")
    .eq("cancel_token", token)
    .maybeSingle();
  if (!claim) notFound();

  const d = Array.isArray(claim.drops) ? claim.drops[0] : claim.drops;
  const seller = Array.isArray(d.shops) ? d.shops[0] : d.shops;
  const ended = new Date(d.pickup_end) < new Date();
  const status = claim.cancelled_at
    ? "cancelled"
    : claim.picked_up
      ? "picked_up"
      : claim.payment_status === "pending"
        ? "unpaid"
        : "reserved";

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      {paid && !claim.cancelled_at && (
        <p className="tag-card mb-4 p-4 font-medium text-grove">Card hold's in place. You're only actually charged once you pick up.</p>
      )}
      {cancelled && claim.payment_status === "pending" && (
        <p className="tag-card mb-4 p-4 text-muted">Looks like the card payment didn't go through. Your spot's held for about an hour if you want another shot, otherwise it opens back up.</p>
      )}

      <h1 className="text-3xl font-semibold">
        {status === "cancelled" ? "This one's cancelled" : status === "picked_up" ? (claim.delivery === "shipping" ? "It's on its way" : "You got it") : status === "unpaid" ? "Almost there" : "You're all set"}
      </h1>

      <div className="tag-card mt-6 p-6">
        <p className="font-display text-2xl font-semibold">{d.title}</p>
        <p className="mt-1 text-muted">
          {claim.quantity} at {money(d.price_cents)} each, {money(d.price_cents * claim.quantity)} total
        </p>
        <p className="mt-3">Reserved under <span className="font-semibold">{claim.buyer_name}</span>{seller ? ` with ${seller.name}` : ""}.</p>
        <p className="mt-1">{claim.delivery === "shipping" ? `Ships to ${claim.ship_address}` : whenLabel(d)}</p>
        <p className="mt-3 text-sm">
          Payment:{" "}
          {claim.payment_status === "captured"
            ? "paid by card, all set"
            : claim.payment_status === "authorized"
              ? "card on hold, charges at pickup"
              : claim.payment_status === "pending"
                ? "card payment didn't finish"
                : claim.payment_status === "cancelled"
                  ? "card hold released, you're good"
                  : claim.payment_status === "refunded"
                    ? "refunded to your card"
                    : "cash at pickup"}
        </p>
        {claim.tracking && <p className="mt-1 text-sm">Tracking: <span className="font-mono">{claim.tracking}</span></p>}
        {d.cancel_reason && (
          <p className="mt-3 rounded-lg bg-cream p-3 text-sm">
            <span className="font-semibold">The seller cancelled this drop.</span> Their note: {d.cancel_reason}
          </p>
        )}
      </div>

      {claim.delivery !== "shipping" && d.pickup_place && (
        <div className="mt-4">
          <PickupMap lat={d.pickup_lat} lng={d.pickup_lng} address={fullAddress(d)} place={d.pickup_place} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {status === "reserved" && !ended && (
          <CancelButton token={token} hasCardHold={claim.payment_status === "authorized"} />
        )}
        <Link href={`/d/${d.slug}`} className="btn btn-grove">Back to the drop</Link>
      </div>
      <p className="mt-4 text-sm text-muted">Hang onto this page, it's your whole reservation and you don't need a login for it.</p>
    </div>
  );
}
