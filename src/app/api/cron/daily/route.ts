import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { pickupWindow } from "@/lib/format";
import { siteUrl } from "@/lib/stripe";
import { undoPayment } from "@/lib/payments";

/* Runs once a day (see vercel.json). Sends pickup reminders for tomorrow
   and today, and releases card claims that never finished checkout. */
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const now = new Date();
  const soon = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const { data: claims } = await admin
    .from("claims")
    .select("id, buyer_email, buyer_name, quantity, cancel_token, delivery, drops!inner(title, pickup_place, pickup_address, pickup_city, pickup_start, pickup_end, slug)")
    .is("reminded_at", null)
    .is("cancelled_at", null)
    .not("buyer_email", "is", null)
    .eq("delivery", "pickup")
    .gte("drops.pickup_start", now.toISOString())
    .lte("drops.pickup_start", soon.toISOString())
    .limit(500);

  let reminded = 0;
  for (const c of claims ?? []) {
    const d = (Array.isArray(c.drops) ? c.drops[0] : c.drops) as {
      title: string; pickup_place: string; pickup_address: string | null; pickup_city: string | null;
      pickup_start: string; pickup_end: string; slug: string;
    };
    const where = [d.pickup_place, d.pickup_address, d.pickup_city].filter(Boolean).join(", ");
    await sendEmail(
      c.buyer_email!,
      `Pickup reminder: ${d.title}`,
      `Hi ${c.buyer_name}, a reminder that your ${c.quantity} of ${d.title} is ready for pickup ${pickupWindow(d.pickup_start, d.pickup_end)} at ${where}.\n\nGive your name at pickup.\n\nCan't make it? Cancel so someone else can have it: ${siteUrl()}/r/${c.cancel_token}`
    );
    await admin.from("claims").update({ reminded_at: now.toISOString() }).eq("id", c.id);
    reminded++;
  }

  // Card claims stuck in "pending" for over an hour never finished checkout.
  const stale = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { data: pending } = await admin
    .from("claims")
    .select("id")
    .eq("payment_status", "pending")
    .is("cancelled_at", null)
    .lt("created_at", stale)
    .limit(200);
  let released = 0;
  for (const p of pending ?? []) {
    await admin.rpc("release_claim", { p_claim: p.id });
    released++;
  }

  /* Shipping orders are on a different clock. A drop's pickup_end is the
     order-by deadline, not the ship date, so the seller is expected to
     still be packing boxes after it passes. Stripe expires an uncaptured
     hold 7 days after authorization regardless, so the useful thing is to
     warn the seller before that, not to cancel on them. reminded_at is
     free to reuse here: the pickup reminder above only ever touches
     delivery = pickup. */
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const { data: unshipped } = await admin
    .from("claims")
    .select("id, buyer_name, quantity, created_at, drops!inner(id, title, shops!drops_seller_id_fkey(owner_id, name, owner:profiles!shops_owner_id_fkey(email)))")
    .eq("payment_status", "authorized")
    .eq("delivery", "shipping")
    .eq("picked_up", false)
    .is("cancelled_at", null)
    .is("reminded_at", null)
    .lt("created_at", fiveDaysAgo)
    .limit(200);
  let shipWarned = 0;
  for (const c of unshipped ?? []) {
    const d = (Array.isArray(c.drops) ? c.drops[0] : c.drops) as unknown as {
      id: string; title: string;
      shops: { owner_id: string; name: string; owner: { email: string | null } | { email: string | null }[] | null } | { owner_id: string; name: string; owner: { email: string | null } | { email: string | null }[] | null }[];
    };
    const shop = Array.isArray(d.shops) ? d.shops[0] : d.shops;
    const owner = Array.isArray(shop?.owner) ? shop?.owner[0] : shop?.owner;
    if (owner?.email) {
      await sendEmail(
        owner.email,
        `Ship soon: ${c.buyer_name}'s order of ${d.title}`,
        `${c.buyer_name} ordered ${c.quantity} of ${d.title} five days ago and it isn't marked shipped yet.\n\nThe hold on their card expires two days from now. Mark it shipped before then and the card is charged as normal. After that the hold is gone and you'd have to ask them to pay again.\n\n${siteUrl()}/dashboard/drops/${d.id}`
      );
    }
    await admin.from("claims").update({ reminded_at: now.toISOString() }).eq("id", c.id);
    shipWarned++;
  }

  // Holds the seller never resolved. For pickup that's a day after the
  // window closed. For shipping it's once the hold is about to expire on
  // Stripe's side anyway, so releasing it changes nothing except that both
  // sides find out.
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const holdExpiry = new Date(now.getTime() - 6.5 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: hangingPickup }, { data: hangingShipping }] = await Promise.all([
    admin
      .from("claims")
      .select("id, buyer_email, buyer_name, quantity, delivery, payment_status, payment_intent_id, drops!inner(id, title, pickup_end, shops!drops_seller_id_fkey(owner_id, name, owner:profiles!shops_owner_id_fkey(email)))")
      .eq("payment_status", "authorized")
      .eq("delivery", "pickup")
      .eq("picked_up", false)
      .is("cancelled_at", null)
      .lt("drops.pickup_end", dayAgo)
      .limit(200),
    admin
      .from("claims")
      .select("id, buyer_email, buyer_name, quantity, delivery, payment_status, payment_intent_id, drops!inner(id, title, pickup_end, shops!drops_seller_id_fkey(owner_id, name, owner:profiles!shops_owner_id_fkey(email)))")
      .eq("payment_status", "authorized")
      .eq("delivery", "shipping")
      .eq("picked_up", false)
      .is("cancelled_at", null)
      .lt("created_at", holdExpiry)
      .limit(200),
  ]);
  const hanging = [...(hangingPickup ?? []), ...(hangingShipping ?? [])];
  let hangingReleased = 0;
  for (const c of hanging ?? []) {
    const d = (Array.isArray(c.drops) ? c.drops[0] : c.drops) as unknown as { id: string; title: string; shops: { owner_id: string; name: string; owner: { email: string | null } | { email: string | null }[] | null } | { owner_id: string; name: string; owner: { email: string | null } | { email: string | null }[] | null }[] };
    const shop = Array.isArray(d.shops) ? d.shops[0] : d.shops;
    const owner = Array.isArray(shop?.owner) ? shop?.owner[0] : shop?.owner;
    const { data: billing } = await admin.from("billing").select("stripe_account_id").eq("profile_id", shop?.owner_id ?? "").maybeSingle();
    const undone = await undoPayment(c, billing?.stripe_account_id ?? null);
    await admin.rpc("release_claim", { p_claim: c.id });
    hangingReleased++;
    const shipped = c.delivery === "shipping";
    if (c.buyer_email) {
      await sendEmail(
        c.buyer_email,
        `Hold released: ${d.title}`,
        shipped
          ? `Your order of ${d.title} was never marked shipped, so the hold on your card has been released and you were not charged.${undone === "failed" ? " If you still see a pending charge, it drops off on its own within a few days." : ""}\n\nIf it did ship, get in touch with the seller to settle up.`
          : `The pickup time for ${d.title} has passed and the seller didn't mark your order as picked up, so the hold on your card has been released. You were not charged.${undone === "failed" ? " If you still see a pending charge, it will drop off on its own within a few days." : ""}\n\nIf you did pick it up, the seller can still take cash. Questions go to them.`
      );
    }
    if (owner?.email) {
      await sendEmail(
        owner.email,
        `Released: ${c.buyer_name}'s hold on ${d.title}`,
        shipped
          ? `${c.buyer_name}'s card hold for ${c.quantity} of ${d.title} has been released. Stripe expires a hold seven days after it's placed, and this order was never marked shipped.\n\nIf you've already sent it, you'll need to settle with them directly. Marking orders shipped the day they go out keeps this from happening: ${siteUrl()}/dashboard/drops/${d.id}`
          : `${c.buyer_name}'s card hold for ${c.quantity} of ${d.title} was released because pickup passed a day ago without being marked picked up.\n\nIf they did pick it up, you'll need to settle with them directly. Marking pickups on the day keeps this from happening: ${siteUrl()}/dashboard/drops/${d.id}`
      );
    }
  }

  return NextResponse.json({ reminded, released, shipWarned, hangingReleased });
}
