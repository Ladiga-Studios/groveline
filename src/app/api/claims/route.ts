import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

async function verifyTurnstile(token: string, ip: string | null) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true; // not configured yet, don't block
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
    return true; // Cloudflare hiccup shouldn't block a real buyer
  }
}

export async function POST(req: Request) {
  let body: {
    drop_id?: string;
    quantity?: number;
    name?: string;
    phone?: string;
    email?: string | null;
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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  // Honeypot: a real person never fills this in.
  if (company) {
    return NextResponse.json({ position: 1 }); // pretend success, don't tip the bot off
  }
  // Too fast to be a person reading the form and typing.
  if (renderedAt && Date.now() - renderedAt < 2500) {
    return NextResponse.json({ position: 1 });
  }
  if (!(await verifyTurnstile(turnstileToken || "", ip))) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  if (
    !drop_id ||
    !name ||
    !phone ||
    !quantity ||
    quantity < 1 ||
    quantity > 50 ||
    name.length > 120 ||
    phone.length > 30
  ) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  if (ip) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("claims")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", since);
    if ((count ?? 0) >= 6) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const { data, error } = await supabase.rpc("claim_drop", {
    p_drop: drop_id,
    p_qty: quantity,
    p_name: name,
    p_phone: phone,
    p_email: email ?? null,
  });

  if (error) {
    if (error.message.includes("not_enough")) {
      return NextResponse.json({ error: "Not enough left" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not reserve" }, { status: 500 });
  }

  const result = data as { position: number; claim_id: string };

  if (ip) {
    supabase.from("claims").update({ ip_address: ip }).eq("id", result.claim_id).then();
  }

  if (email && process.env.RESEND_API_KEY) {
    try {
      const { data: drop } = await supabase
        .from("drops")
        .select("title, pickup_place, pickup_start, pickup_end, slug")
        .eq("id", drop_id)
        .maybeSingle();
      if (drop) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const site = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
        await resend.emails.send({
          from: process.env.RESEND_FROM || "Groveline <hello@groveline.io>",
          to: email,
          subject: `Reserved: ${drop.title}`,
          text: `You are number ${result.position} for ${drop.title}.\n\nQuantity: ${quantity}\nPickup: ${drop.pickup_place}\n\nGive your name at pickup and you are set.\n\nDetails: ${site}/d/${drop.slug}`,
        });
      }
    } catch {
      /* Email is a courtesy. The claim already succeeded. */
    }
  }

  return NextResponse.json({ position: result.position });
}
