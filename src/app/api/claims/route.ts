import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { pickupWindow, money } from "@/lib/format";
import { captureModeFor } from "@/lib/payments";
import { MIN_AGE, TERMS_VERSION } from "@/lib/policy";

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
    delivery?: "pickup" | "shipping";
    shipAddress?: string;
    acceptedTerms?: boolean;
    confirmedAge?: boolean;
    renderedAt?: number;
    turnstileToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { drop_id, quantity, name, phone, email, renderedAt, turnstileToken } = body;
  const delivery = body.delivery === "shipping" ? "shipping" : "pickup";
  const method = delivery === "shipping" || body.method === "card" ? "card" : "cash";
  const shipAddress = (body.shipAddress ?? "").trim().slice(0, 300);
  if (!body.acceptedTerms) return NextResponse.json({ error: "Give the terms a quick check first." }, { status: 400 });
  if (!body.confirmedAge) {
    return NextResponse.json(
      { error: `You need to be ${MIN_AGE} or older to reserve.` },
      { status: 400 }
    );
  }
  if (delivery === "shipping" && shipAddress.length < 10) return NextResponse.json({ error: "That shipping address needs a bit more to it." }, { status: 400 });
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  // A submit under two seconds is almost always a script. It used to get a
  // silent fake success, but a real person with autofill can be that quick
  // too, and they'd walk away thinking they were on the list. Now it's an
  // honest "try again": a bot gains nothing from it, a person loses nothing.
  if (renderedAt && Date.now() - renderedAt < 2000) {
    return NextResponse.json({ error: "That went through a little fast. Tap Reserve once more." }, { status: 400 });
  }
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
    .select("id, title, slug, price_cents, pickup_place, pickup_start, pickup_end, seller_id, fulfillment, shipping_cents, max_per_buyer, status, shops!drops_seller_id_fkey(name, owner_id, owner:profiles!shops_owner_id_fkey(email, notify_on_claim, notify_digest, payouts_enabled))")
    .eq("id", drop_id)
    .maybeSingle();
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const shop = Array.isArray(drop.shops) ? drop.shops[0] : drop.shops;
  const seller = (Array.isArray(shop?.owner) ? shop?.owner[0] : shop?.owner) as { email: string | null; notify_on_claim: boolean; notify_digest: boolean; payouts_enabled: boolean } | undefined;
  const ownerId = shop?.owner_id as string | undefined;

  // The window has closed. The page hides the form once this passes, but
  // a stale tab or a direct post would otherwise reserve, and for a card
  // claim put a real hold on a real card, against a drop that's over.
  if (new Date(drop.pickup_end) < new Date()) {
    return NextResponse.json(
      { error: drop.fulfillment === "shipping" ? "Ordering closed on this one." : "That pickup window has already passed." },
      { status: 400 }
    );
  }
  if (drop.status !== "active") {
    return NextResponse.json({ error: "This drop is closed." }, { status: 400 });
  }

  // Per-person limit. The form caps the stepper, but that's a convenience,
  // not a control: enforce it here, counting anything this buyer already
  // has on this drop so the limit can't be walked up one reservation at a
  // time. Phone number is the only identifier every buyer has, since no
  // account is needed to reserve.
  if (drop.max_per_buyer && drop.max_per_buyer > 0) {
    if (quantity > drop.max_per_buyer) {
      return NextResponse.json(
        { error: `This seller is limiting it to ${drop.max_per_buyer} per person.` },
        { status: 400 }
      );
    }
    const digits = phone.replace(/\D/g, "");
    const { data: mine } = await admin
      .from("claims")
      .select("buyer_phone, buyer_user_id, quantity")
      .eq("drop_id", drop_id)
      .is("cancelled_at", null);
    const already = (mine ?? [])
      .filter((c) => c.buyer_phone?.replace(/\D/g, "") === digits || (buyerId && c.buyer_user_id === buyerId))
      .reduce((sum, c) => sum + (c.quantity ?? 0), 0);
    if (already + quantity > drop.max_per_buyer) {
      const room = Math.max(0, drop.max_per_buyer - already);
      return NextResponse.json(
        {
          error: room > 0
            ? `You already have ${already} of these reserved. You can take ${room} more.`
            : `You already have this seller's limit of ${drop.max_per_buyer} reserved.`,
        },
        { status: 400 }
      );
    }
  }

  if (method === "card" && !seller?.payouts_enabled) {
    return NextResponse.json({ error: "This seller only takes cash for now." }, { status: 400 });
  }
  if (delivery === "shipping" && drop.fulfillment === "pickup") {
    return NextResponse.json({ error: "This one is pickup only, no shipping." }, { status: 400 });
  }
  if (delivery === "pickup" && drop.fulfillment === "shipping") {
    return NextResponse.json({ error: "This one ships only, no pickup option." }, { status: 400 });
  }
  const shippingCents = delivery === "shipping" ? drop.shipping_cents || 0 : 0;

  const { data, error } = await admin.rpc("claim_drop_v3", {
    p_drop: drop_id,
    p_qty: quantity,
    p_name: name,
    p_phone: phone,
    p_email: email ?? null,
    p_method: method,
    p_buyer: buyerId,
    p_delivery: delivery,
    p_ship_address: delivery === "shipping" ? shipAddress : null,
    p_terms: true,
  });
  if (error) {
    if (error.message.includes("not_enough")) return NextResponse.json({ error: "Somebody just grabbed the last one" }, { status: 409 });
    return NextResponse.json({ error: "That reservation didn't go through" }, { status: 500 });
  }
  const result = data as { position: number; claim_id: string; cancel_token: string };

  // Stamp the claim with what was agreed to and when. Written straight
  // after the atomic claim rather than inside it, so the claim function's
  // signature stays stable across terms changes.
  admin
    .from("claims")
    .update({ terms_version: TERMS_VERSION, age_confirmed: true, ...(ip ? { ip_address: ip } : {}) })
    .eq("id", result.claim_id)
    .then();

  const site = siteUrl();
  const reservationUrl = `${site}/r/${result.cancel_token}`;

  // Card: hold the funds now, capture when the seller marks it picked up.
  let checkoutUrl: string | null = null;
  if (method === "card") {
    const stripe = getStripe();
    const { data: billing } = await admin
      .from("billing")
      .select("stripe_account_id")
      .eq("profile_id", ownerId ?? "")
      .maybeSingle();
    if (!stripe || !billing?.stripe_account_id) {
      await admin.rpc("release_claim", { p_claim: result.claim_id });
      return NextResponse.json({ error: "Card payments aren't working right now, try cash instead" }, { status: 503 });
    }
    // Hold the card if pickup is within a week, charge it now if further out
    // (holds expire). Either way it's refundable until the handoff.
    const captureMode = captureModeFor(drop.pickup_end);
    await admin.from("claims").update({ capture_mode: captureMode }).eq("id", result.claim_id);
    try {
      // Direct charge: the checkout is created ON the seller's connected
      // account, so the charge, the statement descriptor, the Stripe fee,
      // and any dispute all belong to them. Groveline just orchestrates.
      const session = await stripe.checkout.sessions.create(
        {
        mode: "payment",
        line_items: [
          {
            price_data: { currency: "usd", product_data: { name: drop.title }, unit_amount: drop.price_cents },
            quantity,
          },
          ...(shippingCents > 0
            ? [{ price_data: { currency: "usd", product_data: { name: "Shipping" }, unit_amount: shippingCents }, quantity: 1 }]
            : []),
        ],
        payment_intent_data: {
          capture_method: captureMode,
          metadata: { claim_id: result.claim_id, capture_mode: captureMode },
        },
        metadata: { claim_id: result.claim_id },
        customer_email: email || undefined,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${reservationUrl}?paid=1`,
        cancel_url: `${reservationUrl}?cancelled=1`,
        },
        { stripeAccount: billing.stripe_account_id }
      );
      checkoutUrl = session.url;
    } catch {
      await admin.rpc("release_claim", { p_claim: result.claim_id });
      return NextResponse.json({ error: "Couldn't get the card payment started" }, { status: 500 });
    }
  }

  const when = delivery === "shipping"
    ? `Ships to: ${shipAddress}`
    : `Pickup: ${pickupWindow(drop.pickup_start, drop.pickup_end)} at ${drop.pickup_place}`;

  if (email) {
    sendEmail(
      email,
      `Reserved: ${drop.title}`,
      `You're set for ${quantity} of ${drop.title}, number ${result.position} on the list.\n\n${when}\n${method === "card" ? (captureModeFor(drop.pickup_end) === "manual" ? `Payment: card on hold, charged when ${delivery === "shipping" ? "it ships" : "you pick up"}.\n` : "Payment: card charged now. Refunded automatically if you or the seller cancel before pickup.\n") : "Payment: cash at pickup.\n"}\nManage or cancel your reservation: ${reservationUrl}\n\nDrop details: ${site}/d/${drop.slug}`
    );
  }

  // Instant seller email only if they turned digests off. Otherwise the
  // hourly digest picks it up. Card claims wait until payment is confirmed.
  if (seller?.notify_on_claim && seller.email && !seller.notify_digest && method === "cash") {
    sendEmail(
      seller.email,
      `New reservation: ${name} x${quantity} for ${drop.title}`,
      `${name} just reserved ${quantity} of ${drop.title} (${money(drop.price_cents * quantity)}, cash at pickup).\n\nPhone: ${phone}\n\nSee all claims: ${site}/dashboard/drops/${drop.id}`
    );
    admin.from("claims").update({ seller_notified_at: new Date().toISOString() }).eq("id", result.claim_id).then();
  }

  return NextResponse.json({ position: result.position, token: result.cancel_token, checkoutUrl });
}
