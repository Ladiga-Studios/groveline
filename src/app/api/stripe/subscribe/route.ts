import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";

/* Starts a $10/month subscription checkout. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const { interval } = (await req.json().catch(() => ({}))) as { interval?: "month" | "year" };
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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    metadata: { profile_id: user.id },
    subscription_data: { metadata: { profile_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${siteUrl()}/dashboard/new?subscribed=1`,
    cancel_url: `${siteUrl()}/dashboard`,
  });
  return NextResponse.json({ url: session.url });
}
