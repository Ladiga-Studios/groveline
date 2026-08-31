import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";

/* Stripe's hosted billing portal: update card, cancel, see invoices. */
export async function POST() {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: billing } = await supabaseAdmin()
    .from("billing")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!billing?.stripe_customer_id) return NextResponse.json({ error: "No billing yet" }, { status: 404 });

  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${siteUrl()}/dashboard/settings`,
  });
  return NextResponse.json({ url: session.url });
}
