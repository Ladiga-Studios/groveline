import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

/* Emails a seller's subscribers about a new drop. Called after drop creation.
   Only the drop's own seller can trigger it. */
export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: true });

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!body.slug) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const auth = await supabaseServer();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: drop } = await admin
    .from("drops")
    .select("id, seller_id, title, price_cents, pickup_place, pickup_start, slug, profiles!drops_seller_id_fkey(name, farm_name)")
    .eq("slug", body.slug)
    .maybeSingle();
  if (!drop || drop.seller_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: subs }, { data: followerRows }] = await Promise.all([
    admin
      .from("newsletter_subscribers")
      .select("email")
      .eq("seller_id", user.id),
    admin
      .from("follows")
      .select("profiles!follows_buyer_id_fkey(email)")
      .eq("seller_id", user.id),
  ]);

  const followerEmails = (followerRows ?? [])
    .map((r) => {
      const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return prof?.email as string | null;
    })
    .filter(Boolean) as string[];

  const emails = Array.from(
    new Set([...(subs ?? []).map((s) => s.email), ...followerEmails])
  );
  if (emails.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const profile = Array.isArray(drop.profiles) ? drop.profiles[0] : drop.profiles;
  const sellerName = profile?.farm_name || profile?.name || "Your seller";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  const price = (drop.price_cents / 100).toFixed(2).replace(/\.00$/, "");
  const day = new Date(drop.pickup_start).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const batch = emails.map((email) => ({
    from: process.env.RESEND_FROM || "Groveline <hello@groveline.io>",
    to: email,
    subject: `New drop from ${sellerName}: ${drop.title}`,
    text: `${sellerName} just posted a new drop.\n\n${drop.title}, $${price} each\nPickup ${day} at ${drop.pickup_place}\n\nReserve yours: ${site}/d/${drop.slug}\n\nYou get these because you follow or subscribed to ${sellerName} on Groveline.\nStop these emails: ${site}/unsubscribe?s=${user.id}&e=${encodeURIComponent(email)}`,
  }));

  try {
    await resend.batch.send(batch);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sent: batch.length });
}
