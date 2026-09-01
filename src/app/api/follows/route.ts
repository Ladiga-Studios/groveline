import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* Unfollow from the settings page. */
export async function DELETE(req: Request) {
  const { seller_id } = (await req.json().catch(() => ({}))) as { seller_id?: string };
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !seller_id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await supabase.from("follows").delete().eq("buyer_id", user.id).eq("seller_id", seller_id);
  return NextResponse.json({ ok: true });
}
