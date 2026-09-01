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
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="rise font-display text-4xl font-semibold leading-[1.08] text-grove sm:text-5xl lg:text-6xl">
              <span className="block">You made a batch.</span>
              <span className="block text-gold">Let&apos;s find it a home.</span>
            </h1>
            <p className="rise rise-1 mt-6 max-w-xl text-lg">
              Groveline is where people who sell in batches post what they have, so neighbors can claim it
              before it&apos;s gone. Bread, eggs, beef, honey, soap, seedlings, plate sales, whatever you make.
              Reserving takes about fifteen seconds. Then meet up in person, or ship it anywhere in the country.
            </p>
            <div className="rise rise-2 mt-8 flex flex-wrap gap-3">
              <Link href="/browse" className="btn btn-primary text-lg">
                See what&apos;s for sale
              </Link>
              <Link href={sellHref} className="btn btn-grove text-lg">
                {sellLabel}
              </Link>
            </div>
            <p className="rise rise-3 mt-4 text-sm text-muted">
              No account needed to buy anything. Your first three drops as a seller are on the house.
            </p>
          </div>
          <Image
            src="/illustrations/hero-side.jpg"
            alt="A seller handing a bag of produce across the table to a neighbor"
            width={999}
            height={724}
            priority
            className="rise rise-2 w-full rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 520px"
          />
        </div>
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
          <h2 id="what" className="text-3xl font-semibold">What people are selling</h2>
          <p className="mt-3 max-w-2xl text-lg">
            If you make it, grow it, or cook it in batches, there is a place for it here. Pick the one that
            sounds like you.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {[
              { img: "/illustrations/goods.jpg", alt: "Bread, tomatoes, eggs, and a jar of preserves", t: "From the kitchen and the garden", d: "Sourdough, cakes, cookies. Tomatoes, greens, sweet corn. Eggs by the dozen. Jam, honey, pickles, hot sauce.", g: "kitchen" },
              { img: "/illustrations/handmade.jpg", alt: "A woman arranging soap and candles at a market table", t: "From the workshop", d: "Soap, candles, wax melts. Cutting boards and signs. Quilts, crochet, pottery, leather. If your hands made it, it fits.", g: "workshop" },
              { img: "/illustrations/plants.jpg", alt: "A plant stand with seedlings, houseplants, and cut flowers", t: "From the greenhouse", d: "Seedlings and vegetable starts in spring. Cut flowers and bouquets all summer. Wreaths and Christmas trees when it turns cold.", g: "greenhouse" },
              { img: "/illustrations/plates.jpg", alt: "A volunteer handing a plate of food across a table", t: "From the fire hall", d: "Plate sales, Boston butts, fish fries, bake sales. Know how many to cook before you light the grill.", g: "fundraisers" },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 70}>
                <Link href={`/for/${c.g}`} className="tag-card block h-full overflow-hidden !pl-0">
                  <Image src={c.img} alt={c.alt} width={600} height={450} className="aspect-[4/3] w-full object-cover" sizes="(max-width: 640px) 100vw, 300px" />
                  <div className="p-3 sm:p-4">
                    <h3 className="text-sm font-semibold sm:text-base">{c.t}</h3>
                    <p className="mt-1 hidden text-sm text-muted sm:block">{c.d}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-muted">
            Beef and pork shares, deer processing, hay and firewood, chicks, dog treats, fresh lemonade.
            There are more than 130 categories, and yours is almost certainly one of them.
          </p>
        </div>
      </section>

      {/* How selling works */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how">
        <h2 id="how" className="text-3xl font-semibold">How it works</h2>
        <p className="mt-2 max-w-2xl text-muted">
          You already know how to sell your own stuff. This just handles the part you never wanted to do,
          which is keeping track of who ordered what.
        </p>
        <Reveal>
          <Image
            src="/illustrations/steps.jpg"
            alt="Posting a drop on a phone, sharing the card, and handing over a basket against a checked-off list"
            width={1672}
            height={941}
            className="mt-8 w-full rounded-2xl"
            sizes="(max-width: 1152px) 100vw, 1152px"
          />
        </Reveal>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {[
            { t: "Post it", d: "What it is, how many you have, what it costs, and where or when to pick it up. Add a few photos. Takes about a minute, standing right in the kitchen." },
            { t: "Share it", d: "You get one link. Drop it in the Facebook groups you already use. It shows up as a card with your photo and price, and the count updates on its own, so nobody has to ask what's left." },
            { t: "Hand it out", d: "People reserve with a name and a phone number. Saturday morning, your list is your checklist. Check names off as they pay. If someone doesn't show, take them off and it opens back up for the next person." },
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
              <h2 id="home" className="text-3xl font-semibold">You don't need a booth for this</h2>
              <p className="mt-4 text-lg">
                Some of the best sellers around here have never set foot in a market. They've got a porch,
                a cooler, and a Facebook group, and that's plenty. Post your drop, set the cooler out front,
                and let the list do the remembering for you.
              </p>

            </div>
          </div>
        </div>
      </section>

      {/* Shipping */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="ship">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-leaf">It&apos;s an online store too</p>
            <h2 id="ship" className="mt-1 text-3xl font-semibold">Or skip the meetup and ship it</h2>
            <p className="mt-4 text-lg">
              Turn on shipping and a drop works like any online store. Buyers pay by card at checkout, you get
              a list of names and addresses, you print the labels. Soap, candles, honey, cutting boards,
              dry goods, anything that fits in a box can go anywhere in the country.
            </p>
            <ul className="mt-5 space-y-3">
              {[
                ["Card checkout, handled", "Buyers pay through Stripe at checkout, Apple Pay and Google Pay included. Nobody types a card number into Groveline."],
                ["You set the shipping charge", "One flat rate per order. It gets added at checkout and paid to you along with the sale."],
                ["Charged when it ships, not before", "The card is held at checkout and only charged once you mark the order shipped. Cancel before then and nobody pays."],
                ["Pickup and shipping on the same drop", "Offer both and let the buyer pick. Locals swing by, everyone else gets a box."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-peach" aria-hidden="true" />
                  <span><span className="font-semibold">{t}.</span> <span className="text-muted">{d}</span></span>
                </li>
              ))}
            </ul>
            <Link href="/browse?ships=1" className="btn btn-grove mt-6">See drops that ship</Link>
          </div>
          <Image
            src="/illustrations/bag.jpg"
            alt="A paper bag with a leaf tag, ready to go"
            width={1254}
            height={1254}
            className="mx-auto w-full max-w-sm rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 384px"
          />
        </div>
      </section>

      {/* Regulars */}
      <section className="bg-grove text-cream">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="list">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="list" className="text-3xl font-semibold">Your regulars find you on their own</h2>
              <p className="mt-4 text-lg text-cream/90">
                Every shop has a signup box right on its page. Anyone can drop their email in, no account
                needed, and people who do have an account can follow you too. Post a new drop and everyone
                on that list hears about it automatically. You never have to remember to tell them.
              </p>
              <p className="mt-3 text-lg text-cream/90">
                Fifty people finding out about your bread the second it's ready beats hoping Facebook feels
                like showing your post to twelve of them.
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
            <h2 id="shop" className="text-3xl font-semibold">Here to shop instead?</h2>
            <ul className="mt-4 space-y-2 text-lg">
              <li>Tap a drop, pick how many you want, leave your name and number. That's the whole reservation.</li>
              <li>No account, no app to download. Pay cash at pickup, or by card if the seller offers it.</li>
              <li>Plans change? Your reservation page has a cancel button built right in, and the seller gets a heads up.</li>
              <li>Want more? A free account lets you follow sellers and see everything you've reserved in one spot.</li>
            </ul>
            <Link href="/browse" className="btn btn-primary mt-6">See what's for sale near you</Link>
          </div>
          <Image
            src="/illustrations/phone.jpg"
            alt="Someone holding up a phone with a reservation on the screen"
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
          <h2 id="go" className="text-3xl font-semibold">What it actually costs</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg">
            Your first three drops are free, no card required. After that, it's $10 a month or $60 a year,
            flat. We never take a cut of what you sell, whether someone pays cash or card.
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
