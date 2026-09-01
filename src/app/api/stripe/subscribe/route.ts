import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";

/* Starts a $10/month subscription checkout. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const { interval, promo } = (await req.json().catch(() => ({}))) as { interval?: "month" | "year"; promo?: string };
  const price = interval === "year"
    ? process.env.STRIPE_PRICE_ID_YEARLY
    : process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID;
  if (!stripe || !price) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: billing } = await admin.from("billing").select("*").eq("profile_id", user.id).maybeSingle();

  let customerId = billing?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { profile_id: user.id } });
    customerId = customer.id;
    await admin.from("billing").upsert({ profile_id: user.id, stripe_customer_id: customerId });
  }

  // The free-month code gives a real 30-day trial on either plan, so
  // "one month free" means one month free no matter what they pick.
  // Any other code gets looked up in Stripe as a normal coupon.
  const freeMonthCode = (process.env.FREE_MONTH_CODE || "").trim().toUpperCase();
  const typed = (promo || "").trim().toUpperCase();
  const freeMonth = !!freeMonthCode && typed === freeMonthCode;

  // Only one trial per customer. If they've ever had a subscription, no trial.
  let trialAllowed = freeMonth;
  if (freeMonth && customerId) {
    const prior = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
    if (prior.data.length > 0) trialAllowed = false;
  }
  if (freeMonth && !trialAllowed) {
    return NextResponse.json({ error: "That code is for first-time subscribers only." }, { status: 400 });
  }

  let discounts: { promotion_code: string }[] | undefined;
  if (promo && promo.trim() && !freeMonth) {
    try {
      const codes = await stripe.promotionCodes.list({ code: promo.trim().toUpperCase(), active: true, limit: 1 });
      if (codes.data[0]) discounts = [{ promotion_code: codes.data[0].id }];
      else return NextResponse.json({ error: "That code isn't one we recognize." }, { status: 400 });
    } catch {
      return NextResponse.json({ error: "Couldn't check that code. Try again." }, { status: 500 });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    metadata: { profile_id: user.id },
    subscription_data: {
      metadata: { profile_id: user.id },
      ...(trialAllowed ? { trial_period_days: 30 } : {}),
    },
    ...(discounts ? { discounts } : trialAllowed ? {} : { allow_promotion_codes: true }),
    success_url: `${siteUrl()}/dashboard/new?subscribed=1`,
    cancel_url: `${siteUrl()}/dashboard`,
  });
  return NextResponse.json({ url: session.url });
}
