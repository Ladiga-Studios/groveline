import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

/* Sends the logged-in user a test email and reports Resend's exact
   answer, so a misconfigured sender is diagnosable in one click. */
export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const result = await sendEmail(
    user.email,
    "Groveline test email",
    `This is a test from Groveline. If you're reading it, email is working.\n\nSent from: ${process.env.RESEND_FROM || "(RESEND_FROM not set)"}`
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error, from: process.env.RESEND_FROM || null }, { status: 502 });
  }
  return NextResponse.json({ ok: true, from: process.env.RESEND_FROM || null });
}
