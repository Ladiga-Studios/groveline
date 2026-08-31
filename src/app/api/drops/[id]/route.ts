import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { moderateDropSubmission } from "@/lib/moderation";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: existing } = await supabase
    .from("drops")
    .select("id, seller_id, claimed")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.seller_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "other");
  const description = String(form.get("description") ?? "").trim();
  const priceCents = Math.round(parseFloat(String(form.get("price") ?? "0")) * 100);
  const quantity = parseInt(String(form.get("quantity") ?? "0"), 10);
  const pickupPlace = String(form.get("pickupPlace") ?? "").trim();
  const pickupStart = String(form.get("pickupStart") ?? "");
  const pickupEnd = String(form.get("pickupEnd") ?? "");
  const keptUrls = form.getAll("keptUrls").map(String);
  const newPhotos = form.getAll("photos") as File[];

  if (!title) return NextResponse.json({ error: "Give it a name." }, { status: 400 });
  if (!priceCents || priceCents <= 0)
    return NextResponse.json({ error: "Enter a price." }, { status: 400 });
  if (!quantity || quantity <= 0)
    return NextResponse.json({ error: "Enter how many." }, { status: 400 });
  if (quantity < existing.claimed)
    return NextResponse.json(
      { error: `${existing.claimed} are already claimed, so the total can't go below that.` },
      { status: 400 }
    );
  if (!pickupPlace) return NextResponse.json({ error: "Enter a pickup place." }, { status: 400 });
  if (keptUrls.length + newPhotos.length > 10)
    return NextResponse.json({ error: "Up to 10 photos." }, { status: 400 });

  // Only new photos get vision-checked. Text is cheap, so it's always
  // re-checked in case a pickup listing turned into something else on edit.
  const images = await Promise.all(
    newPhotos.map(async (f) => ({
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
      mediaType: f.type || "image/jpeg",
    }))
  );
  const check = await moderateDropSubmission({ title, description, images });
  if (!check.ok) {
    return NextResponse.json({ error: check.message, flagged: check.flagged }, { status: 422 });
  }

  const newUrls: string[] = [];
  for (const photo of newPhotos) {
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("drop-photos")
      .upload(path, photo, { cacheControl: "31536000", contentType: "image/jpeg" });
    if (upErr) {
      return NextResponse.json({ error: "A photo failed to upload. Try again." }, { status: 500 });
    }
    newUrls.push(supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl);
  }

  const photoUrls = [...keptUrls, ...newUrls];
  const { error: updErr } = await supabase
    .from("drops")
    .update({
      title,
      category,
      description: description || null,
      photo_urls: photoUrls,
      photo_url: photoUrls[0] ?? null,
      price_cents: priceCents,
      quantity,
      pickup_place: pickupPlace,
      pickup_start: pickupStart,
      pickup_end: pickupEnd,
    })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
