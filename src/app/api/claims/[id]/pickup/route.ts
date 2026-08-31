import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/* Seller marks a claim picked up (or un-marks it). For card claims,
   picking up is the moment the held funds get captured. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { picked_up } = (await req.json().catch(() => ({}))) as { picked_up?: boolean };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: claim } = await admin
    .from("claims")
    .select("id, payment_status, payment_intent_id, drops!inner(seller_id)")
    .eq("id", id)
    .maybeSingle();
  const drop = Array.isArray(claim?.drops) ? claim?.drops[0] : claim?.drops;
  if (!claim || drop?.seller_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = { picked_up: !!picked_up };

  if (picked_up && claim.payment_status === "authorized" && claim.payment_intent_id) {
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });
    try {
      await stripe.paymentIntents.capture(claim.payment_intent_id);
      update.payment_status = "captured";
      update.paid = true;
    } catch {
      return NextResponse.json(
        { error: "Could not charge the card. The hold may have expired. Take cash and mark it picked up again." },
        { status: 502 }
      );
    }
  }

  const { error } = await admin.from("claims").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update" }, { status: 500 });
  return NextResponse.json({ ok: true, payment_status: update.payment_status ?? claim.payment_status });
}
