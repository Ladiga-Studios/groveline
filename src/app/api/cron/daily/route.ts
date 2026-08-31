import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { pickupWindow } from "@/lib/format";
import { siteUrl } from "@/lib/stripe";

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

  return NextResponse.json({ reminded, released });
}
