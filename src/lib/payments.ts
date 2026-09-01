import type Stripe from "stripe";
import { getStripe } from "./stripe";

/* Card holds expire after 7 days. Pickups further out than that get
   charged up front and refunded if anyone cancels, so a buyer is never
   stuck with a failed capture at the table. */
export const HOLD_WINDOW_DAYS = 6;

export function captureModeFor(pickupEndIso: string): "manual" | "automatic" {
  const days = (new Date(pickupEndIso).getTime() - Date.now()) / 86400000;
  return days > HOLD_WINDOW_DAYS ? "automatic" : "manual";
}

/* Undo a card payment whatever state it's in: release a hold, or refund
   a charge. Returns the new payment status for the claim. Never throws. */
export async function undoPayment(
  claim: { payment_status: string; payment_intent_id: string | null },
  stripeAccount: string | null
): Promise<"cancelled" | "refunded" | null> {
  const stripe = getStripe();
  if (!stripe || !claim.payment_intent_id) return null;
  const opts: Stripe.RequestOptions | undefined = stripeAccount ? { stripeAccount } : undefined;
  try {
    if (claim.payment_status === "authorized") {
      await stripe.paymentIntents.cancel(claim.payment_intent_id, undefined, opts);
      return "cancelled";
    }
    if (claim.payment_status === "captured") {
      await stripe.refunds.create({ payment_intent: claim.payment_intent_id }, opts);
      return "refunded";
    }
  } catch (e) {
    console.error("undoPayment failed:", e instanceof Error ? e.message : e);
  }
  return null;
}
