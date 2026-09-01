import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/stripe";
import { undoPayment } from "@/lib/payments";
import { sendEmail } from "@/lib/email";

/* Buyer cancels from their reservation page. Frees the items and releases
   any card hold. Not allowed once pickup has passed or after pickup. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = supabaseAdmin();
  const { data: claim } = await admin
    .from("claims")
    .select("id, buyer_name, quantity, picked_up, cancelled_at, payment_status, payment_intent_id, drops!inner(id, title, pickup_end, seller_id, shops!drops_seller_id_fkey(owner:profiles!shops_owner_id_fkey(email, notify_on_claim)))")
    .eq("cancel_token", token)
    .maybeSingle();
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.cancelled_at) return NextResponse.json({ ok: true });
  type Owner = { email: string | null; notify_on_claim: boolean };
  const drop = (Array.isArray(claim.drops) ? claim.drops[0] : claim.drops) as unknown as {
    id: string; title: string; pickup_end: string; seller_id: string;
    shops: { owner_id: string; owner: Owner | Owner[] | null } | { owner_id: string; owner: Owner | Owner[] | null }[] | null;
  };
  if (claim.picked_up || new Date(drop.pickup_end) < new Date()) {
    return NextResponse.json({ error: "Too late to cancel" }, { status: 400 });
  }

  const shopRowEarly = Array.isArray(drop.shops) ? drop.shops[0] : drop.shops;
  let undone: "cancelled" | "refunded" | null = null;
  if (shopRowEarly?.owner_id && ["authorized", "captured"].includes(claim.payment_status)) {
    const { data: billing } = await admin.from("billing").select("stripe_account_id").eq("profile_id", shopRowEarly.owner_id).maybeSingle();
    undone = await undoPayment(claim, billing?.stripe_account_id ?? null);
  }

  await admin.rpc("release_claim", { p_claim: claim.id });
  if (undone === "refunded") await admin.from("claims").update({ payment_status: "refunded" }).eq("id", claim.id);

  const shopRow = shopRowEarly;
  const seller = Array.isArray(shopRow?.owner) ? shopRow?.owner[0] : shopRow?.owner;
  if (seller?.notify_on_claim && seller.email) {
    sendEmail(
      seller.email,
      `Cancelled: ${claim.buyer_name} x${claim.quantity} for ${drop.title}`,
      `${claim.buyer_name} cancelled their reservation for ${claim.quantity} of ${drop.title}. Those items are available again.\n\n${siteUrl()}/dashboard/drops/${drop.id}`
    );
  }
  return NextResponse.json({ ok: true });
}
