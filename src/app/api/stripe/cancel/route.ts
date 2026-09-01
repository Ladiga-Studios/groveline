import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/* Cancel at the end of the current period, or undo that. The seller keeps
   everything until the date they already paid through. */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  const { resume } = (await req.json().catch(() => ({}))) as { resume?: boolean };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: billing } = await supabaseAdmin().from("billing").select("stripe_customer_id").eq("profile_id", user.id).maybeSingle();
  if (!billing?.stripe_customer_id) return NextResponse.json({ error: "No plan to cancel." }, { status: 404 });

  const subs = await stripe.subscriptions.list({ customer: billing.stripe_customer_id, status: "all", limit: 5 });
  const live = subs.data.find((x) => ["active", "trialing", "past_due"].includes(x.status));
  if (!live) return NextResponse.json({ error: "No active plan found." }, { status: 404 });

  const updated = await stripe.subscriptions.update(live.id, { cancel_at_period_end: !resume });
  return NextResponse.json({
    cancelAtPeriodEnd: !!updated.cancel_at_period_end,
    renewsAt: new Date(updated.current_period_end * 1000).toISOString(),
  });
}
