import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { moderateDropSubmission } from "@/lib/moderation";
import { isValidCategory } from "@/lib/categories";
import { cleanSlug } from "@/lib/format";
import { geocode } from "@/lib/geocode";

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
    .select("id, seller_id, claimed, pickup_address, pickup_city, pickup_state, pickup_zip, pickup_lat, pickup_lng, shops!drops_seller_id_fkey(owner_id)")
    .eq("id", id)
    .maybeSingle();
  const owner = Array.isArray(existing?.shops) ? existing?.shops[0] : existing?.shops;
  if (!existing || owner?.owner_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "other");
  const description = String(form.get("description") ?? "").trim();
  const priceCents = Math.round(parseFloat(String(form.get("price") ?? "0")) * 100);
  const quantity = parseInt(String(form.get("quantity") ?? "0"), 10);
  const fulfillment = String(form.get("fulfillment") ?? "pickup");
  const shippingCents = Math.round(parseFloat(String(form.get("shipping") ?? "0")) * 100) || 0;
  const requestedSlug = cleanSlug(String(form.get("slug") ?? ""));
  const pickupPlace = String(form.get("pickupPlace") ?? "").trim();
  const pickupAddress = String(form.get("pickupAddress") ?? "").trim() || null;
  const pickupCity = String(form.get("pickupCity") ?? "").trim();
  const pickupState = String(form.get("pickupState") ?? "").trim();
  const pickupZip = String(form.get("pickupZip") ?? "").trim() || null;
  const pickupStart = String(form.get("pickupStart") ?? "");
  const pickupEnd = String(form.get("pickupEnd") ?? "");
  const keptUrls = form.getAll("keptUrls").map(String);
  const newPhotos = form.getAll("photos") as File[];

  if (!title) return NextResponse.json({ error: "Give it a name." }, { status: 400 });
  if (!isValidCategory(category)) return NextResponse.json({ error: "Pick a category." }, { status: 400 });
  if (!priceCents || priceCents <= 0) return NextResponse.json({ error: "Enter a price." }, { status: 400 });
  if (!quantity || quantity <= 0) return NextResponse.json({ error: "Enter how many." }, { status: 400 });
  if (quantity < existing.claimed)
    return NextResponse.json({ error: `${existing.claimed} are already claimed, so the total can't go below that.` }, { status: 400 });
  if (!["pickup", "shipping", "both"].includes(fulfillment)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (fulfillment !== "shipping" && !pickupPlace) return NextResponse.json({ error: "Enter a pickup place." }, { status: 400 });
  if (fulfillment !== "pickup") {
    const { data: me } = await supabase.from("profiles").select("payouts_enabled").eq("id", user.id).maybeSingle();
    if (!me?.payouts_enabled) return NextResponse.json({ error: "Set up card payments in Settings before offering shipping." }, { status: 400 });
  }
  if (requestedSlug) {
    let q = supabase.from("drops").select("id").eq("slug", requestedSlug);
    q = q.neq("id", id);
    const { data: taken } = await q.maybeSingle();
    if (taken) return NextResponse.json({ error: "That link is already taken. Try another." }, { status: 400 });
  }
  if (!pickupCity || !pickupState) return NextResponse.json({ error: "Enter the pickup city and state." }, { status: 400 });
  if (keptUrls.length + newPhotos.length > 10) return NextResponse.json({ error: "Up to 10 photos." }, { status: 400 });

  const images = await Promise.all(
    newPhotos.map(async (f) => ({
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
      mediaType: f.type || "image/jpeg",
    }))
  );
  const check = await moderateDropSubmission({ title, description, images });
  if (!check.ok) return NextResponse.json({ error: check.message, flagged: check.flagged }, { status: 422 });

  const newUrls: string[] = [];
  for (const photo of newPhotos) {
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("drop-photos")
      .upload(path, photo, { cacheControl: "31536000", contentType: "image/jpeg" });
    if (upErr) return NextResponse.json({ error: "A photo failed to upload. Try again." }, { status: 500 });
    newUrls.push(supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl);
  }

  const addressChanged =
    pickupAddress !== existing.pickup_address ||
    pickupCity !== existing.pickup_city ||
    pickupState !== existing.pickup_state ||
    pickupZip !== existing.pickup_zip;
  const coords = addressChanged
    ? await geocode({ address: pickupAddress, city: pickupCity, state: pickupState, zip: pickupZip })
    : { lat: existing.pickup_lat, lng: existing.pickup_lng };

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
      ...(requestedSlug ? { slug: requestedSlug } : {}),
      fulfillment,
      shipping_cents: shippingCents,
      pickup_place: pickupPlace || null,
      pickup_address: pickupAddress,
      pickup_city: pickupCity,
      pickup_state: pickupState,
      pickup_zip: pickupZip,
      pickup_lat: coords?.lat ?? null,
      pickup_lng: coords?.lng ?? null,
      pickup_start: pickupStart,
      pickup_end: pickupEnd,
    })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: "Could not save." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
