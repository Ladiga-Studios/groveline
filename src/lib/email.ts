/* One place to send email. Returns what happened so callers (and the test
   button in Settings) can tell the user instead of failing silently. */
export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(to: string, subject: string, text: string, replyTo?: string): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY is not set." };
  if (!to) return { ok: false, error: "No recipient." };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "Groveline <hello@send.groveline.io>",
      to,
      subject,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      console.error("email failed:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown email error";
    console.error("email failed:", msg);
    return { ok: false, error: msg };
  }
}
