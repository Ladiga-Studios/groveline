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
      <p className="mt-2 text-muted">The short version, no legalese hiding anywhere. Using Groveline means you agree to this.</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-xl font-semibold">What Groveline is, and isn&apos;t</h2>
          <p className="mt-2">
            Groveline is a bulletin board with a reservation list attached. Sellers post what they have,
            buyers reserve it, and the sale happens between those two people. Groveline is not the seller,
            not the buyer, and not a party to any sale. We do not make, inspect, store, ship, or hand over
            anything. We do not hold anyone&apos;s money on cash sales, and on card sales the payment goes to
            the seller&apos;s own Stripe account, not ours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Sellers</h2>
          <p className="mt-2">
            If you sell on Groveline, the sale is yours from start to finish. That means you are responsible for:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>What you sell being what you said it is, safe, and legal to sell where you are</li>
            <li>Following the rules that apply to you, including cottage food laws, labeling, licensing, and any sales tax you owe</li>
            <li>Showing up for your own pickups, and shipping what you said you would ship, when you said you would</li>
            <li>Refunds, returns, replacements, and anything that goes wrong with an order, including disputes and chargebacks on card payments</li>
            <li>How you use buyer phone numbers and addresses, which is only for the order they placed</li>
          </ul>
          <p className="mt-2">
            When a buyer has a problem, they take it up with you, not with Groveline. Sellers who repeatedly
            take reservations and don&apos;t deliver, or who post things that break these rules, can be removed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Buyers</h2>
          <p className="mt-2">
            A reservation is your word that you&apos;re coming. If plans change, cancel from your reservation
            page so someone else can have it. If something is wrong with what you got, the seller is the one
            to talk to. They made it, they sold it, and they are the one who can make it right. We can help
            point you to them, but we can&apos;t refund a sale we were never part of.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Payments and shipping</h2>
          <p className="mt-2">
            Card payments are processed by Stripe and paid directly into the seller&apos;s own account. A card
            is held at reservation and charged when the seller marks the order picked up or shipped. Stripe&apos;s
            processing fees, refunds, and chargebacks all sit with the seller. Shipping is arranged, paid for,
            and carried out by the seller, and a lost or damaged package is between the buyer and the seller.
            Groveline never takes a percentage of a sale.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Cancellations and refunds</h2>
          <p className="mt-2">Here is exactly what happens, so nobody has to wonder:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><span className="font-semibold">A buyer cancels before pickup.</span> Their spot opens up. Any card hold is released; any card charge is refunded in full, automatically. After pickup, there is nothing to cancel.</li>
            <li><span className="font-semibold">A seller cancels a drop.</span> Every reservation is released, every card hold released or charge refunded automatically, and every buyer is emailed the seller&apos;s reason. Orders already handed over stand.</li>
            <li><span className="font-semibold">A seller changes the time or place.</span> Every buyer is emailed the new details with a cancel link, and can back out with no charge.</li>
            <li><span className="font-semibold">Card holds.</span> If pickup is within a week, the card is held and only charged at handoff. If pickup is further out, the card is charged when you reserve and refunded automatically if either side cancels before pickup. Buyers are told which applies before they pay.</li>
            <li><span className="font-semibold">Nobody marks it picked up.</span> A day after the pickup window passes, any unresolved card hold is released and both sides are told. Sellers who handed goods over and forgot to mark it settle with the buyer directly.</li>
            <li><span className="font-semibold">Refunds after pickup.</span> Those are the seller&apos;s call. Sellers have a refund button for any card payment. Groveline does not decide who was right.</li>
            <li><span className="font-semibold">Disputes and chargebacks.</span> Every card payment is on the seller&apos;s own Stripe account. A chargeback goes to the seller, and Stripe, not Groveline, handles it. The pickup sheet records when each order was marked handed over, and shipped orders carry a tracking number, so sellers have a record.</li>
          </ul>
          <p className="mt-2">
            Groveline automates these steps so that neither side has to chase the other. Groveline does not take sides, does not hold funds, and does not arbitrate. If something goes wrong beyond what is listed here, it is between the buyer and the seller.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Fees</h2>
          <p className="mt-2">
            A seller&apos;s first three drops are free. After that, selling is a subscription of $10 a month or
            $60 a year, cancellable any time from your account. Buying is always free.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">What you can&apos;t do here</h2>
          <p className="mt-2">
            Post things that are illegal, dangerous, or not yours to sell. Use anyone&apos;s contact information
            for anything other than the order they placed. Post content that would get you thrown out of a
            farmers market. We can remove listings or accounts that break these rules, without a refund of any
            subscription time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">The limits of what we&apos;re on the hook for</h2>
          <p className="mt-2">
            Groveline is provided as is. We are a small operation doing our best, and we can&apos;t promise the
            site will always be up, always be right, or always be free of mistakes. To the fullest extent the
            law allows, Groveline and Ladiga Studios are not liable for anything that happens between a buyer
            and a seller, including bad products, missed pickups, food that made someone sick, packages that
            never arrived, or money that changed hands. If we are ever found liable for something anyway, the
            most we owe is what you paid us in the last twelve months, which for buyers is nothing.
          </p>
          <p className="mt-2">
            If your use of Groveline gets us pulled into a dispute or a claim, you agree to cover the cost of
            that, including reasonable legal fees. In plain words: your sale, your responsibility.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">The fine print</h2>
          <p className="mt-2">
            These terms are governed by the laws of the State of Alabama. They can change as Groveline grows,
            and the current version always lives at this page. Questions or problems: hello@groveline.io, or
            use the support page.
          </p>
        </section>
      </div>
    </div>
  );
}
