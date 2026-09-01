import type { Metadata } from "next";
import Link from "next/link";
import { MIN_AGE, PROHIBITED, TERMS_VERSION } from "@/lib/policy";

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
      <p className="mt-1 text-sm text-muted">Version {TERMS_VERSION}. Ladiga Studios LLC, Alabama.</p>

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
          <h2 className="text-xl font-semibold">Who can use it</h2>
          <p className="mt-2">
            You have to be {MIN_AGE} or older to hold an account or reserve anything, and you confirm that
            when you sign up and every time you reserve. Groveline is for people in the United States.
            If we find out an account belongs to someone under {MIN_AGE}, we&apos;ll close it and delete what
            we have. If you think a child has given us information, email hello@groveline.io and we&apos;ll
            remove it.
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
          <h2 className="text-xl font-semibold">What can&apos;t be sold here</h2>
          <p className="mt-2">
            Some things are off the table no matter what&apos;s legal where you live, either because they need a
            license Groveline can&apos;t verify or because the reservation flow isn&apos;t built to handle them safely.
            Listings are checked automatically when you post, and anything on this list gets removed:
          </p>
          <dl className="mt-3 space-y-3">
            {PROHIBITED.map((c) => (
              <div key={c.label}>
                <dt className="font-semibold">{c.label}</dt>
                <dd className="text-muted">{c.detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3">
            Beyond that list: don&apos;t post anything illegal where you are, anything that isn&apos;t yours to sell,
            or anything that would get you thrown out of a farmers market. Don&apos;t use a buyer&apos;s phone number
            or address for anything other than the order they placed. We can remove listings or accounts that
            break these rules, without refunding subscription time.
          </p>
          <p className="mt-2">
            Automated checks catch what they can and no more. A listing going up is not Groveline vouching
            for it, and the seller stays responsible for what they sell either way.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Photos and what you post</h2>
          <p className="mt-2">
            What you post stays yours. You give Groveline permission to show it on the site and in link
            previews and emails about your drops, which is what makes the thing work. Only post photos you
            took or have the right to use. If something of yours is on Groveline and shouldn&apos;t be, email
            hello@groveline.io with a link to it and what it is, and we&apos;ll take it down. Repeat infringers
            lose their accounts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">The limits of what we&apos;re on the hook for</h2>
          <p className="mt-2">
            Groveline is provided as is and as available, without warranties of any kind, express or implied,
            including any implied warranty of merchantability, fitness for a particular purpose, title, or
            non-infringement. We are a small operation doing our best, and we can&apos;t promise the site will
            always be up, always be right, or always be free of mistakes. We don&apos;t verify sellers, inspect
            goods, or guarantee that anyone will show up.
          </p>
          <p className="mt-2">
            To the fullest extent the law allows, Groveline and Ladiga Studios LLC are not liable for anything
            that happens between a buyer and a seller, including bad products, missed pickups, food that made
            someone sick, packages that never arrived, or money that changed hands, and are not liable for
            indirect, incidental, consequential, or punitive damages or for lost profits. If we are found
            liable for something anyway, the most we owe you in total is what you paid Groveline in the twelve
            months before the claim, which for buyers is nothing. Some states don&apos;t allow some of these
            limits, so where that&apos;s true, they don&apos;t apply to you and the rest still stands.
          </p>
          <p className="mt-2">
            If your use of Groveline, or anything you sell or post, gets us pulled into a claim by someone
            else, you agree to defend and indemnify Groveline and Ladiga Studios LLC against it, including
            reasonable legal fees. We&apos;ll tell you promptly if that happens and you can run the defense, but
            we get a say in any settlement that costs us money or admits fault on our behalf. In plain words:
            your sale, your responsibility.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Disagreements between you and Groveline</h2>
          <p className="mt-2">
            This section is about disputes with <span className="font-semibold">Groveline</span>, not disputes
            with a seller or a buyer. Those stay between the two of you.
          </p>
          <p className="mt-2">
            Email hello@groveline.io first. Nearly everything gets sorted that way, and we ask that you give
            us 30 days to fix it before going further.
          </p>
          <p className="mt-2">
            If that doesn&apos;t work, you and Groveline agree to settle it by binding individual arbitration
            administered by the American Arbitration Association under its Consumer Arbitration Rules, in
            Calhoun County, Alabama, or by phone or video, or wherever you live if that&apos;s easier for you.
            Either of us can still bring a claim in small claims court instead if it qualifies. Claims are
            brought individually: no class actions, no collective or representative proceedings, and an
            arbitrator can&apos;t combine claims from different people. You can opt out of arbitration entirely
            by emailing hello@groveline.io within 30 days of first accepting these terms, and doing so
            changes nothing else about your account.
          </p>
          <p className="mt-2">
            If the class action waiver above is found unenforceable, this whole arbitration section drops out
            and disputes go to the courts named below instead.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">The fine print</h2>
          <p className="mt-2">
            These terms are governed by the laws of the State of Alabama, without regard to conflict of law
            rules. Anything not going to arbitration goes to the state or federal courts in Calhoun County,
            Alabama. If any part of these terms turns out to be unenforceable, the rest still stands.
          </p>
          <p className="mt-2">
            We&apos;ll change these terms as Groveline grows. The version number and date sit at the top of this
            page, and every account and every reservation records the version that was live at the time. When
            a change actually matters, we&apos;ll email account holders at least 14 days before it takes effect,
            and using Groveline after that date means you accept the new version. If you&apos;d rather not, you
            can close your account.
          </p>
          <p className="mt-2">
            Questions or problems: hello@groveline.io, or use the{" "}
            <Link href="/support" className="text-grove underline">support page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
