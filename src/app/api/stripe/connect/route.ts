import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";

/* Sets a seller up to receive card payments directly into their own
   Stripe account (Connect Express). Money never passes through Groveline. */
export async function POST() {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  try {

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: billing } = await admin.from("billing").select("*").eq("profile_id", user.id).maybeSingle();

  let accountId = billing?.stripe_account_id ?? undefined;
  if (!accountId) {
    // These must match the platform's configured responsibilities exactly,
    // visible in the Stripe dashboard under Settings, Connect, Platform setup:
    //   losses_collector: stripe   (Stripe carries unrecoverable losses)
    //   fees_collector: account    (the seller pays Stripe's processing fee)
    // If they don't match, Stripe rejects account creation with a misleading
    // "complete your platform profile" error.
    // No "type" here on purpose: Stripe rejects type and controller
    // together, and the controller is what encodes the express dashboard.
    const account = await stripe.accounts.create({
      country: "US",
      email: user.email ?? undefined,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      controller: {
        losses: { payments: "stripe" },
        fees: { payer: "account" },
        stripe_dashboard: { type: "express" },
      },
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
  } catch (err) {
    // Surface Stripe's own message. These are usually actionable, like
    // Connect not being enabled, or a country/capability mismatch.
    const message = err instanceof Error ? err.message : "Could not start payout setup.";
    console.error("stripe connect error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
