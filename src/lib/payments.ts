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

/* What happened when we tried to undo a card payment.
     null       nothing to undo (cash, or no payment intent)
     cancelled  the hold was released
     refunded   the charge was refunded
     failed     Stripe said no, and the buyer's money is still where it was

   "failed" matters: callers must not tell a buyer they were not charged,
   and must not release the claim, when the money is still held. */
export type UndoResult = "cancelled" | "refunded" | "failed" | null;

/* Undo a card payment whatever state it's in. Never throws. */
export async function undoPayment(
  claim: { payment_status: string; payment_intent_id: string | null },
  stripeAccount: string | null
): Promise<UndoResult> {
  const stripe = getStripe();
  if (!claim.payment_intent_id) return null;
  if (!["authorized", "captured"].includes(claim.payment_status)) return null;
  // There is money to undo but no way to reach Stripe. That's a failure,
  // not a no-op.
  if (!stripe) return "failed";
  const opts: Stripe.RequestOptions | undefined = stripeAccount ? { stripeAccount } : undefined;
  try {
    if (claim.payment_status === "authorized") {
      await stripe.paymentIntents.cancel(claim.payment_intent_id, undefined, opts);
      return "cancelled";
    }
    await stripe.refunds.create({ payment_intent: claim.payment_intent_id }, opts);
    return "refunded";
  } catch (e) {
    console.error("undoPayment failed:", e instanceof Error ? e.message : e);
    return "failed";
  }
}

/* The line to put in a buyer email about their money. Empty when there was
   nothing to undo, so cash reservations read normally. */
export function undoNote(undone: UndoResult): string {
  if (undone === "cancelled") return " The hold on your card has been released, so you were not charged.";
  if (undone === "refunded") return " Your card has been refunded in full. It usually shows up within a few days.";
  if (undone === "failed") return " We could not release the payment automatically. Contact the seller, or your bank if a charge stands.";
  return "";
}
