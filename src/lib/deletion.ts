/*
  Deleting a shop or an account is not just a DELETE. Other people have
  money on the line and reservations they're counting on, so anything live
  has to be settled and everyone affected told before the rows go away.

  Order matters throughout: undo money first, notify second, delete last.
  If the money step fails we stop, because a deleted row can't be refunded.
*/

import { supabaseAdmin } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { undoPayment, undoNote } from "@/lib/payments";

type ClaimRow = {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  quantity: number;
  picked_up: boolean;
  payment_status: string;
  payment_intent_id: string | null;
};

export type TeardownResult = { ok: true } | { ok: false; error: string };

/* Cancel every open reservation on a shop's drops, release or refund the
   money, and tell the buyers why. Returns an error if any payment could
   not be undone, so the caller can stop before deleting anything. */
export async function settleShopBeforeDelete(
  shopId: string,
  shopName: string,
  reason: string
): Promise<TeardownResult> {
  const admin = supabaseAdmin();

  const { data: shop } = await admin.from("shops").select("owner_id").eq("id", shopId).maybeSingle();
  const { data: billing } = shop
    ? await admin.from("billing").select("stripe_account_id").eq("profile_id", shop.owner_id).maybeSingle()
    : { data: null };

  const { data: drops } = await admin.from("drops").select("id, title").eq("seller_id", shopId);
  if (!drops || drops.length === 0) return { ok: true };

  for (const drop of drops) {
    const { data: claims } = await admin
      .from("claims")
      .select("id, buyer_name, buyer_email, quantity, picked_up, payment_status, payment_intent_id")
      .eq("drop_id", drop.id)
      .is("cancelled_at", null);

    for (const claim of (claims ?? []) as ClaimRow[]) {
      if (claim.picked_up) continue; // already handed over, that sale stands

      const undone = await undoPayment(claim, billing?.stripe_account_id ?? null);
      if (undone === "failed") {
        return {
          ok: false,
          error: `Stripe wouldn't release the payment for ${claim.buyer_name} on "${drop.title}". Nothing has been deleted. Settle that payment in Stripe, then try again.`,
        };
      }

      if (claim.buyer_email) {
        sendEmail(
          claim.buyer_email,
          `Cancelled: ${drop.title}`,
          `${shopName} has closed up on Groveline, so your reservation for ${claim.quantity} of ${drop.title} is cancelled.\n\n${reason}${undoNote(undone)}\n\nSee what else is for sale near you: ${siteUrl()}/browse`
        );
      }
    }
  }

  return { ok: true };
}

/* Cancel a seller's Groveline subscription outright. Used when an account
   is being deleted: cancel_at_period_end would leave them billed for a
   plan attached to an account that no longer exists. */
export async function cancelSubscriptionNow(profileId: string): Promise<TeardownResult> {
  const stripe = getStripe();
  const admin = supabaseAdmin();
  const { data: billing } = await admin
    .from("billing")
    .select("stripe_customer_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!billing?.stripe_customer_id) return { ok: true };
  if (!stripe) {
    return { ok: false, error: "Can't reach Stripe to cancel your plan right now. Nothing was deleted. Try again shortly." };
  }

  try {
    const subs = await stripe.subscriptions.list({
      customer: billing.stripe_customer_id,
      status: "all",
      limit: 10,
    });
    for (const sub of subs.data) {
      if (["active", "trialing", "past_due", "unpaid"].includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
    return { ok: true };
  } catch (e) {
    console.error("cancelSubscriptionNow failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Couldn't cancel your plan in Stripe, so nothing was deleted. Try again shortly." };
  }
}

/* A person's reservations as a buyer. Live ones get cancelled and the
   seller told, because a name on a pickup list that no longer belongs to
   anyone is worse for the seller than one fewer reservation. Past ones
   stay as the seller's record of a completed sale, with the buyer's
   personal details stripped out. */
export async function settleBuyerClaims(profileId: string, buyerName: string): Promise<TeardownResult> {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: claims } = await admin
    .from("claims")
    .select(
      "id, buyer_name, quantity, picked_up, cancelled_at, payment_status, payment_intent_id, drops!inner(id, title, pickup_end, seller_id, shops!drops_seller_id_fkey(name, owner:profiles!shops_owner_id_fkey(email)))"
    )
    .eq("buyer_user_id", profileId);

  for (const claim of claims ?? []) {
    const d = (Array.isArray(claim.drops) ? claim.drops[0] : claim.drops) as unknown as {
      id: string;
      title: string;
      pickup_end: string;
      shops: { name: string; owner: { email: string | null } | { email: string | null }[] | null } | { name: string; owner: { email: string | null } | { email: string | null }[] | null }[];
    };
    const shop = Array.isArray(d?.shops) ? d.shops[0] : d?.shops;
    const owner = Array.isArray(shop?.owner) ? shop?.owner[0] : shop?.owner;

    const live = !claim.picked_up && !claim.cancelled_at && new Date(d.pickup_end) > new Date();
    if (live) {
      const { data: sellerBilling } = await admin
        .from("shops")
        .select("owner_id")
        .eq("id", (claim.drops as unknown as { seller_id: string }).seller_id ?? "")
        .maybeSingle();
      const { data: acct } = sellerBilling
        ? await admin.from("billing").select("stripe_account_id").eq("profile_id", sellerBilling.owner_id).maybeSingle()
        : { data: null };

      const undone = await undoPayment(claim as unknown as ClaimRow, acct?.stripe_account_id ?? null);
      if (undone === "failed") {
        return {
          ok: false,
          error: `We couldn't release the payment on your reservation for "${d.title}". Nothing was deleted. Cancel that reservation yourself, then try again.`,
        };
      }
      await admin.rpc("release_claim", { p_claim: claim.id });
      if (owner?.email) {
        sendEmail(
          owner.email,
          `Reservation cancelled: ${d.title}`,
          `${buyerName} closed their Groveline account, so their reservation for ${claim.quantity} of ${d.title} has been cancelled and those spots are back up for grabs.\n\n${siteUrl()}/dashboard/drops/${d.id}`
        );
      }
    }
  }

  /* Strip the personal details off everything they ever reserved. The row
     survives as the seller's record of the sale; the person doesn't. */
  await admin
    .from("claims")
    .update({
      buyer_name: "Deleted account",
      buyer_phone: "",
      buyer_email: null,
      ship_address: null,
      ip_address: null,
      buyer_user_id: null,
      anonymized_at: now,
    })
    .eq("buyer_user_id", profileId);

  return { ok: true };
}
