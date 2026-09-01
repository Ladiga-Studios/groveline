import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { undoPayment } from "@/lib/payments";
import { sendEmail } from "@/lib/email";

/* Seller refunds a charged reservation. The seller's decision, their
   Stripe account, their money. Groveline just carries it out. */
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
    .select("id, payment_status, payment_intent_id, buyer_email, quantity, drops!inner(title, shops!drops_seller_id_fkey(owner_id, name))")
    .eq("id", id)
    .maybeSingle();
  const drop = Array.isArray(claim?.drops) ? claim?.drops[0] : claim?.drops;
  const shop = Array.isArray(drop?.shops) ? drop?.shops[0] : drop?.shops;
  if (!claim || shop?.owner_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.payment_status !== "captured") return NextResponse.json({ error: "Nothing to refund on this one." }, { status: 400 });

  const { data: billing } = await admin.from("billing").select("stripe_account_id").eq("profile_id", user.id).maybeSingle();
  const undone = await undoPayment(claim, billing?.stripe_account_id ?? null);
  if (undone !== "refunded") return NextResponse.json({ error: "Stripe couldn't process that refund. Try from your Stripe dashboard." }, { status: 502 });

  await admin.from("claims").update({ payment_status: "refunded" }).eq("id", id);
  if (claim.buyer_email) {
    sendEmail(
      claim.buyer_email,
      `Refunded: ${drop?.title}`,
      `${shop?.name ?? "The seller"} refunded your card for ${claim.quantity} of ${drop?.title}. It usually shows up within a few days.`
    );
  }
  return NextResponse.json({ ok: true });
}
