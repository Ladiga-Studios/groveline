import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

/* Which shop email lists the logged-in person's address is on. */
export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json([]);
  const { data } = await supabaseAdmin()
    .from("newsletter_subscribers")
    .select("shops!newsletter_subscribers_seller_id_fkey(id, name, slug, avatar_url)")
    .eq("email", user.email.toLowerCase());
  const shops = (data ?? []).map((r) => (Array.isArray(r.shops) ? r.shops[0] : r.shops)).filter(Boolean);
  return NextResponse.json(shops);
}
