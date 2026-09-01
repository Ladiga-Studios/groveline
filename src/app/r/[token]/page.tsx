import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { money, pickupWindow } from "@/lib/format";
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

  const headline =
    status === "cancelled" ? "This one's cancelled"
    : status === "picked_up" ? (claim.delivery === "shipping" ? "It's on its way" : "You got it")
    : status === "unpaid" ? "Almost there"
    : "You're all set";
  const payment =
    claim.payment_status === "captured" ? "Paid by card"
    : claim.payment_status === "authorized" ? "Card on hold, charged at pickup"
    : claim.payment_status === "pending" ? "Card payment didn't finish"
    : claim.payment_status === "cancelled" ? "Card hold released"
    : claim.payment_status === "refunded" ? "Refunded to your card"
    : "Cash at pickup";
  const showMap = claim.delivery !== "shipping" && d.pickup_place;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {paid && !claim.cancelled_at && (
        <p className="tag-card mb-5 p-4 font-medium text-grove">Card hold's in place. You're only actually charged once you pick up.</p>
      )}
      {cancelled && claim.payment_status === "pending" && (
        <p className="tag-card mb-5 p-4 text-muted">Looks like the card payment didn't go through. Your spot's held for about an hour if you want another shot, otherwise it opens back up.</p>
      )}

      <div className={`grid gap-8 ${showMap ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12" : "lg:max-w-xl"}`}>
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{headline}</h1>
          {status === "reserved" && (
            <p className="mt-2 text-lg text-muted">Give your name at pickup. That's all there is to it.</p>
          )}

          <div className="tag-card mt-6 p-6">
            <p className="font-display text-2xl font-semibold">{d.title}</p>
            <dl className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
              <dt className="text-muted">Reserved under</dt>
              <dd className="font-semibold">{claim.buyer_name}</dd>
              <dt className="text-muted">How many</dt>
              <dd>{claim.quantity} at {money(d.price_cents)} each, {money(d.price_cents * claim.quantity)} total</dd>
              <dt className="text-muted">{claim.delivery === "shipping" ? "Ships to" : "Pickup"}</dt>
              <dd>{claim.delivery === "shipping" ? claim.ship_address : `${pickupWindow(d.pickup_start, d.pickup_end)}${d.pickup_place ? ` at ${d.pickup_place}` : ""}`}</dd>
              <dt className="text-muted">Payment</dt>
              <dd>{payment}</dd>
              {seller && (
                <>
                  <dt className="text-muted">Seller</dt>
                  <dd><Link href={`/s/${seller.slug}`} className="text-grove underline underline-offset-2">{seller.name}</Link></dd>
                </>
              )}
              {claim.tracking && (
                <>
                  <dt className="text-muted">Tracking</dt>
                  <dd className="font-mono">{claim.tracking}</dd>
                </>
              )}
            </dl>
            {d.cancel_reason && (
              <p className="mt-4 rounded-lg bg-cream p-3 text-sm">
                <span className="font-semibold">The seller cancelled this drop.</span> Their note: {d.cancel_reason}
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {status === "reserved" && !ended && (
              <CancelButton token={token} hasCardHold={claim.payment_status === "authorized"} />
            )}
            <Link href={`/d/${d.slug}`} className="btn btn-grove">Back to the drop</Link>
          </div>
          <p className="mt-4 text-sm text-muted">Hang onto this page, it's your whole reservation and you don't need a login for it.</p>
        </div>

        {showMap && (
          <div className="lg:pt-2">
            <h2 className="text-lg font-semibold">Where to go</h2>
            <div className="mt-3">
              <PickupMap lat={d.pickup_lat} lng={d.pickup_lng} address={fullAddress(d)} place={d.pickup_place} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
