/* One place to send email. Silently does nothing if Resend isn't set up,
   so email is always a courtesy and never blocks the thing it's about. */
export async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY || !to) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM || "Groveline <hello@groveline.io>",
      to,
      subject,
      text,
    });
  } catch {
    /* courtesy only */
  }
}
