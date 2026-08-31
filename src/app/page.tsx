import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { GrovelineMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Groveline | Sell out without the comment chaos",
  description:
    "Post what you have, share one link, and Groveline tracks who claimed what. Built for bakers, farmers, and fundraisers. Free until you sell.",
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Groveline",
  url: "https://groveline.io",
  email: "hello@groveline.io",
  description:
    "Groveline lets local sellers post a drop, share one link, and track claims and pickups automatically.",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-grove text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Post once. We handle who gets what.
            </h1>
            <p className="mt-4 max-w-md text-lg text-cream/85">
              Sell your bread, beef, plants, or plate sale with one link. No
              more digging through comments and messages to figure out who
              claimed what.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sell" className="btn btn-primary text-lg">
                Start selling
              </Link>
              <Link href="/browse" className="btn btn-outline-cream text-lg">
                Browse drops
              </Link>
            </div>
            <p className="mt-4 text-sm text-cream/70">
              Free until you sell. 5 percent per order after that. Nothing else.
            </p>
          </div>

          {/* Demo tag: what a drop looks like */}
          <div className="tag-card mx-auto w-full max-w-sm p-5 text-ink" aria-hidden="true">
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-semibold">Sourdough loaves</p>
              <p className="font-display text-xl font-semibold text-grove">$9</p>
            </div>
            <p className="text-sm text-muted">Sarah in Piedmont</p>
            <p className="mt-2 text-sm">
              Pickup Sat, 8 to 11 AM at the farmers market
            </p>
            <p className="mt-2 font-semibold text-grove">5 of 12 left</p>
            <div className="btn btn-primary mt-4 w-full">Reserve yours</div>
          </div>
        </div>
      </section>

      {/* How it works. A real sequence, so numbers earn their place. */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how">
        <h2 id="how" className="text-3xl font-semibold">
          How it works
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              t: "Post it",
              d: "What you have, how many, the price, and where pickup happens. Four fields, about a minute, right from your phone.",
            },
            {
              t: "Share it",
              d: "You get a link that looks good anywhere you paste it. Post it in the same Facebook groups you already use.",
            },
            {
              t: "Hand it out",
              d: "Watch claims come in live. On pickup day your claim list is your checklist. Names, quantities, paid or cash.",
            },
          ].map((step, i) => (
            <Reveal key={step.t} delay={i * 90}>
              <li className="tag-card h-full p-5">
                <p className="font-display text-3xl font-semibold text-leaf">
                  {i + 1}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{step.t}</h3>
                <p className="mt-2 text-muted">{step.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Who it's for */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="who">
          <h2 id="who" className="text-3xl font-semibold">
            Built for the way you already sell
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="tag-card h-full p-6">
                <h3 className="text-xl font-semibold">Sellers</h3>
                <ul className="mt-3 space-y-2 text-ink">
                  <li>Home bakers and cottage food makers selling weekly batches</li>
                  <li>Farms selling produce, eggs, beef shares, and plants</li>
                  <li>Fire departments, churches, and boosters running plate sales</li>
                  <li>Anyone tired of tracking claims through comments and DMs</li>
                </ul>
                <Link href="/sell" className="btn btn-grove mt-5">
                  See how selling works
                </Link>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="tag-card h-full p-6">
                <h3 className="text-xl font-semibold">Buyers</h3>
                <ul className="mt-3 space-y-2 text-ink">
                  <li>Reserve in about 15 seconds. No account, no app.</li>
                  <li>Browse every active drop near you in one place</li>
                  <li>Follow your favorite sellers so you never miss a batch</li>
                  <li>Pay cash at pickup. Card payments are coming soon.</li>
                </ul>
                <Link href="/browse" className="btn btn-grove mt-5">
                  Browse drops
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pricing, stated plainly */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="price">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="price" className="text-3xl font-semibold">
            What it costs
          </h2>
          <p className="mt-4 text-lg">
            Nothing until money moves. When a card order goes through, Groveline
            keeps 5 percent. Cash reservations are free. No subscription, no
            setup fee, no monthly bill to remember.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 text-grove">
            <GrovelineMark size={28} />
            <Link href="/sell" className="btn btn-primary text-lg">
              Post your first drop
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
