import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { undoPayment } from "@/lib/payments";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";

/* Seller cancels a whole drop. Every live reservation is released, every
   card hold released or charge refunded, and every buyer emailed the
   reason. The seller can't cancel without telling people. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };
  const why = (reason ?? "").trim().slice(0, 500);
  if (why.length < 5) return NextResponse.json({ error: "Tell your buyers why, even briefly. They deserve that." }, { status: 400 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: drop } = await admin
    .from("drops")
    .select("id, title, slug, status, shops!drops_seller_id_fkey(owner_id, name)")
    .eq("id", id)
    .maybeSingle();
  const shop = Array.isArray(drop?.shops) ? drop?.shops[0] : drop?.shops;
  if (!drop || shop?.owner_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: billing } = await admin.from("billing").select("stripe_account_id").eq("profile_id", user.id).maybeSingle();
  const { data: claims } = await admin
    .from("claims")
    .select("id, buyer_email, buyer_name, quantity, payment_status, payment_intent_id, picked_up")
    .eq("drop_id", id)
    .is("cancelled_at", null);

  let released = 0;
  let refunded = 0;
  for (const c of claims ?? []) {
    if (c.picked_up) continue; // already handed over, that sale stands
    const undone = await undoPayment(c, billing?.stripe_account_id ?? null);
    await admin.rpc("release_claim", { p_claim: c.id });
    if (undone === "refunded") {
      await admin.from("claims").update({ payment_status: "refunded" }).eq("id", c.id);
      refunded++;
    } else if (undone === "cancelled") released++;
    if (c.buyer_email) {
      sendEmail(
        c.buyer_email,
        `Cancelled: ${drop.title}`,
        `${shop?.name ?? "The seller"} had to cancel ${drop.title}.\n\nTheir note: ${why}\n\nYour reservation for ${c.quantity} is off the list.${undone === "cancelled" ? " The hold on your card has been released, you were not charged." : undone === "refunded" ? " Your card has been refunded in full; it usually shows up within a few days." : ""}\n\nSee what else is for sale: ${siteUrl()}/browse`
      );
    }
  }

  await admin.from("drops").update({ status: "closed", cancel_reason: why, cancelled_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true, notified: (claims ?? []).filter((c) => !c.picked_up).length, released, refunded });
}
