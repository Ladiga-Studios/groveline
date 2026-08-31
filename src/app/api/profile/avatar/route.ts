import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { moderateDropSubmission } from "@/lib/moderation";

export const runtime = "nodejs";

/* Profile photo upload, moderated like drop photos. */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("avatar") as File | null;
  if (!file) return NextResponse.json({ error: "No photo" }, { status: 400 });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const check = await moderateDropSubmission({
    title: "profile photo",
    description: "",
    images: [{ base64, mediaType: file.type || "image/jpeg" }],
  });
  if (!check.ok) {
    return NextResponse.json({ error: "That photo doesn't meet our guidelines. Try a different one." }, { status: 422 });
  }

  const path = `${user.id}/avatar-${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from("drop-photos")
    .upload(path, file, { cacheControl: "31536000", contentType: "image/jpeg" });
  if (upErr) return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  const url = supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl;

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
  return NextResponse.json({ url });
}
