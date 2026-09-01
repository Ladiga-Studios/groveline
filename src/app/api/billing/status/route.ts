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
  const { data: myShops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const shopIds = (myShops ?? []).map((x) => x.id);
  const [{ data: profile }, { data: billing }, { count: dropsCount }] = await Promise.all([
    admin.from("profiles").select("is_admin, payouts_enabled").eq("id", user.id).maybeSingle(),
    admin.from("billing").select("*").eq("profile_id", user.id).maybeSingle(),
    shopIds.length
      ? admin.from("drops").select("*", { count: "exact", head: true }).in("seller_id", shopIds)
      : Promise.resolve({ count: 0 }),
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
    needsSubscription: stripeConfigured && !profile?.is_admin && !subscribed && (dropsCount ?? 0) >= 3,
    freeLeft: stripeConfigured && !profile?.is_admin && !subscribed ? Math.max(0, 3 - (dropsCount ?? 0)) : null,
    hasStripeAccount: !!billing?.stripe_account_id,
    payoutsEnabled,
  });
}
