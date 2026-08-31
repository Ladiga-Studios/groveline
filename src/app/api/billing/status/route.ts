import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/* Everything the seller screens need to know about billing and payouts. */
export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const [{ data: profile }, { data: billing }, { count: dropsCount }] = await Promise.all([
    admin.from("profiles").select("is_admin, payouts_enabled").eq("id", user.id).maybeSingle(),
    admin.from("billing").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("drops").select("*", { count: "exact", head: true }).eq("seller_id", user.id),
  ]);

  const stripe = getStripe();
  const stripeConfigured = !!stripe && !!(process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID);
  const subscribed = ["active", "trialing", "past_due"].includes(billing?.subscription_status ?? "none");

  // Refresh payout status from Stripe if an account exists but isn't enabled yet.
  let payoutsEnabled = !!profile?.payouts_enabled;
  if (stripe && billing?.stripe_account_id && !payoutsEnabled) {
    try {
      const acct = await stripe.accounts.retrieve(billing.stripe_account_id);
      payoutsEnabled = !!acct.charges_enabled && !!acct.payouts_enabled;
      if (payoutsEnabled) {
        await admin.from("profiles").update({ payouts_enabled: true }).eq("id", user.id);
      }
    } catch {
      /* leave as is */
    }
  }

  return NextResponse.json({
    stripeConfigured,
    yearlyAvailable: !!process.env.STRIPE_PRICE_ID_YEARLY,
    subscribed,
    subscriptionStatus: billing?.subscription_status ?? "none",
    dropsCount: dropsCount ?? 0,
    needsSubscription: stripeConfigured && !profile?.is_admin && !subscribed && (dropsCount ?? 0) >= 1,
    hasStripeAccount: !!billing?.stripe_account_id,
    payoutsEnabled,
  });
}
