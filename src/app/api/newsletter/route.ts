import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  let body: { seller_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { seller_id, email } = body;
  if (!seller_id || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      { seller_id, email: email.toLowerCase() },
      { onConflict: "seller_id,email" }
    );
  if (error) {
    return NextResponse.json({ error: "That didn't go through. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
