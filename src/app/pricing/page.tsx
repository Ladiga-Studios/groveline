import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import PlanButtons from "./PlanButtons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pricing",
  description: "Your first three drops are free. After that, $10 a month or $60 a year, flat. Groveline never takes a cut of a sale.",
  alternates: { canonical: "/pricing" },
};

const included = [
  "Unlimited drops, with up to 10 photos each",
  "Your own shop page and link, more than one shop if you need it",
  "Automatic emails to your followers and subscribers every time you post",
  "Card payments straight to your bank, with a hold at reservation and charge at pickup",
  "Shipping on any drop, paid by card, charged when you mark it shipped",
  "Waitlists when you sell out, pickup reminders to buyers the day before",
  "A printable pickup sheet and a spreadsheet for every drop",
  "Live counts so nobody has to ask what's left",
];

const faq = [
  ["Do I need to pay to try it?", "No. Post three drops on the house, no card required. That's three over the life of your account rather than three at a time, so deleting one doesn't give the slot back. If it works for you, pick a plan then."],
  ["Do you take a cut of my sales?", "Never. Cash or card, big or small, the sale is yours. The subscription is the only thing you ever pay us."],
  ["What about card processing fees?", "Stripe charges its normal processing fee on card payments, about 2.9% plus 30 cents, the same as any card reader at a market. That comes out of the seller's side. Groveline adds nothing on top."],
  ["Can I cancel?", "Any time, with one button in your account settings. Nothing changes until the end of what you already paid for, and your shop, drops, and followers all stay right where they are."],
  ["What happens if I stop paying?", "You go back to the free tier. Your shop and everything on it stays up, you just can't post new drops past the three free ones until you pick a plan again."],
  ["Is buying free?", "Always. Buyers never pay Groveline anything, and they don't need an account."],
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default async function PricingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let subscribed = false;
  if (user) {
    const { data: b } = await supabaseAdmin().from("billing").select("subscription_status").eq("profile_id", user.id).maybeSingle();
    subscribed = ["active", "trialing", "past_due"].includes(b?.subscription_status ?? "none");
  }
  const stripeOn = !!process.env.STRIPE_SECRET_KEY && !!(process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID);
  const yearly = !!process.env.STRIPE_PRICE_ID_YEARLY;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold">Simple, and it stays that way</h1>
        <p className="mt-4 text-lg">
          Your first three drops are free. After that it&apos;s one flat price, and we never take a cut of what you
          sell. Buying is free for everyone, always.
        </p>
      </div>

      {/* The flat price in real numbers, since a percentage is what most
          people are used to paying elsewhere. */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ["$200 / month in sales", "$10"],
          ["$800 / month in sales", "$10"],
          ["$2,000 / month in sales", "$10"],
        ].map(([sales, bill]) => (
          <div key={sales} className="rounded-xl border border-cream-dark bg-white px-4 py-3">
            <p className="text-sm text-muted">{sales}</p>
            <p className="font-display text-2xl font-semibold text-grove">{bill} <span className="text-sm font-normal text-muted">to Groveline</span></p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        {stripeOn ? (
          <PlanButtons loggedIn={!!user} subscribed={subscribed} yearlyAvailable={yearly} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="tag-card p-6">
              <p className="font-display text-4xl font-semibold text-grove">$10<span className="text-lg font-normal text-muted"> / month</span></p>
              <p className="mt-1 text-sm text-muted">Month to month. Stop whenever.</p>
            </div>
            <div className="tag-card border-leaf p-6">
              <p className="font-display text-4xl font-semibold text-grove">$60<span className="text-lg font-normal text-muted"> / year</span></p>
              <p className="mt-1 text-sm text-muted">Two months free. Set it and forget it.</p>
            </div>
            <p className="text-sm text-muted sm:col-span-2">Checkout is being connected. Your first three drops are free in the meantime, so go ahead and post.</p>
          </div>
        )}
      </div>

      <section className="mt-12" aria-labelledby="included">
        <h2 id="included" className="text-2xl font-semibold">What a plan gets you</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {included.map((i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-leaf" aria-hidden="true" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="text-2xl font-semibold">Things people ask</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {faq.map(([q, a]) => (
            <div key={q} className="tag-card p-5">
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-2 text-muted">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-muted">
        Not selling? <Link href="/browse" className="text-grove underline">Go see what&apos;s for sale</Link>.
      </p>
    </div>
  );
}
