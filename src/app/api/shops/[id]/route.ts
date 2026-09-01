import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { settleShopBeforeDelete } from "@/lib/deletion";
import { moderateDropSubmission } from "@/lib/moderation";
import { cleanSlug } from "@/lib/format";

export const runtime = "nodejs";

/* Update a shop you own. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { data: existing } = await supabase.from("shops").select("id, slug").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const town = String(form.get("town") ?? "").trim();
  const state = String(form.get("state") ?? "AL").trim();
  const bio = String(form.get("bio") ?? "").trim() || null;
  const contactPhone = String(form.get("contact_phone") ?? "").trim() || null;
  const socialUrl = String(form.get("social_url") ?? "").trim() || null;
  const requested = cleanSlug(String(form.get("slug") ?? ""));
  const photo = form.get("avatar") as File | null;

  if (name.length < 2) return NextResponse.json({ error: "The shop needs a name." }, { status: 400 });
  if (town.length < 2) return NextResponse.json({ error: "Which town is this in?" }, { status: 400 });

  const textCheck = await moderateDropSubmission({ title: name, description: bio ?? "", images: [] });
  if (!textCheck.ok) return NextResponse.json({ error: textCheck.message }, { status: 422 });

  const update: Record<string, unknown> = { name, town, state, bio, contact_phone: contactPhone, social_url: socialUrl };
  if (requested && requested !== existing.slug) {
    const { data: taken } = await supabase.from("shops").select("id").eq("slug", requested).neq("id", id).maybeSingle();
    if (taken) return NextResponse.json({ error: "That link's already spoken for. Try another." }, { status: 400 });
    update.slug = requested;
  }
  if (photo && photo.size > 0) {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    const check = await moderateDropSubmission({ title: "shop photo", description: "", images: [{ base64, mediaType: photo.type || "image/jpeg" }] });
    if (!check.ok) return NextResponse.json({ error: check.message }, { status: 422 });
    const path = `${user.id}/shop-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("drop-photos").upload(path, photo, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (upErr) return NextResponse.json({ error: "That photo didn't upload. Try again." }, { status: 500 });
    update.avatar_url = supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("shops").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "That didn't save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true, slug: (update.slug as string) ?? existing.slug });
}

/* Delete a shop you own.

   Every open reservation on it is cancelled and every card hold released
   or charge refunded before a single row goes away, because once the shop
   is deleted the drops, claims, followers, and email list all cascade with
   it and there'd be nothing left to refund against. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if ((confirm ?? "").trim().toLowerCase() !== shop.name.trim().toLowerCase()) {
    return NextResponse.json({ error: "Type the shop's name exactly to confirm." }, { status: 400 });
  }

  const settled = await settleShopBeforeDelete(
    shop.id,
    shop.name,
    "The seller closed this shop on Groveline."
  );
  if (!settled.ok) return NextResponse.json({ error: settled.error }, { status: 502 });

  const admin = supabaseAdmin();
  const { error } = await admin.from("shops").delete().eq("id", shop.id);
  if (error) {
    console.error("shop delete failed:", error.message);
    return NextResponse.json({ error: "That didn't delete. Try again." }, { status: 500 });
  }
  await admin.from("deletion_log").insert({ kind: "shop", subject_id: shop.id, subject_name: shop.name, contact_email: user.email ?? null });

  return NextResponse.json({ ok: true });
}
