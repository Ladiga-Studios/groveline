import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

/* Support form. No honeypot on purpose: browser autofill fills hidden
   fields and real messages get thrown away. Instead: a minimum time on
   the page, Turnstile when it's configured, a per-IP rate limit, and the
   message is saved to the database before any email goes out, so a
   delivery hiccup never loses it. */

async function verifyTurnstile(token: string, ip: string | null) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    return !!(await res.json()).success;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string; email?: string; topic?: string; message?: string; renderedAt?: number; turnstileToken?: string;
  };
  const name = (body.name ?? "").trim().slice(0, 120);
  const email = (body.email ?? "").trim().slice(0, 200);
  const topic = (body.topic ?? "other").trim().slice(0, 40);
  const message = (body.message ?? "").trim().slice(0, 5000);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;

  if (name.length < 2) return NextResponse.json({ error: "Let us know your name." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "That email doesn't quite look right." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Tell us a little more so we can actually help." }, { status: 400 });

  // A person needs at least a few seconds to type a message.
  if (body.renderedAt && Date.now() - body.renderedAt < 3000) {
    return NextResponse.json({ error: "That went through a little fast. Give it another try." }, { status: 400 });
  }
  if (!(await verifyTurnstile(body.turnstileToken || "", ip))) {
    return NextResponse.json({ error: "Couldn't confirm you're human. Refresh and try again." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  if (ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("support_messages").select("*", { count: "exact", head: true }).eq("ip_address", ip).gte("created_at", since);
    if ((count ?? 0) >= 5) return NextResponse.json({ error: "You've sent a few already. Give it an hour and try again." }, { status: 429 });
  }

  let userId: string | null = null;
  try {
    const s = await supabaseServer();
    const { data: { user } } = await s.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const { data: saved, error } = await admin
    .from("support_messages")
    .insert({ name, email, topic, message, user_id: userId, ip_address: ip })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "That didn't send. Try again in a moment." }, { status: 500 });

  const to = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || "hello@groveline.io";
  await sendEmail(
    to,
    `Groveline support: ${topic} from ${name}`,
    `${name} <${email}>${userId ? " (logged in)" : ""}\nTopic: ${topic}\n\n${message}\n\nReply to this email to answer them directly.\nMessage id: ${saved.id}`,
    email
  );

  return NextResponse.json({ ok: true });
}
