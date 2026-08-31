import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  let body: {
    drop_id?: string;
    quantity?: number;
    name?: string;
    phone?: string;
    email?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { drop_id, quantity, name, phone, email } = body;
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

  /* Email confirmation if the buyer left an email and Resend is configured. */
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
