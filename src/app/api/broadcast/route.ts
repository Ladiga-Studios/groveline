import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

/* Emails a seller's subscribers about a new drop. Called after drop creation.
   Only the drop's own seller can trigger it. */
export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: true });

  let body: { slug?: string; kind?: "new" | "update" };
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
    .select("id, seller_id, title, price_cents, pickup_place, pickup_start, pickup_end, slug, fulfillment, last_broadcast_at, shops!drops_seller_id_fkey(name, owner_id)")
    .eq("slug", body.slug)
    .maybeSingle();
  const shopRow = Array.isArray(drop?.shops) ? drop?.shops[0] : drop?.shops;
  if (!drop || shopRow?.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const isUpdate = body.kind === "update";
  if (isUpdate && drop.last_broadcast_at && Date.now() - new Date(drop.last_broadcast_at).getTime() < 60 * 60 * 1000) {
    return NextResponse.json({ error: "You emailed about this drop less than an hour ago. Give folks a minute." }, { status: 429 });
  }

  const [{ data: subs }, { data: followerRows }] = await Promise.all([
    admin
      .from("newsletter_subscribers")
      .select("email")
      .eq("seller_id", drop.seller_id),
    admin
      .from("follows")
      .select("profiles!follows_buyer_id_fkey(email)")
      .eq("seller_id", drop.seller_id),
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

  const sellerName = shopRow?.name || "Your seller";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
  const price = (drop.price_cents / 100).toFixed(2).replace(/\.00$/, "");
  const day = new Date(drop.pickup_start).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const where = drop.fulfillment === "shipping" ? `Ships to you, order by ${day}` : `Pickup ${day} at ${drop.pickup_place}`;
  const batch = emails.map((email) => ({
    from: process.env.RESEND_FROM || "Groveline <hello@groveline.io>",
    to: email,
    subject: isUpdate ? `Update from ${sellerName}: ${drop.title}` : `New drop from ${sellerName}: ${drop.title}`,
    text: `${sellerName} ${isUpdate ? "has an update on a drop" : "just posted a new drop"}.\n\n${drop.title}, $${price} each\n${where}\n\n${isUpdate ? "See what changed" : "Reserve yours"}: ${site}/d/${drop.slug}\n\nYou get these because you follow or subscribed to ${sellerName} on Groveline.\nStop these emails: ${site}/unsubscribe?s=${drop.seller_id}&e=${encodeURIComponent(email)}`,
  }));

  try {
    await resend.batch.send(batch);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  await admin.from("drops").update({ last_broadcast_at: new Date().toISOString() }).eq("id", drop.id);
  return NextResponse.json({ ok: true, sent: batch.length });
}
