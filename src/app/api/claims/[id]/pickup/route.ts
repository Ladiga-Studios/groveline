import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";

/* Seller marks a claim picked up (or un-marks it). For card claims,
   picking up is the moment the held funds get captured. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { picked_up, tracking } = (await req.json().catch(() => ({}))) as { picked_up?: boolean; tracking?: string };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: claim } = await admin
    .from("claims")
    .select("id, payment_status, payment_intent_id, capture_mode, picked_up, delivery, buyer_email, buyer_name, quantity, drops!inner(id, title, seller_id, shops!drops_seller_id_fkey(owner_id, name))")
    .eq("id", id)
    .maybeSingle();
  const drop = Array.isArray(claim?.drops) ? claim?.drops[0] : claim?.drops;
  const shop = Array.isArray(drop?.shops) ? drop?.shops[0] : drop?.shops;
  if (!claim || shop?.owner_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Un-marking is fine for cash and for cards charged up front, since the
  // flag is only bookkeeping there. But when the card was charged *by* the
  // pickup, un-marking would leave a paid buyer looking unpaid. The way
  // back from a mistaken tap there is the refund button.
  if (!picked_up && claim.picked_up && claim.payment_status === "captured" && claim.capture_mode === "manual") {
    return NextResponse.json(
      { error: "That card was charged at pickup, so this can't be undone. If it was a mistake, refund it instead." },
      { status: 409 }
    );
  }

  const update: Record<string, unknown> = {
    picked_up: !!picked_up,
    picked_up_at: picked_up ? new Date().toISOString() : null,
    ...(typeof tracking === "string" ? { tracking: tracking.trim().slice(0, 120) || null } : {}),
  };

  if (picked_up && claim.payment_status === "authorized" && claim.payment_intent_id) {
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });
    // Direct charges live on the seller's account, so the capture has to be
    // made against that account too.
    const { data: billing } = await admin
      .from("billing")
      .select("stripe_account_id")
      .eq("profile_id", shop.owner_id)
      .maybeSingle();
    if (!billing?.stripe_account_id) {
      return NextResponse.json({ error: "Card payments aren't set up on this shop." }, { status: 400 });
    }
    try {
      await stripe.paymentIntents.capture(claim.payment_intent_id, undefined, {
        stripeAccount: billing.stripe_account_id,
      });
      update.payment_status = "captured";
      update.paid = true;
    } catch {
      return NextResponse.json(
        {
          error:
            claim.delivery === "shipping"
              ? "Could not charge the card. The hold expires seven days after the order, so it may be gone. You'll need to ask them to pay another way."
              : "Could not charge the card. The hold may have expired. Take cash and mark it picked up again.",
        },
        { status: 502 }
      );
    }
  }

  const { error } = await admin.from("claims").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update" }, { status: 500 });
  return NextResponse.json({ ok: true, payment_status: update.payment_status ?? claim.payment_status });
}
