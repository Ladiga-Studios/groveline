import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  let body: { drop_id?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { drop_id, phone } = body;
  if (!drop_id || !phone || phone.length > 30) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("waitlist_entries")
    .insert({ drop_id, phone });
  if (error) {
    return NextResponse.json({ error: "Couldn't add you to the waitlist. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
