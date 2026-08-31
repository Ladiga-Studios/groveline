import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Groveline collects and how it is used, in plain language.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Privacy</h1>
      <p className="mt-2 text-muted">Plain language, because that is how we do everything.</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-xl font-semibold">What we collect</h2>
          <p className="mt-2">
            If you reserve something: your name, phone number, and email if you
            choose to leave one. If you make an account: your email, name, town,
            and state. If you sell: what you post, including photos. If you join
            a seller&apos;s email list: your email.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">What it is used for</h2>
          <p className="mt-2">
            Connecting buyers and sellers. Your name and phone number go to the
            seller you reserved from so they know who is coming and can reach
            you if plans change. Emails are used for the things you asked for:
            claim confirmations, new drop announcements from sellers you follow
            or subscribed to, and account emails like password resets.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">What we do not do</h2>
          <p className="mt-2">
            We do not sell your information. We do not share it with anyone
            except the seller you chose to reserve from. We do not send you
            marketing you did not sign up for. Every seller email has an
            unsubscribe link that works.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Where it lives</h2>
          <p className="mt-2">
            Data is stored with Supabase and the site runs on Vercel. Emails
            are sent through Resend. Payments in cash happen entirely between
            you and the seller and never touch us.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Want something removed?</h2>
          <p className="mt-2">
            Email hello@groveline.io and we will delete your information. If
            you have an account, deleting it removes your profile, follows,
            and subscriptions.
          </p>
        </section>
      </div>
    </div>
  );
}
