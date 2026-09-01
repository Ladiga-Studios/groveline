import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { moderateDropSubmission } from "@/lib/moderation";
import { isValidCategory } from "@/lib/categories";
import { cleanSlug } from "@/lib/format";
import { geocode } from "@/lib/geocode";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";
import { pickupWindow } from "@/lib/format";

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
    .select("id, title, slug, seller_id, claimed, pickup_place, pickup_start, pickup_end, pickup_address, pickup_city, pickup_state, pickup_zip, pickup_lat, pickup_lng, shops!drops_seller_id_fkey(owner_id, name)")
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

  if (!title) return NextResponse.json({ error: "This needs a name." }, { status: 400 });
  if (!isValidCategory(category)) return NextResponse.json({ error: "Pick a category for it." }, { status: 400 });
  if (!priceCents || priceCents <= 0) return NextResponse.json({ error: "What's it going for?" }, { status: 400 });
  if (!quantity || quantity <= 0) return NextResponse.json({ error: "How many do you have?" }, { status: 400 });
  if (quantity < existing.claimed)
    return NextResponse.json({ error: `${existing.claimed} are already claimed, so it can't go lower than that.` }, { status: 400 });
  if (!["pickup", "shipping", "both"].includes(fulfillment)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (fulfillment !== "shipping" && !pickupPlace) return NextResponse.json({ error: "Where should people get this?" }, { status: 400 });
  if (fulfillment !== "pickup") {
    const { data: me } = await supabase.from("profiles").select("payouts_enabled").eq("id", user.id).maybeSingle();
    if (!me?.payouts_enabled) return NextResponse.json({ error: "Turn on card payments in Settings before offering shipping." }, { status: 400 });
  }
  if (requestedSlug) {
    let q = supabase.from("drops").select("id").eq("slug", requestedSlug);
    q = q.neq("id", id);
    const { data: taken } = await q.maybeSingle();
    if (taken) return NextResponse.json({ error: "Somebody's already using that link. Try a different one." }, { status: 400 });
  }
  if (!pickupCity || !pickupState) return NextResponse.json({ error: "Which city and state is this in?" }, { status: 400 });
  if (keptUrls.length + newPhotos.length > 10) return NextResponse.json({ error: "10 photos is the most we can take." }, { status: 400 });

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
    if (upErr) return NextResponse.json({ error: "One of the photos didn't upload. Try again." }, { status: 500 });
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
  if (updErr) return NextResponse.json({ error: "That didn't save. Try again." }, { status: 500 });

  // If the when or where changed and people have reserved, they hear about it.
  const whenWhereChanged =
    pickupStart !== existing.pickup_start ||
    pickupEnd !== existing.pickup_end ||
    pickupPlace !== (existing.pickup_place ?? "") ||
    addressChanged;
  if (whenWhereChanged && existing.claimed > 0) {
    const admin = supabaseAdmin();
    const { data: buyers } = await admin
      .from("claims")
      .select("buyer_email, cancel_token, quantity")
      .eq("drop_id", id)
      .is("cancelled_at", null)
      .eq("picked_up", false)
      .not("buyer_email", "is", null);
    const shopName = (Array.isArray(existing.shops) ? existing.shops[0] : existing.shops)?.name ?? "The seller";
    const where = fulfillment === "shipping" ? "This drop now ships instead of pickup." : `New pickup: ${pickupWindow(pickupStart, pickupEnd)} at ${pickupPlace}${pickupAddress ? `, ${pickupAddress}` : ""}, ${pickupCity}.`;
    for (const b of buyers ?? []) {
      sendEmail(
        b.buyer_email!,
        `Change to your pickup: ${title}`,
        `${shopName} changed the details on ${title}.\n\n${where}\n\nYour reservation for ${b.quantity} still stands. If the new time doesn't work, cancel here and your spot goes to the next person (any card hold is released): ${siteUrl()}/r/${b.cancel_token}`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
