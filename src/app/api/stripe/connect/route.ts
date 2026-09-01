import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";

/* Sets a seller up to receive card payments directly into their own
   Stripe account (Connect Express). Money never passes through Groveline. */
export async function POST() {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: billing } = await admin.from("billing").select("*").eq("profile_id", user.id).maybeSingle();

  let accountId = billing?.stripe_account_id ?? undefined;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: process.env.STRIPE_CONNECT_TYPE === "standard" ? "standard" : "express",
      country: "US",
      email: user.email ?? undefined,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_type: "individual",
      metadata: { profile_id: user.id },
    });
    accountId = account.id;
    await admin.from("billing").upsert({ profile_id: user.id, stripe_account_id: accountId });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl()}/dashboard/settings?connect=refresh`,
    return_url: `${siteUrl()}/dashboard/settings?connect=return`,
    type: "account_onboarding",
  });
  return NextResponse.json({ url: link.url });
}
