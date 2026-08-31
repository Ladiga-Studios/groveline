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
    .select("id, payment_status, payment_intent_id, drops!inner(seller_id)")
    .eq("id", id)
    .maybeSingle();
  const drop = Array.isArray(claim?.drops) ? claim?.drops[0] : claim?.drops;
  if (!claim || drop?.seller_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (claim.payment_status === "authorized" && claim.payment_intent_id) {
    const stripe = getStripe();
    if (stripe) {
      try {
        await stripe.paymentIntents.cancel(claim.payment_intent_id);
      } catch {
        /* already released or expired */
      }
    }
  }

  const { error } = await supabase.rpc("remove_claim", { p_claim: id });
  if (error) return NextResponse.json({ error: "Could not remove" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
