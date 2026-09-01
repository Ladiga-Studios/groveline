import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/* Seller removes a claim (no show, cancelled by text). Any card hold is
   released so the buyer is never charged. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: claim } = await admin
    .from("claims")
    .select("id, payment_status, payment_intent_id, drops!inner(seller_id, shops!drops_seller_id_fkey(owner_id))")
    .eq("id", id)
    .maybeSingle();
  const drop = Array.isArray(claim?.drops) ? claim?.drops[0] : claim?.drops;
  const shop = Array.isArray(drop?.shops) ? drop?.shops[0] : drop?.shops;
  if (!claim || shop?.owner_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (claim.payment_status === "authorized" && claim.payment_intent_id) {
    const stripe = getStripe();
    if (stripe) {
      const { data: billing } = await supabaseAdmin()
        .from("billing")
        .select("stripe_account_id")
        .eq("profile_id", shop.owner_id)
        .maybeSingle();
      try {
        await stripe.paymentIntents.cancel(claim.payment_intent_id, {
          ...(billing?.stripe_account_id ? { stripeAccount: billing.stripe_account_id } : {}),
        } as never);
      } catch {
        /* already released or expired */
      }
    }
  }

  const { error } = await supabase.rpc("remove_claim", { p_claim: id });
  if (error) return NextResponse.json({ error: "Could not remove" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
