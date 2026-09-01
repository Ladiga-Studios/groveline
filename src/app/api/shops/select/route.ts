import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { SHOP_COOKIE } from "@/lib/shops";

/* Switches which shop the seller is working in. */
export async function POST(req: Request) {
  const { shop_id } = (await req.json().catch(() => ({}))) as { shop_id?: string };
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !shop_id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { data: shop } = await supabase.from("shops").select("id").eq("id", shop_id).eq("owner_id", user.id).maybeSingle();
  if (!shop) return NextResponse.json({ error: "Not yours" }, { status: 403 });
  const store = await cookies();
  store.set(SHOP_COOKIE, shop_id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return NextResponse.json({ ok: true });
}
