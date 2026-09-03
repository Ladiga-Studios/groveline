import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import DropCard from "@/components/DropCard";
import { supabaseServer } from "@/lib/supabase/server";
import type { Drop } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Groveline | An online shop for the things you make",
  description:
    "Post a batch, share one link, and Groveline keeps the list. Bread, produce, shirts, tumblers, jewelry, soap, plants, and plate sales. Buyers reserve in seconds with no account.",
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

export default async function Home({ searchParams }: { searchParams: Promise<{ closed?: string }> }) {
  // Someone who just closed their account lands here with no session, so
  // this banner is the only confirmation they get in the browser.
  const { closed } = await searchParams;
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
      {closed && (
        <div className="bg-grove px-4 py-3 text-center text-cream">
          <p className="mx-auto max-w-3xl">
            Your account is closed and everything under it is deleted. Thanks for giving Groveline a try.
          </p>
        </div>
      )}

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="rise font-display text-4xl font-semibold leading-[1.08] text-grove sm:text-5xl lg:text-6xl">
              <span className="block">Sell what you make.</span>
              <span className="block text-gold">Let Groveline track who claimed it.</span>
            </h1>
            <p className="rise rise-1 mt-6 max-w-xl text-lg">
              Groveline is an online shop for the things you make. Post what you have, and buyers can
              reserve it before it&apos;s gone. Shirts, tumblers, soap, bread, plants, plate sales: if you
              make it, it belongs here. Reservations take about fifteen seconds, with no account required.
              Meet buyers in person, or ship anywhere in the country.
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
              No account required to buy. Your first three drops as a seller are free.
            </p>
          </div>
          <Image
            src="/illustrations/booth.jpg"
            alt="A seller under a green striped awning arranging folded shirts, tumblers, and candles on a booth table while a customer looks over the goods"
            width={1448}
            height={1086}
            priority
            className="rise rise-2 w-full rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 540px"
          />
        </div>
      </section>

      {/* What sells here */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10" aria-labelledby="what">
        <h2 id="what" className="text-3xl font-semibold">What people are selling</h2>
        <p className="mt-3 max-w-2xl text-lg">
          If you make it, press it, grow it, or cook it in batches, there is a place for it here. Choose the
          category that fits.
        </p>
        {/* Five audiences. On phones the last card goes full width so nothing sits alone in a half row. */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
          {[
            { img: "/illustrations/goods.jpg", alt: "Bread, tomatoes, eggs, and a jar of preserves", t: "From the kitchen and the garden", d: "Sourdough, cakes, and cookies. Tomatoes, greens, and sweet corn. Eggs by the dozen, plus jam, honey, and pickles.", href: "/for/kitchen" },
            { img: "/illustrations/shirts.jpg", alt: "A woman lifting a freshly pressed t-shirt from a heat press, folded shirts stacked beside her", t: "From the craft table", d: "Shirts, tumblers, jewelry, and crochet. Vinyl, sublimation, and embroidery. If it sells at a craft fair, it sells here.", href: "/for/craft" },
            { img: "/illustrations/workshop.jpg", alt: "A woodworker sanding a cutting board, finished boards stacked beside him", t: "From the workshop", d: "Cutting boards, signs, soap, candles, and wax melts. Pottery, leather, and quilts belong here too.", href: "/for/workshop" },
            { img: "/illustrations/plants.jpg", alt: "A plant stand with seedlings, houseplants, and cut flowers", t: "From the greenhouse", d: "Seedlings and vegetable starts in spring. Cut flowers and bouquets all summer. Wreaths and Christmas trees when it turns cold.", href: "/for/greenhouse" },
            { img: "/illustrations/plates.jpg", alt: "A volunteer handing a plate of food across a table", t: "Community fundraisers", d: "Plate sales, Boston butts, fish fries, and bake sales. Know your numbers before you start cooking.", href: "/for/fundraisers" },
          ].map((c, i, all) => {
            const last = i === all.length - 1;
            return (
              <Reveal key={c.t} delay={i * 70} className={last ? "col-span-2 sm:col-span-1" : ""}>
                <Link href={c.href} className="tag-card block h-full overflow-hidden !pl-0">
                  <Image
                    src={c.img}
                    alt={c.alt}
                    width={600}
                    height={450}
                    className={`${last ? "aspect-[2/1] sm:aspect-[4/3]" : "aspect-[4/3]"} w-full object-cover`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 220px"
                  />
                  <div className="p-3 sm:p-4">
                    <h3 className="text-sm font-semibold sm:text-base">{c.t}</h3>
                    <p className="mt-1 hidden text-sm text-muted sm:block">{c.d}</p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-6 text-muted">
          Signs and decor, gift boxes, beef and pork shares, deer processing, hay and firewood, dog treats,
          fresh lemonade. There are more than 130 categories, and yours is almost certainly among them.
        </p>
      </section>

      {/* Live drops, when there are any */}
      {fresh.length > 0 && (
        <section className="bg-cream-dark/50 px-4 py-16" aria-labelledby="fresh">
          <div className="mx-auto max-w-6xl">
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
          </div>
        </section>
      )}

      {/* How selling works */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how">
        <h2 id="how" className="text-3xl font-semibold">How it works</h2>
        <p className="mt-2 max-w-2xl text-muted">
          You already know how to sell. Groveline handles the part that eats your time: tracking who
          ordered what.
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
            { t: "Post it", d: "What it is, how many you have, what it costs, and where or when to pick it up. Add a few photos. Takes about a minute from a phone or a computer." },
            { t: "Share it", d: "You get one link. Share it in the Facebook groups you already use, by text, or on a sign. It displays as a card with your photo and price, and the count updates automatically." },
            { t: "Hand it out", d: "Buyers reserve with a name and phone number, so your reservation list becomes your pickup-day checklist. Check names off as people pay. If someone doesn't show, remove them and the item reopens for the next buyer." },
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
              alt="A folding table with a cooler and two tagged paper bags at the end of a driveway, a neighbor walking up to it"
              width={1535}
              height={1024}
              className="w-full rounded-2xl"
              sizes="(max-width: 1024px) 100vw, 560px"
            />
            <div>
              <h2 id="home" className="text-3xl font-semibold">You don't need a market booth to sell here</h2>
              <p className="mt-4 text-lg">
                Many of the most successful sellers on Groveline have never set up at a market. A porch, a
                cooler, and a Facebook group are enough to get started. Post your drop, set out the pickup,
                and let Groveline keep track of who's coming.
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
              Turn on shipping and a drop works like any online store. Buyers pay by card at checkout, you
              receive a list of names and addresses, and you print the labels. Earrings, shirts, tumblers,
              soap, candles: anything that fits in a box can ship anywhere in the country.
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
            src="/illustrations/jewelry.jpg"
            alt="Hands pinning handmade earrings to a linen display board, with carded pairs ready to ship beside it"
            width={1477}
            height={1065}
            className="w-full rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 560px"
          />
        </div>
      </section>

      {/* Regulars */}
      <section className="bg-grove text-cream">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="list">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="list" className="text-3xl font-semibold">Your followers find out on their own</h2>
              <p className="mt-4 text-lg text-cream/90">
                Every shop page includes a signup box. Anyone can add their email with no account required,
                and buyers with an account can follow you directly. Post a new drop, and everyone on that
                list is notified automatically.
              </p>
              <p className="mt-3 text-lg text-cream/90">
                Reaching fifty followers the moment a batch is ready beats hoping Facebook shows your post
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
            <h2 id="shop" className="text-3xl font-semibold">Here to shop instead?</h2>
            <ul className="mt-4 space-y-2 text-lg">
              <li>Select a drop, choose how many you want, and enter your name and phone number. That's the entire reservation.</li>
              <li>No account and no app required. Pay by cash at pickup, or by card if the seller accepts it.</li>
              <li>Plans change? Every reservation page includes a cancel option, and the seller is notified automatically.</li>
              <li>Want more? A free account lets you follow sellers and track everything you've reserved in one place.</li>
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
