import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import DropCard from "@/components/DropCard";
import { supabaseServer } from "@/lib/supabase/server";
import type { Drop } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Groveline | Local food and goods, reserved in seconds",
  description:
    "Sellers post what they have. Neighbors reserve it in seconds and pick it up in person. Bread, produce, beef shares, plants, handmade goods, and plate sales.",
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

async function getViewer() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { loggedIn: false, isSeller: false };
    const { count } = await supabase.from("shops").select("*", { count: "exact", head: true }).eq("owner_id", user.id);
    return { loggedIn: true, isSeller: (count ?? 0) > 0 };
  } catch {
    return { loggedIn: false, isSeller: false };
  }
}

async function getFreshDrops(): Promise<Drop[]> {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("drops")
      .select("*, shops!drops_seller_id_fkey(name, town, state, slug, avatar_url)")
      .eq("status", "active")
      .gte("pickup_end", new Date().toISOString())
      .order("pickup_start", { ascending: true })
      .limit(4);
    return (data ?? []) as Drop[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [fresh, viewer] = await Promise.all([getFreshDrops(), getViewer()]);
  const sellHref = viewer.isSeller
    ? "/dashboard/new"
    : viewer.loggedIn
      ? "/dashboard"
      : "/sell";
  const sellLabel = viewer.isSeller ? "Post a drop" : "Start selling free";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-semibold leading-tight text-grove sm:text-5xl">
            Sell the batch. Skip the comment section.
          </h1>
          <p className="mt-4 max-w-2xl text-lg">
            Groveline is a reservation list for people who sell in batches around here. Bread, eggs, beef,
            honey, soap, seedlings, plate sales. You post what you have. Folks claim it in fifteen seconds.
            You hand it over at the market, your driveway, or the post office.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/browse" className="btn btn-primary text-lg">
              See what is for sale
            </Link>
            <Link href={sellHref} className="btn btn-grove text-lg">
              {sellLabel}
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Buying takes no account. Your first three drops as a seller are free.
          </p>
        </div>
        <Image
          src="/illustrations/hero.jpg"
          alt="A market stand handing a bag of produce to a neighbor, rolling hills behind"
          width={2172}
          height={724}
          priority
          className="mt-10 w-full rounded-2xl"
          sizes="(max-width: 1152px) 100vw, 1152px"
        />
      </section>

      {/* Live drops, when there are any */}
      {fresh.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10" aria-labelledby="fresh">
          <div className="flex items-baseline justify-between">
            <h2 id="fresh" className="text-3xl font-semibold">
              Claimable right now
            </h2>
            <Link href="/browse" className="font-medium text-grove underline underline-offset-2">
              See everything
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {fresh.map((d) => (
              <DropCard key={d.id} drop={d} />
            ))}
          </div>
        </section>
      )}

      {/* What sells here */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="what">
          <h2 id="what" className="text-3xl font-semibold">What sells here</h2>
          <p className="mt-3 max-w-2xl text-lg">
            Anything you make or grow in batches. Same tool whether it is a dozen loaves or a whole hog.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { img: "/illustrations/goods.jpg", alt: "Bread, tomatoes, eggs, and a jar of preserves", t: "From the kitchen and the garden", d: "Sourdough, cakes, cookies. Tomatoes, greens, sweet corn. Eggs by the dozen. Jam, honey, pickles, hot sauce.", g: "kitchen" },
              { img: "/illustrations/handmade.jpg", alt: "A woman arranging soap and candles at a market table", t: "From the workshop", d: "Soap, candles, wax melts. Cutting boards and signs. Quilts, crochet, pottery, leather. If your hands made it, it fits.", g: "workshop" },
              { img: "/illustrations/plants.jpg", alt: "A plant stand with seedlings, houseplants, and cut flowers", t: "From the greenhouse", d: "Seedlings and vegetable starts in spring. Cut flowers and bouquets all summer. Wreaths and Christmas trees when it turns cold.", g: "greenhouse" },
              { img: "/illustrations/plates.jpg", alt: "A volunteer handing a plate of food across a table", t: "From the fire hall", d: "Plate sales, Boston butts, fish fries, bake sales. Know how many to cook before you light the grill.", g: "fundraisers" },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 70}>
                <Link href={`/for/${c.g}`} className="tag-card block h-full overflow-hidden !pl-0">
                  <Image src={c.img} alt={c.alt} width={600} height={450} className="aspect-[4/3] w-full object-cover" sizes="(max-width: 640px) 100vw, 300px" />
                  <div className="p-4">
                    <h3 className="font-semibold">{c.t}</h3>
                    <p className="mt-1 text-sm text-muted">{c.d}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-muted">
            Also: beef and pork shares, deer processing, hay and firewood, chicks, dog treats, lemonade. There are 130 categories. Yours is in there.
          </p>
        </div>
      </section>

      {/* How selling works */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how">
        <h2 id="how" className="text-3xl font-semibold">How selling works</h2>
        <p className="mt-2 max-w-2xl text-muted">
          You already know how to sell. This just takes the bookkeeping off your plate.
        </p>
        <Reveal>
          <Image
            src="/illustrations/steps.jpg"
            alt="Writing a price tag, sending a link, and checking off a pickup list"
            width={2172}
            height={724}
            className="mt-8 w-full rounded-2xl"
            sizes="(max-width: 1152px) 100vw, 1152px"
          />
        </Reveal>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { t: "Post it", d: "What it is, how many, what it costs, where and when to get it. Add photos. A minute on your phone, standing in the kitchen." },
            { t: "Share it", d: "You get one link. Put it in the Facebook groups you already post in. It turns into a card with your photo and price. The count updates by itself, so nobody has to ask what is left." },
            { t: "Hand it out", d: "People reserve with a name and a phone number. Saturday morning, your list is your checklist. Tap each name as they pay. Somebody no-shows? Remove them and it goes back up for grabs." },
          ].map((step, i) => (
            <Reveal key={step.t} delay={i * 90}>
              <li className="tag-card h-full p-5">
                <p className="font-display text-3xl font-semibold text-leaf">{i + 1}</p>
                <h3 className="mt-1 text-xl font-semibold">{step.t}</h3>
                <p className="mt-2 text-muted">{step.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Sell from home */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="home">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Image
              src="/illustrations/driveway.jpg"
              alt="A folding table with a cooler and paper bags by a front porch, a neighbor walking up"
              width={1536}
              height={1024}
              className="w-full rounded-2xl"
              sizes="(max-width: 1024px) 100vw, 560px"
            />
            <div>
              <h2 id="home" className="text-3xl font-semibold">A booth is optional</h2>
              <p className="mt-4 text-lg">
                Half the best sellers around here have never set up at a market. They have a porch, a cooler,
                and a Facebook group. Post your drop, put the cooler out, and the list takes care of the rest.
              </p>
              <p className="mt-3 text-lg">
                Want to reach past your county? Turn on shipping and buyers pay by card when they order. You
                print the label, they get the box.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Regulars */}
      <section className="bg-grove text-cream">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="list">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="list" className="text-3xl font-semibold">Your regulars, on a list that builds itself</h2>
              <p className="mt-4 text-lg text-cream/90">
                Every seller has a signup box on their page. Anybody can drop an email in. Folks with an
                account can follow you too. When you post, all of them get an email. You did not have to send it.
              </p>
              <p className="mt-3 text-lg text-cream/90">
                Fifty people hearing about your bread the second it is up beats hoping Facebook shows your post
                to twelve of them.
              </p>
            </div>
            <Reveal>
              <div className="tag-card p-5 text-ink" aria-hidden="true">
                <p className="text-sm text-muted">What your regulars get</p>
                <div className="mt-3 rounded-lg border border-cream-dark bg-white p-4">
                  <p className="text-sm font-semibold">New drop from Miller Farm: Sourdough loaves</p>
                  <p className="mt-2 text-sm text-muted">Sourdough loaves, $9 each. Pickup Saturday at the farmers market.</p>
                  <div className="btn btn-grove mt-3 !min-h-10 !px-4 text-sm">Reserve yours</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Buyers */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="shop">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 id="shop" className="text-3xl font-semibold">If you are here to buy</h2>
            <ul className="mt-4 space-y-2 text-lg">
              <li>Tap a drop, pick how many, leave your name and number. That is a reservation.</li>
              <li>No account. No app. Pay cash when you pick up, or by card if the seller takes it.</li>
              <li>Plans change? Your reservation page has a cancel button, and the seller gets a heads up.</li>
              <li>Make a free account if you want to follow sellers and see everything you have reserved in one place.</li>
            </ul>
            <Link href="/browse" className="btn btn-primary mt-6">See what is for sale near you</Link>
          </div>
          <Image
            src="/illustrations/phone.jpg"
            alt="A hand holding a phone showing a reservation"
            width={1254}
            height={1254}
            className="mx-auto w-full max-w-sm rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 384px"
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center" aria-labelledby="go">
          <h2 id="go" className="text-3xl font-semibold">What it costs</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg">
            Your first three drops are free. After that it is $10 a month or $60 a year. We never take a cut of a sale, cash or card.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={viewer.isSeller ? "/dashboard/new" : viewer.loggedIn ? "/dashboard" : "/login?mode=register"} className="btn btn-primary text-lg">
              {viewer.isSeller ? "Post a drop" : viewer.loggedIn ? "Turn on selling" : "Start selling free"}
            </Link>
            <Link href="/browse" className="btn btn-outline text-lg">Just here to shop</Link>
          </div>
        </div>
      </section>
    </>
  );
}
