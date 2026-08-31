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
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_seller")
      .eq("id", user.id)
      .maybeSingle();
    return { loggedIn: true, isSeller: !!profile?.is_seller };
  } catch {
    return { loggedIn: false, isSeller: false };
  }
}

async function getFreshDrops(): Promise<Drop[]> {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("drops")
      .select("*, profiles!drops_seller_id_fkey(name, farm_name, town, state, slug)")
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
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-tight text-grove sm:text-5xl">
              The good stuff around here goes fast. Now it goes fair.
            </h1>
            <p className="mt-4 max-w-md text-lg">
              Local sellers post what they have. Neighbors reserve it in
              seconds and pick it up in person. No accounts to buy, no apps,
              no digging through comments.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/browse" className="btn btn-primary text-lg">
                Shop local drops
              </Link>
              <Link href={sellHref} className="btn btn-grove text-lg">
                {sellLabel}
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">
              Buying takes about 15 seconds and no account. Selling is free
              until you sell.
            </p>
          </div>

          <div className="relative">
            <Image
              src="/illustrations/hero.png"
              alt="A farmers market stand handing a bag of produce to a shopper"
              width={1213}
              height={445}
              priority
              className="w-full rounded-2xl"
              sizes="(max-width: 1024px) 100vw, 600px"
            />
            <div
              className="tag-card absolute -bottom-8 left-2 w-64 p-4 sm:left-6"
              aria-hidden="true"
            >
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">Sourdough loaves</p>
                <p className="font-display text-lg font-semibold text-grove">$9</p>
              </div>
              <p className="text-xs text-muted">Sarah in Piedmont</p>
              <p className="mt-1 text-sm font-semibold text-grove">5 of 12 left</p>
              <div className="btn btn-primary mt-2 w-full !min-h-10 text-sm">
                Reserve yours
              </div>
            </div>
          </div>
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

      {/* Sellers: how it works */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how">
          <h2 id="how" className="text-3xl font-semibold">
            Selling here is three steps
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            Bread, eggs, beef shares, seedlings, soap, plate sales. If you make
            it in batches, this is for you.
          </p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                img: "/illustrations/post.png",
                alt: "A hand writing a price tag next to a basket of bread",
                t: "Post it",
                d: "What you have, how many, the price, and where to pick it up. About a minute on your phone, and a built in writer drafts the words if you want.",
              },
              {
                img: "/illustrations/share.png",
                alt: "A paper plane carrying a listing over a small town",
                t: "Share it",
                d: "You get one link. Paste it in the Facebook groups you already use. It shows your photo and price, and the count updates so nobody asks what is left.",
              },
              {
                img: "/illustrations/pickup-list.png",
                alt: "A clipboard checklist beside a crate of vegetables",
                t: "Hand it out",
                d: "Buyers reserve with a name and phone number. Pickup day, your list is your checklist: who is coming, how many, check them off as they pay.",
              },
            ].map((step, i) => (
              <Reveal key={step.t} delay={i * 90}>
                <li className="tag-card h-full p-5">
                  <Image
                    src={step.img}
                    alt={step.alt}
                    width={220}
                    height={250}
                    className="mx-auto h-36 w-auto"
                    sizes="220px"
                  />
                  <h3 className="mt-3 text-xl font-semibold">
                    {i + 1}. {step.t}
                  </h3>
                  <p className="mt-2 text-muted">{step.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <div className="mt-8">
            <Link href="/sell" className="btn btn-grove">
              See how selling works
            </Link>
          </div>
        </div>
      </section>

      {/* The list that grows itself */}
      <section className="bg-grove text-cream">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="list">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="list" className="text-3xl font-semibold">
                Your regulars, saved automatically
              </h2>
              <p className="mt-4 text-lg text-cream/90">
                You know the folks who stop by every week and say &quot;text me
                when you have more.&quot; Groveline is that, running by itself.
              </p>
              <ul className="mt-4 space-y-3 text-cream/90">
                <li>
                  Your page has a signup box. Anyone can drop their email in.
                  That is your list, and it is yours.
                </li>
                <li>
                  The moment you post a drop, everyone on your list gets an
                  email about it. Automatically. You never send anything.
                </li>
                <li>
                  Fifty regulars getting an email the second your bread is up
                  beats hoping Facebook shows your post to anybody.
                </li>
              </ul>
            </div>
            <Reveal>
              <div className="tag-card p-5 text-ink" aria-hidden="true">
                <p className="text-sm text-muted">What your regulars get</p>
                <div className="mt-3 rounded-lg border border-cream-dark bg-white p-4">
                  <p className="text-sm font-semibold">
                    New drop from Miller Farm: Sourdough loaves
                  </p>
                  <p className="mt-2 text-sm text-muted">
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

      {/* Shoppers */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="shop">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Image
            src="/illustrations/goods.png"
            alt="Bread, tomatoes, eggs, and preserves from local sellers"
            width={353}
            height={251}
            className="mx-auto w-full max-w-sm rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 384px"
          />
          <div>
            <h2 id="shop" className="text-3xl font-semibold">
              Shopping takes about 15 seconds
            </h2>
            <ul className="mt-4 space-y-2">
              <li>Browse everything for sale near you in one place.</li>
              <li>Tap, pick how many, leave your name and number. Reserved.</li>
              <li>No account and no app needed to buy. Pay cash at pickup.</li>
              <li>
                Make a free account if you want to follow sellers and get an
                email every time they post.
              </li>
            </ul>
            <Link href="/browse" className="btn btn-primary mt-6">
              Browse what is near you
            </Link>
          </div>
        </div>
      </section>

      {/* Fundraisers */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="fund">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="fund" className="text-3xl font-semibold">
                Plate sales that sell out before the grill is hot
              </h2>
              <p className="mt-4 text-lg">
                Fire departments, churches, and booster clubs: post your plate
                sale as a drop and know exactly how many plates to cook. Every
                reservation has a name and number, and the waitlist tells you
                if you should have made more.
              </p>
              <Link href="/sell" className="btn btn-grove mt-6">
                Set up a plate sale
              </Link>
            </div>
            <Image
              src="/illustrations/plates.png"
              alt="A volunteer handing a plate to a neighbor at a fire station fundraiser"
              width={407}
              height={256}
              className="mx-auto w-full max-w-md rounded-2xl"
              sizes="(max-width: 1024px) 100vw, 448px"
            />
          </div>
        </div>
      </section>

      {/* Pricing + CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center" aria-labelledby="go">
        <h2 id="go" className="text-3xl font-semibold">
          Free until money moves
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg">
          Cash reservations cost nothing, forever. When card payments launch,
          Groveline keeps 5 percent of card orders and that is the only fee.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={
              viewer.isSeller
                ? "/dashboard/new"
                : viewer.loggedIn
                  ? "/dashboard"
                  : "/login?mode=register"
            }
            className="btn btn-primary text-lg"
          >
            {viewer.isSeller
              ? "Post a drop"
              : viewer.loggedIn
                ? "Turn on selling for my account"
                : "Create your free account"}
          </Link>
          <Link href="/browse" className="btn btn-outline text-lg">
            Just here to shop
          </Link>
        </div>
      </section>
    </>
  );
}
