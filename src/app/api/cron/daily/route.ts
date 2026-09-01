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

  // Holds the seller never resolved: pickup passed over a day ago, never
  // marked picked up. Release them so buyers aren't stuck, tell both sides.
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: hanging } = await admin
    .from("claims")
    .select("id, buyer_email, buyer_name, quantity, payment_status, payment_intent_id, drops!inner(id, title, pickup_end, shops!drops_seller_id_fkey(owner_id, name, owner:profiles!shops_owner_id_fkey(email)))")
    .eq("payment_status", "authorized")
    .eq("picked_up", false)
    .is("cancelled_at", null)
    .lt("drops.pickup_end", dayAgo)
    .limit(200);
  let hangingReleased = 0;
  for (const c of hanging ?? []) {
    const d = (Array.isArray(c.drops) ? c.drops[0] : c.drops) as unknown as { id: string; title: string; shops: { owner_id: string; name: string; owner: { email: string | null } | { email: string | null }[] | null } | { owner_id: string; name: string; owner: { email: string | null } | { email: string | null }[] | null }[] };
    const shop = Array.isArray(d.shops) ? d.shops[0] : d.shops;
    const owner = Array.isArray(shop?.owner) ? shop?.owner[0] : shop?.owner;
    const { data: billing } = await admin.from("billing").select("stripe_account_id").eq("profile_id", shop?.owner_id ?? "").maybeSingle();
    const undone = await undoPayment(c, billing?.stripe_account_id ?? null);
    await admin.rpc("release_claim", { p_claim: c.id });
    hangingReleased++;
    if (c.buyer_email) {
      await sendEmail(c.buyer_email, `Hold released: ${d.title}`, `The pickup time for ${d.title} has passed and the seller didn't mark your order as picked up, so the hold on your card has been released. You were not charged.${undone ? "" : " If you still see a pending charge, it will drop off on its own within a few days."}\n\nIf you did pick it up, the seller can still take cash. Questions go to them.`);
    }
    if (owner?.email) {
      await sendEmail(owner.email, `Released: ${c.buyer_name}'s hold on ${d.title}`, `${c.buyer_name}'s card hold for ${c.quantity} of ${d.title} was released because pickup passed a day ago without being marked picked up.\n\nIf they did pick it up, you'll need to settle with them directly. Marking pickups on the day keeps this from happening: ${siteUrl()}/dashboard/drops/${d.id}`);
    }
  }

  return NextResponse.json({ reminded, released, hangingReleased });
}
