import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

/* A logged-in person removing their own email from a shop's list. */
export async function POST(req: Request) {
  const { seller_id } = (await req.json().catch(() => ({}))) as { seller_id?: string };
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !seller_id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await supabaseAdmin().from("newsletter_subscribers").delete().eq("seller_id", seller_id).eq("email", user.email.toLowerCase());
  return NextResponse.json({ ok: true });
}
