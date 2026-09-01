import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { moderateDropSubmission } from "@/lib/moderation";
import { slugify, shortId, cleanSlug } from "@/lib/format";
import { SHOP_COOKIE } from "@/lib/shops";

export const runtime = "nodejs";

/* Create a shop. Multipart so a photo can come along. */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const town = String(form.get("town") ?? "").trim();
  const state = String(form.get("state") ?? "AL").trim();
  const bio = String(form.get("bio") ?? "").trim() || null;
  const contactPhone = String(form.get("contact_phone") ?? "").trim() || null;
  const socialUrl = String(form.get("social_url") ?? "").trim() || null;
  const requested = cleanSlug(String(form.get("slug") ?? ""));
  const photo = form.get("avatar") as File | null;

  if (name.length < 2) return NextResponse.json({ error: "Give the shop a name." }, { status: 400 });
  if (town.length < 2) return NextResponse.json({ error: "Enter a town." }, { status: 400 });

  const textCheck = await moderateDropSubmission({ title: name, description: bio ?? "", images: [] });
  if (!textCheck.ok) return NextResponse.json({ error: textCheck.message }, { status: 422 });

  let slug = requested || `${slugify(name)}-${shortId()}`;
  const { data: taken } = await supabase.from("shops").select("id").eq("slug", slug).maybeSingle();
  if (taken) {
    if (requested) return NextResponse.json({ error: "That link is taken. Try another." }, { status: 400 });
    slug = `${slugify(name)}-${shortId()}`;
  }

  let avatarUrl: string | null = null;
  if (photo && photo.size > 0) {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    const check = await moderateDropSubmission({ title: "shop photo", description: "", images: [{ base64, mediaType: photo.type || "image/jpeg" }] });
    if (!check.ok) return NextResponse.json({ error: "That photo doesn't meet our guidelines." }, { status: 422 });
    const path = `${user.id}/shop-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("drop-photos").upload(path, photo, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (upErr) return NextResponse.json({ error: "Photo upload failed." }, { status: 500 });
    avatarUrl = supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl;
  }

  const { data: shop, error } = await supabase
    .from("shops")
    .insert({ owner_id: user.id, name, slug, town, state, bio, contact_phone: contactPhone, social_url: socialUrl, avatar_url: avatarUrl })
    .select("id")
    .single();
  if (error || !shop) return NextResponse.json({ error: "Could not create the shop." }, { status: 500 });

  await supabase.from("profiles").update({ is_seller: true }).eq("id", user.id);
  const store = await cookies();
  store.set(SHOP_COOKIE, shop.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return NextResponse.json({ id: shop.id, slug });
}
