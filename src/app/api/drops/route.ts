import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { moderateDropSubmission } from "@/lib/moderation";
import { slugify, shortId } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "other");
  const description = String(form.get("description") ?? "").trim();
  const priceCents = Math.round(parseFloat(String(form.get("price") ?? "0")) * 100);
  const quantity = parseInt(String(form.get("quantity") ?? "0"), 10);
  const pickupPlace = String(form.get("pickupPlace") ?? "").trim();
  const pickupStart = String(form.get("pickupStart") ?? "");
  const pickupEnd = String(form.get("pickupEnd") ?? "");
  const photos = form.getAll("photos") as File[];

  if (!title) return NextResponse.json({ error: "Give it a name." }, { status: 400 });
  if (!priceCents || priceCents <= 0)
    return NextResponse.json({ error: "Enter a price." }, { status: 400 });
  if (!quantity || quantity <= 0)
    return NextResponse.json({ error: "Enter how many." }, { status: 400 });
  if (!pickupPlace) return NextResponse.json({ error: "Enter a pickup place." }, { status: 400 });
  if (photos.length > 10)
    return NextResponse.json({ error: "Up to 10 photos." }, { status: 400 });

  const images = await Promise.all(
    photos.map(async (f) => ({
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
      mediaType: f.type || "image/jpeg",
    }))
  );

  const check = await moderateDropSubmission({ title, description, images });
  if (!check.ok) {
    return NextResponse.json({ error: check.message, flagged: check.flagged }, { status: 422 });
  }

  const photoUrls: string[] = [];
  for (const photo of photos) {
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("drop-photos")
      .upload(path, photo, { cacheControl: "31536000", contentType: "image/jpeg" });
    if (upErr) {
      return NextResponse.json({ error: "A photo failed to upload. Try again." }, { status: 500 });
    }
    photoUrls.push(supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl);
  }

  const slug = `${slugify(title)}-${shortId()}`;
  const { error: insErr } = await supabase.from("drops").insert({
    seller_id: user.id,
    slug,
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
    status: "active",
  });
  if (insErr) {
    return NextResponse.json({ error: "Could not create the drop." }, { status: 500 });
  }

  return NextResponse.json({ slug });
}
