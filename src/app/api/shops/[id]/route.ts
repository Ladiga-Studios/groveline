import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
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

  if (name.length < 2) return NextResponse.json({ error: "Give the shop a name." }, { status: 400 });
  if (town.length < 2) return NextResponse.json({ error: "Enter a town." }, { status: 400 });

  const textCheck = await moderateDropSubmission({ title: name, description: bio ?? "", images: [] });
  if (!textCheck.ok) return NextResponse.json({ error: textCheck.message }, { status: 422 });

  const update: Record<string, unknown> = { name, town, state, bio, contact_phone: contactPhone, social_url: socialUrl };
  if (requested && requested !== existing.slug) {
    const { data: taken } = await supabase.from("shops").select("id").eq("slug", requested).neq("id", id).maybeSingle();
    if (taken) return NextResponse.json({ error: "That link is taken. Try another." }, { status: 400 });
    update.slug = requested;
  }
  if (photo && photo.size > 0) {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    const check = await moderateDropSubmission({ title: "shop photo", description: "", images: [{ base64, mediaType: photo.type || "image/jpeg" }] });
    if (!check.ok) return NextResponse.json({ error: "That photo doesn't meet our guidelines." }, { status: 422 });
    const path = `${user.id}/shop-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("drop-photos").upload(path, photo, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (upErr) return NextResponse.json({ error: "Photo upload failed." }, { status: 500 });
    update.avatar_url = supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("shops").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true, slug: (update.slug as string) ?? existing.slug });
}
