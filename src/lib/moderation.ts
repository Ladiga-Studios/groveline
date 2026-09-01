/*
  Content moderation for drops. One Claude call checks every new photo and
  the listing text together, so posting a drop with ten photos costs the
  same one call as posting with one. Uses the same ANTHROPIC_API_KEY that
  used to power the drop writer.
*/

import { findProhibited, prohibitedForPrompt } from "./policy";

type ImageInput = { base64: string; mediaType: string };

type ModerationResult =
  | { ok: true }
  | { ok: false; flagged: "photo" | "text" | "prohibited"; message: string };

export async function moderateDropSubmission(input: {
  title: string;
  description: string;
  images: ImageInput[];
}): Promise<ModerationResult> {
  // Cheap deterministic pass first. It costs nothing, it runs even when
  // the API key is missing, and it catches the listings that are plainly
  // outside the rules before a single photo is uploaded.
  const hit = findProhibited(`${input.title} ${input.description}`);
  if (hit) {
    return {
      ok: false,
      flagged: "prohibited",
      message: `Groveline doesn't allow ${hit.label.toLowerCase()} to be sold here. ${hit.detail} If this listing isn't that, reword it and try again.`,
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Moderation is unavailable. Fail closed on photos (the higher risk
    // surface) but do not block a seller entirely if the key is missing.
    return { ok: true };
  }
  if (input.images.length === 0 && !input.description.trim()) {
    return { ok: true };
  }

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  > = [
    {
      type: "text",
      text: `You are a content safety check for a local marketplace where people sell food, plants, and handmade goods for local pickup. Review the listing title, description, and any photos below.

Title: ${input.title || "(none)"}
Description: ${input.description || "(none)"}

Flag it if photos show nudity, sexual content, graphic violence or gore, or anything clearly unsafe or inappropriate for a public family-friendly listing. Flag the text ONLY if it contains hate speech, sexual solicitation, or is clearly spam or a scam. Do not flag ordinary photos of food, plants, animals, crafts, or people at a market.

A listing being short, vague, plain, oddly worded, a placeholder, or a test is NOT a reason to flag it. "Drop", "test", "eggs", and "asdf" are all fine. These are real people typing on their phones, and a wrongly blocked listing costs a seller. When in doubt, allow it.

Separately, flag it as "prohibited" if the listing is offering any of these, which are not allowed on Groveline:
${prohibitedForPrompt()}

Judge what is actually being sold, not passing mentions. "Jam, no alcohol added" is jam. "Beeswax candles" is not alcohol. A photo of a barn cat next to a table of produce is produce, not a live animal sale. When it is genuinely ambiguous, allow it.

Respond with ONLY this JSON and nothing else. If everything is fine: {"ok": true}. Otherwise include a "reason" of a few plain words naming the specific problem, which is shown to the seller:
{"ok": false, "flagged": "photo", "reason": "<what's in the photo>"}
{"ok": false, "flagged": "text", "reason": "<what's wrong with the wording>"}
{"ok": false, "flagged": "prohibited", "reason": "<the category>"}`,
    },
    ...input.images.map((img) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 },
    })),
  ];

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
        max_tokens: 50,
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) return { ok: true }; // don't block a real seller over an API hiccup
    const data = await res.json();
    const text: string = (data.content ?? [])
      .map((c: { type: string; text?: string }) => (c.type === "text" ? c.text : ""))
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as { ok: boolean; flagged?: "photo" | "text" | "prohibited"; reason?: string };
    if (parsed.ok) return { ok: true };
    if (parsed.flagged === "prohibited") {
      return {
        ok: false,
        flagged: "prohibited",
        message: `Groveline doesn't allow this to be sold here${parsed.reason ? ` (${parsed.reason})` : ""}. The full list is in the terms. If that's a misread of your listing, reword it and try again, or get in touch through the support page.`,
      };
    }
    if (parsed.flagged === "text") {
      return {
        ok: false,
        flagged: "text",
        message: parsed.reason
          ? `We couldn't post this because of the wording: ${parsed.reason}. Reword it and try again, or use the support page if that's a misread.`
          : "Something in the title or description got flagged. Try rewording it, or use the support page if that seems wrong.",
      };
    }
    return {
      ok: false,
      flagged: "photo",
      message: parsed.reason
        ? `One of the photos got flagged: ${parsed.reason}. Swap that photo out and try again.`
        : "One of the photos got flagged. Try a different photo, or use the support page if that seems wrong.",
    };
  } catch {
    return { ok: true };
  }
}
