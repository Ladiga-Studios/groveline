import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";

/* Anyone can report a listing. Goes to the reports table and, if set,
   an email to ADMIN_EMAIL. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    drop_id?: string;
    reason?: string;
    details?: string;
    email?: string;
  };
  const reasons = ["not-real", "inappropriate", "scam", "wrong-category", "other"];
  if (!body.drop_id || !body.reason || !reasons.includes(body.reason)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const admin = supabaseAdmin();
  const { error } = await admin.from("reports").insert({
    drop_id: body.drop_id,
    reason: body.reason,
    details: (body.details ?? "").slice(0, 1000) || null,
    reporter_email: body.email?.slice(0, 200) || null,
  });
  if (error) return NextResponse.json({ error: "Could not report" }, { status: 500 });

  if (process.env.ADMIN_EMAIL) {
    const { data: drop } = await admin.from("drops").select("title, slug").eq("id", body.drop_id).maybeSingle();
    sendEmail(
      process.env.ADMIN_EMAIL,
      `Listing reported: ${drop?.title ?? body.drop_id}`,
      `Reason: ${body.reason}\n${body.details ?? ""}\n\nListing: ${siteUrl()}/d/${drop?.slug}\nReview: ${siteUrl()}/admin`
    );
  }
  return NextResponse.json({ ok: true });
}
