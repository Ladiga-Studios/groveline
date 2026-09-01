import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/stripe";
import { undoPayment, undoNote } from "@/lib/payments";
import { sendEmail } from "@/lib/email";

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
    .select("id, payment_status, payment_intent_id, buyer_email, buyer_name, quantity, drops!inner(title, seller_id, shops!drops_seller_id_fkey(owner_id, name))")
    .eq("id", id)
    .maybeSingle();
  const drop = Array.isArray(claim?.drops) ? claim?.drops[0] : claim?.drops;
  const shop = Array.isArray(drop?.shops) ? drop?.shops[0] : drop?.shops;
  if (!claim || shop?.owner_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: billing } = await admin.from("billing").select("stripe_account_id").eq("profile_id", shop.owner_id).maybeSingle();
  const undone = await undoPayment(claim, billing?.stripe_account_id ?? null);
  // Their card still has the money on it. Leave the claim alone so the
  // seller can try again rather than losing track of a live hold.
  if (undone === "failed") {
    return NextResponse.json(
      { error: "Stripe wouldn't release the money on their card, so nothing was removed. Try again shortly, or refund it from your Stripe dashboard." },
      { status: 502 }
    );
  }

  const { error } = await supabase.rpc("remove_claim", { p_claim: id });
  if (error) return NextResponse.json({ error: "Could not remove" }, { status: 500 });
  if (undone === "refunded") await admin.from("claims").update({ payment_status: "refunded" }).eq("id", id);

  if (claim.buyer_email) {
    const d = drop as { title: string; shops: { name: string } | { name: string }[] };
    const shopName = (Array.isArray(d.shops) ? d.shops[0] : d.shops)?.name ?? "The seller";
    sendEmail(
      claim.buyer_email,
      `Reservation removed: ${d.title}`,
      `${shopName} removed your reservation for ${claim.quantity} of ${d.title}.${undoNote(undone) ? `\n\n${undoNote(undone).trim()}` : ""}\n\nQuestions go to the seller directly. Find what else is for sale: ${siteUrl()}/browse`
    );
  }
  return NextResponse.json({ ok: true });
}
