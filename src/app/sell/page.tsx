import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { supabaseServer } from "@/lib/supabase/server";
import { FOR_PAGES } from "@/lib/for";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Open your online shop | Groveline",
  description:
    "Post a batch, share one link, and Groveline keeps the list. Shirts, tumblers, bread, soap, plants, plate sales. Buyers reserve in fifteen seconds, no account. First three drops free.",
  alternates: { canonical: "/sell" },
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

/* Stat strip under the hero. Real numbers only; nothing here is aspirational. */
const stats = [
  { n: "15 sec", d: "for a buyer to reserve, no account needed" },
  { n: "~1 min", d: "to post a drop from your phone" },
  { n: "3 free", d: "drops before you pay anything" },
  { n: "0%", d: "of your sales taken by Groveline" },
];

/* The comparison table. Column two is the pain, column three is the fix. */
const compare = [
  ["Is this still available?", "You answer it in the comments, repeatedly.", "The count updates automatically. Sold out becomes a waitlist."],
  ["Who ordered what", "A notebook, a screenshot, and a comment thread you scroll back through.", "One ordered list, with names, phone numbers, and quantities."],
  ["Getting paid", "Cash and Venmo, plus following up with the person who forgot.", "Cash at pickup, or a card hold that charges when you hand it over."],
  ["Reaching your regulars", "Hoping Facebook shows your post to them.", "Everyone who follows you gets an email the moment you post."],
  ["No-shows", "You absorb the loss, or message around trying to resell it.", "Tap Remove. The item goes straight back up for the next buyer."],
  ["Pickup day", "Managing a line from your phone.", "A checklist. Tap names as people pay, or print it in advance."],
];

const steps = [
  { t: "Post it", d: "What it is, how many, the price, and where or when to get it. Add photos. About a minute, standing at the counter or the craft table." },
  { t: "Share the link", d: "Paste it in the Facebook groups you already use, text it, put it on a sign. Your followers get an email automatically." },
  { t: "Hand it out", d: "Your reservations are your checklist. Tap names as people pay. No-show? Remove them and the items go back up." },
];

const features = [
  ["Live count", "Nobody has to ask what's left. Sold out becomes a waitlist automatically."],
  ["Reservations with no buyer account", "A name and a phone number is the entire form, taking about fifteen seconds on any phone."],
  ["Follower and subscriber emails", "Anyone can add their email on your shop page. Every new drop goes out to them automatically."],
  ["Card payments to your bank", "Buyers pay through Stripe. The card is held at reservation and charged when you mark it picked up. Cash still works too."],
  ["Shipping, if you want it", "Set one flat rate, and the card charges when you mark the order shipped. Pickup and shipping can run on the same drop."],
  ["Pickup reminders", "Buyers get an email the day before pickup, with a cancel link so you hear about changes early instead of at the table."],
  ["Printable pickup sheet", "A PDF for the table, and a spreadsheet for your records, generated for every drop."],
  ["Your shop page", "Your photo, your bio, your drops, a follow button, and a link you can put on a business card."],
  ["Post again", "Selling the same drop next week? One tap copies it, so you only need to update the date."],
];

const faq = [
  {
    q: "Do I need a business license or anything?",
    a: "That depends on what you sell and where you live. Every state has cottage food rules for home baked goods, and they differ a lot, so look yours up. Groveline is a list, not a license. What you sell and how you sell it is on you, same as it is on Facebook.",
  },
  {
    q: "Do my buyers need to sign up for anything?",
    a: "No. They tap your link, type in a name and phone number, and that's a reservation. Making an account is only for people who want to follow you and keep a running list of what they've claimed.",
  },
  {
    q: "Someone doesn't show up. Now what?",
    a: "Tap Remove next to their name and those items go straight back up for the next person to claim. If they'd paid by card, the hold releases and they're never charged.",
  },
  {
    q: "How does getting paid by card actually work?",
    a: "You link a bank account through Stripe, right from Settings, takes a few minutes. When someone pays by card, we put a hold on it, and it only charges once you mark them picked up or shipped. The money lands in your account, never ours, and we don't take a cut.",
  },
  {
    q: "Can I ship things instead of doing pickup?",
    a: "Yes, once card payments are turned on. Set a flat shipping charge, the buyer pays it when they order, and their card is charged once you mark the order shipped. You can offer pickup and shipping on the same drop.",
  },
  {
    q: "What's the actual cost?",
    a: "Your first three drops are free, no card needed. After that it's $10 a month or $60 a year, and that's the whole bill. No percentage of your sales, no listing fees, no per-order fees.",
  },
  {
    q: "What if I already sell on Facebook or at a market?",
    a: "Keep doing that. Groveline is the link you paste into the Facebook post and the list you bring to the market. It replaces the comment thread and the notebook, not the places you already sell.",
  },
  {
    q: "Can I run more than one shop from one account?",
    a: "Yes. A bakery and a plant stand, or a farm and the church plate sale you organize. Each shop gets its own page, link, and followers, and you switch between them in the dashboard.",
  },
];

