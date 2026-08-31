import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* The drop writer. Takes a seller's rough notes and returns a title and a
   short, plain description. Uses the Anthropic API directly, no SDK needed. */
export async function POST(req: Request) {
  const auth = await supabaseServer();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Writer not configured" }, { status: 503 });
  }

  let body: { notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const notes = (body.notes || "").slice(0, 600);
  if (!notes.trim()) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const prompt = `You write listings for local sellers: home bakers, farmers, plate sales. From the seller's notes below, write:
1. "title": a plain product name, 2 to 5 words, like "Sourdough Loaves" or "Quarter Beef Shares". No slogans.
2. "description": 1 to 3 short sentences a busy buyer can read in five seconds. Concrete facts only, no marketing fluff, no exclamation points, no em dashes, no words like artisanal or curated or elevate.

Respond with ONLY a JSON object: {"title": "...", "description": "..."}

Seller notes: ${notes}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error("api error");
    const data = await res.json();
    const text: string = data.content
      ?.map((c: { type: string; text?: string }) => (c.type === "text" ? c.text : ""))
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as { title?: string; description?: string };
    return NextResponse.json({
      title: (parsed.title || "").replace(/\u2014|\u2013/g, ",").slice(0, 80),
      description: (parsed.description || "").replace(/\u2014|\u2013/g, ",").slice(0, 500),
    });
  } catch {
    return NextResponse.json({ error: "Writer failed" }, { status: 500 });
  }
}
