import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

/* Admin takes a listing down. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const admin = supabaseAdmin();
  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await admin.from("drops").update({ status: "removed" }).eq("id", id);
  await admin.from("reports").update({ resolved: true }).eq("drop_id", id);
  return NextResponse.json({ ok: true });
}
