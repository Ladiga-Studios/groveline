import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/* Stripe tells us what happened; we mirror it into the database. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ ok: true });

  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === "payment" && s.metadata?.claim_id) {
        await admin
          .from("claims")
          .update({
            payment_intent_id: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
            payment_status: "authorized",
          })
          .eq("id", s.metadata.claim_id);
      }
      if (s.mode === "subscription" && s.metadata?.profile_id) {
        await admin.from("billing").upsert({
          profile_id: s.metadata.profile_id,
          stripe_customer_id: typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        });
      }
      break;
    }
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === "payment" && s.metadata?.claim_id) {
        const { data: claim } = await admin
          .from("claims")
          .select("payment_status")
          .eq("id", s.metadata.claim_id)
          .maybeSingle();
        if (claim?.payment_status === "pending") {
          await admin.rpc("release_claim", { p_claim: s.metadata.claim_id });
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const profileId = sub.metadata?.profile_id;
      const q = admin.from("billing").update({ subscription_status: status, updated_at: new Date().toISOString() });
      if (profileId) await q.eq("profile_id", profileId);
      else await q.eq("stripe_customer_id", customerId);
      break;
    }
    case "account.updated": {
      const acct = event.data.object as Stripe.Account;
      const enabled = !!acct.charges_enabled && !!acct.payouts_enabled;
      const { data: billing } = await admin
        .from("billing")
        .select("profile_id")
        .eq("stripe_account_id", acct.id)
        .maybeSingle();
      if (billing) {
        await admin.from("profiles").update({ payouts_enabled: enabled }).eq("id", billing.profile_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
