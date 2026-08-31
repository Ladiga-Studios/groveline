import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "The deal between you and Groveline, in plain language.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Terms</h1>
      <p className="mt-2 text-muted">The short version of the deal.</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-xl font-semibold">What Groveline is</h2>
          <p className="mt-2">
            Groveline is a bulletin board with a reservation system. Sellers
            post what they have, buyers reserve it, and the exchange happens in
            person between the two of them. Groveline is not a party to the
            sale, does not handle the goods, and does not hold the money on
            cash sales.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Sellers</h2>
          <p className="mt-2">
            You are responsible for what you sell: that it is what you said it
            is, that it is legal to sell where you are, and that you follow the
            rules that apply to you, like cottage food laws for home baked
            goods. Show up for your own pickups. Sellers who repeatedly take
            reservations and do not show can be removed.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Buyers</h2>
          <p className="mt-2">
            A reservation is your word that you are coming. If plans change,
            reach out to the seller so they can pass your items to the next
            person. No shows hurt small sellers most.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Fees</h2>
          <p className="mt-2">
            Cash reservations are free. When card payments launch, Groveline
            keeps 5 percent of card orders and that is the whole fee.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Fair use</h2>
          <p className="mt-2">
            Do not post things that are illegal, dangerous, or not yours to
            sell. Do not use buyer phone numbers for anything except the drop
            they reserved. We can remove content or accounts that break these
            rules.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">The fine print</h2>
          <p className="mt-2">
            The service is provided as is, and we are a small operation doing
            our best. Questions or problems: hello@groveline.io. These terms
            can change as Groveline grows, and the current version always lives
            at this page.
          </p>
        </section>
      </div>
    </div>
  );
}