/* One card per /for page, in the order they appear in the nav. */
const audiences = FOR_PAGES.map((p) => ({
  href: `/for/${p.slug}`,
  img: p.image,
  alt: p.imageAlt,
  t: p.heading,
  d: p.tagline,
}));

export default async function SellPage() {
  const { loggedIn, isSeller } = await getViewer();
  const ctaHref = isSeller ? "/dashboard/new" : loggedIn ? "/dashboard" : "/login?mode=register";
  const ctaLabel = isSeller ? "Post a drop" : loggedIn ? "Turn on selling for my account" : "Create your free account";

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="rise font-display text-4xl font-semibold leading-[1.08] text-grove sm:text-5xl lg:text-6xl">
              <span className="block">Post it once.</span>
              <span className="block text-gold">Watch the reservations come in.</span>
            </h1>
            <p className="rise rise-1 mt-6 max-w-xl text-lg">
              Groveline gives you an online shop with a page for everything you make. Buyers reserve with a
              name and a phone number, the count updates automatically, and you show up with the goods and a
              ready-made checklist. A dozen shirts, a run of tumblers, a tray of earrings, twenty bars of soap, a
              weekend batch of sourdough, a hundred plates for a fundraiser.
            </p>
            <div className="rise rise-2 mt-8 flex flex-wrap gap-3">
              <Link href={ctaHref} className="btn btn-primary text-lg">{ctaLabel}</Link>
              <Link href="/pricing" className="btn btn-outline text-lg">See pricing</Link>
            </div>
            <p className="rise rise-3 mt-4 text-sm text-muted">
              First three drops are free, no card required. $10 a month after that, and never a cut of a sale.
            </p>
          </div>
          <Image
            src="/illustrations/shirts.jpg"
            alt="A woman lifting a freshly pressed t-shirt from a heat press, with folded shirts stacked in four colors and more hanging on a rack behind her"
            width={1448}
            height={1086}
            priority
            className="rise rise-2 w-full rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 540px"
          />
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.n} delay={i * 60}>
              <div className="tag-card h-full p-4 sm:p-5">
                <dt className="font-display text-3xl font-semibold text-grove">{s.n}</dt>
                <dd className="mt-1 text-sm text-muted">{s.d}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* Before and after */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="compare">
          <h2 id="compare" className="text-3xl font-semibold">What changes when you post a drop</h2>
          <p className="mt-2 max-w-2xl text-muted">
            You already know how to sell. This covers the part between the post and the handoff, which is
            where most of the time goes.
          </p>
          <Reveal>
            <div className="tag-card mt-8 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm sm:text-base">
                <thead>
                  <tr className="bg-cream-dark/60 text-sm text-muted">
                    <th scope="col" className="px-4 py-3 font-medium sm:px-5">The job</th>
                    <th scope="col" className="px-4 py-3 font-medium sm:px-5">A Facebook post</th>
                    <th scope="col" className="px-4 py-3 font-medium sm:px-5">A Groveline drop</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map(([job, before, after]) => (
                    <tr key={job} className="border-t border-cream-dark align-top">
                      <th scope="row" className="px-4 py-4 font-semibold sm:px-5">{job}</th>
                      <td className="px-4 py-4 text-muted sm:px-5">{before}</td>
                      <td className="px-4 py-4 font-medium text-grove sm:px-5">{after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Buyer's view */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="buyers">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 id="buyers" className="text-3xl font-semibold">This is what your buyers see</h2>
            <p className="mt-4 text-lg">
              One page per drop, with your photos, the price, how many are left, and where to pick up. Paste
              the link into any Facebook group and it displays as a card with your photo and price already
              on it.
            </p>
            <ul className="mt-5 space-y-3">
              {[
                ["Up to 10 photos", "Upload from a desktop or your phone. The first photo becomes the preview card. Handmade sells on detail, so show the grain, the glitter, and the color options."],
                ["A map to the pickup spot", "Add an address and buyers get a map with directions built in, or leave it off and simply name the location."],
                ["Your own link", "groveline.io/d/fall-tumblers, or a name you choose. The same applies to your shop page."],
                ["A waitlist when you sell out", "The Reserve button switches to Join the waitlist, so you know exactly how many to make next time."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-peach" aria-hidden="true" />
                  <span><span className="font-semibold">{t}.</span> <span className="text-muted">{d}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <Reveal>
            {/* A static mock of a drop page, so this reads the same with no live drops. */}
            <div className="tag-card mx-auto max-w-md overflow-hidden !pl-0" aria-hidden="true">
              <Image
                src="/illustrations/tumblers.jpg"
                alt=""
                width={1448}
                height={1086}
                className="aspect-[4/3] w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 448px"
              />
              <div className="p-5">
                <p className="text-xs text-muted">Ridge &amp; Vine Designs, Piedmont, AL</p>
                <div className="mt-1 flex items-baseline justify-between gap-4">
                  <h3 className="text-xl font-semibold">Fall leaf tumblers</h3>
                  <p className="font-display text-xl font-semibold text-grove">$28</p>
                </div>
                <p className="mt-1 text-sm text-muted">Pickup Saturday 9 to noon at the Piedmont Farmers Market, or shipped for $8</p>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-cream-dark/60 px-3 py-2 text-sm">
                  <span className="font-medium">6 of 15 left</span>
                  <span className="text-muted">9 reserved</span>
                </div>
                <div className="btn btn-primary mt-4 w-full">Reserve yours</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Three steps */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="steps">
          <h2 id="steps" className="text-3xl font-semibold">Three steps, start to finish</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {steps.map((step, i) => (
              <Reveal key={step.t} delay={i * 90}>
                <li className="tag-card h-full p-5">
                  <p className="font-display text-3xl font-semibold text-leaf">{i + 1}</p>
                  <h3 className="mt-1 text-xl font-semibold">{step.t}</h3>
                  <p className="mt-2 text-muted">{step.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <Link href={ctaHref} className="btn btn-primary mt-8">{ctaLabel}</Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="features">
        <h2 id="features" className="text-3xl font-semibold">Everything included with every drop</h2>
        <p className="mt-2 text-muted">Every feature below is included on every plan, including the free drops.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([t, d], i) => (
            <Reveal key={t} delay={(i % 3) * 60}>
              <li className="tag-card h-full p-5">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Audiences */}
      <section className="bg-cream-dark/50">
        <div className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="who">
          <h2 id="who" className="text-3xl font-semibold">Built around what you sell</h2>
          <p className="mt-2 text-muted">Choose your category to see the specifics.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
            {audiences.map((c, i) => {
              const last = i === audiences.length - 1;
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
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="faq">
        <h2 id="faq" className="text-3xl font-semibold">Things people usually want to know</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {faq.map((f) => (
            <div key={f.q} className="tag-card p-5">
              <h3 className="font-semibold">{f.q}</h3>
              <p className="mt-2 text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-grove text-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-3xl font-semibold">Your first drop can be live within minutes</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-cream/90">
            Setup takes about a minute. Three drops are free, no card required, and you can cancel any time.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={ctaHref} className="btn btn-primary text-lg">{ctaLabel}</Link>
            <Link href="/pricing" className="btn btn-outline-cream text-lg">See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
