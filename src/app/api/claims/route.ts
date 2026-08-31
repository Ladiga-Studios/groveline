import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { pickupWindow, money } from "@/lib/format";

async function verifyTurnstile(token: string, ip: string | null) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  let body: {
    drop_id?: string;
    quantity?: number;
    name?: string;
    phone?: string;
    email?: string | null;
    method?: "cash" | "card";
    company?: string;
    renderedAt?: number;
    turnstileToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { drop_id, quantity, name, phone, email, company, renderedAt, turnstileToken } = body;
  const method = body.method === "card" ? "card" : "cash";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  if (company) return NextResponse.json({ position: 1 });
  if (renderedAt && Date.now() - renderedAt < 2500) return NextResponse.json({ position: 1 });
  if (!(await verifyTurnstile(turnstileToken || "", ip))) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  if (!drop_id || !name || !phone || !quantity || quantity < 1 || quantity > 50 || name.length > 120 || phone.length > 30) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Logged in buyers get the claim attached to their account.
  let buyerId: string | null = null;
  try {
    const session = await supabaseServer();
    const {
      data: { user },
    } = await session.auth.getUser();
    buyerId = user?.id ?? null;
  } catch {
    buyerId = null;
  }

  const admin = supabaseAdmin();
  const { data: drop } = await admin
    .from("drops")
    .select("id, title, slug, price_cents, pickup_place, pickup_start, pickup_end, seller_id, profiles!drops_seller_id_fkey(name, farm_name, email, notify_on_claim, payouts_enabled)")
    .eq("id", drop_id)
    .maybeSingle();
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const seller = Array.isArray(drop.profiles) ? drop.profiles[0] : drop.profiles;

  if (method === "card" && !seller?.payouts_enabled) {
    return NextResponse.json({ error: "This seller only takes cash." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("claim_drop_v2", {
    p_drop: drop_id,
    p_qty: quantity,
    p_name: name,
    p_phone: phone,
    p_email: email ?? null,
    p_method: method,
    p_buyer: buyerId,
  });
  if (error) {
    if (error.message.includes("not_enough")) return NextResponse.json({ error: "Not enough left" }, { status: 409 });
    return NextResponse.json({ error: "Could not reserve" }, { status: 500 });
  }
  const result = data as { position: number; claim_id: string; cancel_token: string };

  if (ip) admin.from("claims").update({ ip_address: ip }).eq("id", result.claim_id).then();

  const site = siteUrl();
  const reservationUrl = `${site}/r/${result.cancel_token}`;

  // Card: hold the funds now, capture when the seller marks it picked up.
  let checkoutUrl: string | null = null;
  if (method === "card") {
    const stripe = getStripe();
    const { data: billing } = await admin
      .from("billing")
      .select("stripe_account_id")
      .eq("profile_id", drop.seller_id)
      .maybeSingle();
    if (!stripe || !billing?.stripe_account_id) {
      await admin.rpc("release_claim", { p_claim: result.claim_id });
      return NextResponse.json({ error: "Card payments unavailable right now" }, { status: 503 });
    }
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: drop.title },
              unit_amount: drop.price_cents,
            },
            quantity,
          },
        ],
        payment_intent_data: {
          capture_method: "manual",
          transfer_data: { destination: billing.stripe_account_id },
          metadata: { claim_id: result.claim_id },
        },
        metadata: { claim_id: result.claim_id },
        customer_email: email || undefined,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${reservationUrl}?paid=1`,
        cancel_url: `${reservationUrl}?cancelled=1`,
      });
      checkoutUrl = session.url;
    } catch {
      await admin.rpc("release_claim", { p_claim: result.claim_id });
      return NextResponse.json({ error: "Could not start card payment" }, { status: 500 });
    }
  }

  const when = pickupWindow(drop.pickup_start, drop.pickup_end);

  if (email) {
    sendEmail(
      email,
      `Reserved: ${drop.title}`,
      `You are number ${result.position} for ${drop.title}.\n\nQuantity: ${quantity}\nPickup: ${when} at ${drop.pickup_place}\n${method === "card" ? "Payment: card on hold, charged when you pick up.\n" : "Payment: cash at pickup.\n"}\nManage or cancel your reservation: ${reservationUrl}\n\nDrop details: ${site}/d/${drop.slug}`
    );
  }

  if (seller?.notify_on_claim && seller.email && method === "cash") {
    sendEmail(
      seller.email,
      `New reservation: ${name} x${quantity} for ${drop.title}`,
      `${name} just reserved ${quantity} of ${drop.title} (${money(drop.price_cents * quantity)}, cash at pickup).\n\nPhone: ${phone}\n\nSee all claims: ${site}/dashboard/drops/${drop.id}`
    );
  }

  return NextResponse.json({ position: result.position, token: result.cancel_token, checkoutUrl });
}
