import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Groveline | Post what you have. Share one link. Sell it out.",
  description:
    "Groveline takes reservations for your bread, beef, produce, plants, or handmade goods so you are not digging through Facebook comments. Free until you sell.",
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Groveline",
  url: "https://groveline.io",
  email: "hello@groveline.io",
  description:
    "Groveline lets local sellers post a drop, share one link, and track claims, pickups, and buyer emails automatically.",
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
              Post what you have. Share one link. Sell it out.
            </h1>
            <p className="mt-4 max-w-md text-lg text-cream/85">
              You already sell on Facebook. Groveline just does the annoying
              part: it keeps count, takes reservations, and builds your pickup
              list while you do something else.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?mode=register" className="btn btn-primary text-lg">
                Create your free account
              </Link>
              <Link href="/browse" className="btn btn-outline-cream text-lg">
                See what is for sale
              </Link>
            </div>
            <p className="mt-4 text-sm text-cream/70">
              Free to use. When card payments launch, Groveline keeps 5 percent
              of card orders and that is the only fee. Cash sales always cost
              nothing.
            </p>
          </div>

          {/* What a drop looks like */}
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

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how">
        <h2 id="how" className="text-3xl font-semibold">
          How it works
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              t: "Post it",
              d: "What you have, how many, the price, and where to pick it up. Add a photo. Takes about a minute on your phone. Not much of a writer? Tap one button and it writes the listing for you.",
            },
            {
              t: "Share it",
              d: "You get one link. Paste it in your Facebook groups, text it, put it anywhere. It shows your photo and price automatically, and the count updates by itself, so nobody has to ask if it is still available.",
            },
            {
              t: "Hand it out",
              d: "People reserve with their name and phone number. No apps, no accounts for them. On pickup day, your list is right there: who is coming, how many they get, check them off as they pay.",
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

      {/* The newsletter, explained like a person would */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="list">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="list" className="text-3xl font-semibold">
                Your regulars, saved automatically
              </h2>
              <p className="mt-4 text-lg">
                Think of the folks who stop by your booth every week and say
                &quot;text me when you have more.&quot; Groveline is that, but
                it runs itself.
              </p>
              <ul className="mt-4 space-y-3">
                <li>
                  Your page has a signup box. Anyone can put their email in.
                  That is your list.
                </li>
                <li>
                  The moment you post a new drop, everyone on your list gets an
                  email about it. You do not write anything or press anything
                  extra. It just goes.
                </li>
                <li>
                  Your list is yours and it grows every week you sell. Fifty
                  regulars getting an email the second your bread is up beats
                  hoping Facebook shows your post to anybody.
                </li>
              </ul>
            </div>
            <Reveal>
              <div className="tag-card p-5" aria-hidden="true">
                <p className="text-sm text-muted">What your regulars get</p>
                <div className="mt-3 rounded-lg border border-cream-dark bg-white p-4">
                  <p className="text-sm font-semibold">
                    New drop from Miller Farm: Sourdough loaves
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Miller Farm just posted a new drop.
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Sourdough loaves, $9 each. Pickup Saturday at the farmers
                    market.
                  </p>
                  <div className="btn btn-grove mt-3 !min-h-10 !px-4 text-sm">
                    Reserve yours
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* What sells here */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="what">
        <h2 id="what" className="text-3xl font-semibold">
          If it sells at a market, it sells here
        </h2>
        <p className="mt-3 max-w-2xl text-lg">
          Food, farm goods, and handmade goods all work the same way: a batch,
          a price, a pickup time.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
            <Link
              key={c.value}
              href={`/browse?cat=${c.value}`}
              className="btn btn-outline"
            >
              {c.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-muted">
          Bread and cakes, eggs and produce, beef shares, seedlings and cut
          flowers, soap and candles and cutting boards, fire department plate
          sales. If you make it in batches, Groveline can sell it out.
        </p>
      </section>

      {/* Buyers */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="buyers">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 id="buyers" className="text-3xl font-semibold">
                Buying takes about 15 seconds
              </h2>
              <ul className="mt-4 space-y-2">
                <li>Tap a link, pick how many, leave your name and number. Done.</li>
                <li>No account and no app needed to reserve.</li>
                <li>Pay cash when you pick up. Card payments are coming.</li>
                <li>
                  Want more? A free account lets you follow sellers and browse
                  everything for sale near you.
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <Link href="/browse" className="btn btn-grove text-lg">
                Browse what is for sale
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center" aria-labelledby="go">
        <h2 id="go" className="text-3xl font-semibold">
          Your first drop can be live tonight
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg">
          Free account, one minute to post, share the link where you already
          sell. That is the whole thing.
        </p>
        <Link href="/login?mode=register" className="btn btn-primary mt-6 text-lg">
          Create your free account
        </Link>
      </section>
    </>
  );
}
