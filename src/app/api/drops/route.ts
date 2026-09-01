import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { moderateDropSubmission } from "@/lib/moderation";
import { slugify, shortId, cleanSlug } from "@/lib/format";
import { isValidCategory } from "@/lib/categories";
import { geocode } from "@/lib/geocode";
import { getCurrentShop } from "@/lib/shops";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { shop, shops } = await getCurrentShop(supabase, user.id);
  if (!shop) return NextResponse.json({ error: "Set up your shop before posting a drop." }, { status: 400 });

  // Subscription gate: three drops free across all shops, then a plan. Off if Stripe isn't set up.
  const admin = supabaseAdmin();
  if (process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID)) {
    const [{ data: profile }, { data: billing }, { count }] = await Promise.all([
      admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
      admin.from("billing").select("subscription_status").eq("profile_id", user.id).maybeSingle(),
      admin.from("drops").select("*", { count: "exact", head: true }).in("seller_id", shops.map((x) => x.id)),
    ]);
    const subscribed = ["active", "trialing", "past_due"].includes(billing?.subscription_status ?? "none");
    if (!profile?.is_admin && !subscribed && (count ?? 0) >= 3) {
      return NextResponse.json({ error: "subscribe" }, { status: 402 });
    }
  }

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
  const photos = form.getAll("photos") as File[];

  if (!title) return NextResponse.json({ error: "This needs a name." }, { status: 400 });
  if (!isValidCategory(category)) return NextResponse.json({ error: "Pick a category for it." }, { status: 400 });
  if (!priceCents || priceCents <= 0) return NextResponse.json({ error: "What's it going for?" }, { status: 400 });
  if (!quantity || quantity <= 0) return NextResponse.json({ error: "How many do you have?" }, { status: 400 });
  if (!["pickup", "shipping", "both"].includes(fulfillment)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (fulfillment !== "shipping" && !pickupPlace) return NextResponse.json({ error: "Where should people get this?" }, { status: 400 });
  if (fulfillment !== "pickup") {
    const { data: me } = await supabase.from("profiles").select("payouts_enabled").eq("id", user.id).maybeSingle();
    if (!me?.payouts_enabled) return NextResponse.json({ error: "Turn on card payments in Settings before offering shipping." }, { status: 400 });
  }
  if (requestedSlug) {
    let q = supabase.from("drops").select("id").eq("slug", requestedSlug);
    const { data: taken } = await q.maybeSingle();
    if (taken) return NextResponse.json({ error: "Somebody's already using that link. Try a different one." }, { status: 400 });
  }
  if (!pickupCity || !pickupState) return NextResponse.json({ error: "Which city and state is this in?" }, { status: 400 });
  if (photos.length > 10) return NextResponse.json({ error: "10 photos is the most we can take." }, { status: 400 });

  const images = await Promise.all(
    photos.map(async (f) => ({
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
      mediaType: f.type || "image/jpeg",
    }))
  );
  const check = await moderateDropSubmission({ title, description, images });
  if (!check.ok) return NextResponse.json({ error: check.message, flagged: check.flagged }, { status: 422 });

  const photoUrls: string[] = [];
  for (const photo of photos) {
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("drop-photos")
      .upload(path, photo, { cacheControl: "31536000", contentType: "image/jpeg" });
    if (upErr) return NextResponse.json({ error: "One of the photos didn't upload. Try again." }, { status: 500 });
    photoUrls.push(supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl);
  }

  const coords = await geocode({ address: pickupAddress, city: pickupCity, state: pickupState, zip: pickupZip });

  const slug = requestedSlug || `${slugify(title)}-${shortId()}`;
  const { error: insErr } = await supabase.from("drops").insert({
    seller_id: shop.id,
    slug,
    title,
    category,
    description: description || null,
    photo_urls: photoUrls,
    photo_url: photoUrls[0] ?? null,
    price_cents: priceCents,
    quantity,
    fulfillment,
    shipping_cents: shippingCents,
    last_broadcast_at: new Date().toISOString(),
    pickup_place: pickupPlace || null,
    pickup_address: pickupAddress,
    pickup_city: pickupCity,
    pickup_state: pickupState,
    pickup_zip: pickupZip,
    pickup_lat: coords?.lat ?? null,
    pickup_lng: coords?.lng ?? null,
    pickup_start: pickupStart,
    pickup_end: pickupEnd,
    status: "active",
  });
  if (insErr) return NextResponse.json({ error: "That didn't post. Try again." }, { status: 500 });

  return NextResponse.json({ slug });
}
