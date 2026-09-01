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
  const [{ data: profile }, { data: billing }] = await Promise.all([
    admin.from("profiles").select("is_admin, payouts_enabled, drops_created").eq("id", user.id).maybeSingle(),
    admin.from("billing").select("*").eq("profile_id", user.id).maybeSingle(),
  ]);
  // Lifetime count, not a live row count: deleting a drop or a shop must
  // not hand back a free slot.
  const dropsCount = profile?.drops_created ?? 0;

  const stripe = getStripe();
  const stripeConfigured = !!stripe;
  const plansConfigured = !!stripe && !!(process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID);
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

  // Live subscription details straight from Stripe, for the settings screen.
  let plan: null | { interval: "month" | "year"; renewsAt: string; cancelAtPeriodEnd: boolean; trialing: boolean } = null;
  if (stripe && billing?.stripe_customer_id && subscribed) {
    try {
      const subs = await stripe.subscriptions.list({ customer: billing.stripe_customer_id, status: "all", limit: 5 });
      const live = subs.data.find((x) => ["active", "trialing", "past_due"].includes(x.status));
      if (live) {
        const item = live.items.data[0];
        plan = {
          interval: item?.price.recurring?.interval === "year" ? "year" : "month",
          renewsAt: new Date(live.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: !!live.cancel_at_period_end,
          trialing: live.status === "trialing",
        };
      }
    } catch {
      plan = null;
    }
  }

  return NextResponse.json({
    plan,
    stripeConfigured,
    yearlyAvailable: !!process.env.STRIPE_PRICE_ID_YEARLY,
    subscribed,
    subscriptionStatus: billing?.subscription_status ?? "none",
    dropsCount,
    plansConfigured,
    needsSubscription: plansConfigured && !profile?.is_admin && !subscribed && dropsCount >= 3,
    freeLeft: plansConfigured && !profile?.is_admin && !subscribed ? Math.max(0, 3 - dropsCount) : null,
    hasStripeAccount: !!billing?.stripe_account_id,
    payoutsEnabled,
  });
}
