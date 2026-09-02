import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { supabaseServer } from "@/lib/supabase/server";
import { FOR_PAGES } from "@/lib/for";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell baked goods, produce, plants, and handmade goods locally",
  description:
    "Post what you have, share one link, and Groveline keeps the list. Buyers reserve in 15 seconds with no account. Cash or card, pickup or shipping. Your first three drops are free and we never take a cut.",
  alternates: { canonical: "/sell" },
  openGraph: {
    title: "Sell what you make in batches | Groveline",
    description: "Post a drop, share one link, hand it out. First three drops free. No cut of your sales, ever.",
  },
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

/* Side-by-side of the way most people sell now versus a drop. Every row is
   a real thing Groveline does, not a feeling. */
const compare: { task: string; before: string; after: string }[] = [
  { task: "Is this still available?", before: "You answer it in the comments. Forty times.", after: "The count updates by itself. Sold out turns into a waitlist." },
  { task: "Who ordered what", before: "A notebook, a screenshot, and a thread you scroll back through.", after: "One list, in order, with names, phone numbers, and quantities." },
  { task: "Getting paid", before: "Cash, Venmo, and chasing the person who forgot.", after: "Cash at pickup, or a card hold that charges when you hand it over." },
  { task: "Telling your regulars", before: "Hope Facebook shows your post to them.", after: "Everyone who follows you gets an email the second you post." },
  { task: "No-shows", before: "You ate the loss, or texted around to resell it.", after: "Tap Remove. The items go back up for the next person." },
  { task: "Pickup day", before: "Scrolling on your phone with a line forming.", after: "A checklist. Tap names as they pay. Print it if you'd rather." },
];

const numbers: [string, string][] = [
  ["15 sec", "for a buyer to reserve, no account needed"],
  ["~1 min", "to post a drop from your phone"],
  ["3 free", "drops before you pay anything"],
  ["0%", "of your sales taken by Groveline"],
];

export default async function SellPage() {
  const { loggedIn, isSeller } = await getViewer();
  const ctaHref = isSeller ? "/dashboard/new" : loggedIn ? "/dashboard" : "/login?mode=register";
  const ctaLabel = isSeller ? "Post a drop" : loggedIn ? "Turn on selling for my account" : "Start selling free";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Groveline",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://groveline.io/sell",
    description:
      "Post a drop, share one link, and let buyers reserve in seconds. Built for people who sell baked goods, produce, eggs, meat, plants, handmade goods, and plate sales in batches.",
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "USD", description: "First three drops free" },
      { "@type": "Offer", price: "10", priceCurrency: "USD", description: "Monthly plan, unlimited drops" },
      { "@type": "Offer", price: "60", priceCurrency: "USD", description: "Yearly plan, unlimited drops" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="rise text-sm font-medium text-leaf">For anyone who sells in batches</p>
            <h1 className="rise rise-1 mt-2 font-display text-4xl font-semibold leading-[1.08] text-grove sm:text-5xl lg:text-6xl">
              Post it once.
              <span className="block text-gold">Stop answering &ldquo;still available?&rdquo;</span>
            </h1>
            <p className="rise rise-2 mt-6 max-w-xl text-lg">
              Groveline turns a batch of anything into one link. Buyers reserve with a name and a phone number, the
              count updates on its own, and you show up with the goods and a checklist. Bread, eggs, beef, honey,
              soap, seedlings, plate sales.
            </p>
            <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
              <Link href={ctaHref} className="btn btn-primary text-lg">{ctaLabel}</Link>
              <Link href="/pricing" className="btn btn-outline text-lg">See pricing</Link>
            </div>
            <p className="rise rise-3 mt-4 text-sm text-muted">
              First three drops free, no card needed. $10 a month after that, and never a cut of a sale.
            </p>
          </div>
          <Image
            src="/illustrations/handmade.jpg"
            alt="A woman arranging soap and candles on a market table"
            width={1254}
            height={1254}
            className="rise rise-2 mx-auto w-full max-w-md rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 448px"
            priority
          />
        </div>

        {/* Numbers */}
        <dl className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {numbers.map(([n, label], i) => (
            <Reveal key={n} delay={i * 60}>
              <div className="tag-card h-full p-4 sm:p-5">
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block font-display text-3xl font-semibold text-grove sm:text-4xl">{n}</span>
                  <span className="mt-1 block text-sm text-muted">{label}</span>
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* Before and after */}
      <section className="bg-cream-dark/50 px-4 py-16" aria-labelledby="compare">
        <div className="mx-auto max-w-6xl">
          <h2 id="compare" className="text-3xl font-semibold">What changes when you post a drop</h2>
          <p className="mt-2 max-w-2xl text-muted">
            You already know how to sell. This is the part between the post and the handoff, which is where the
            time goes.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-cream-dark bg-white">
            <div className="hidden grid-cols-[1fr_1.3fr_1.3fr] gap-4 border-b border-cream-dark bg-cream px-5 py-3 text-sm font-semibold sm:grid">
              <span>The job</span>
              <span className="text-muted">A Facebook post</span>
              <span className="text-grove">A Groveline drop</span>
            </div>
            <ul>
              {compare.map((row, i) => (
                <li
                  key={row.task}
                  className={`grid gap-2 px-5 py-4 sm:grid-cols-[1fr_1.3fr_1.3fr] sm:gap-4 ${i > 0 ? "border-t border-cream-dark" : ""}`}
                >
                  <p className="font-semibold">{row.task}</p>
                  <p className="text-muted"><span className="font-medium sm:hidden">Before: </span>{row.before}</p>
                  <p><span className="font-medium text-grove sm:hidden">With Groveline: </span>{row.after}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What a drop looks like */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="looks">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 id="looks" className="text-3xl font-semibold">This is what your buyers see</h2>
            <p className="mt-4 text-lg">
              One page per drop, with your photos, the price, how many are left, and where to pick up. Paste the
              link into any Facebook group and it shows up as a card with your photo and price already on it.
            </p>
            <ul className="mt-5 space-y-3">
              {[
                ["Up to 10 photos", "Drag them in from a desktop or tap from your phone. The first one becomes the preview card."],
                ["A map to the pickup spot", "Type in the address and buyers get a map and a directions button. Or leave the address off and just name the place."],
                ["Your own link", "groveline.io/d/saturday-sourdough, or whatever you want to call it. Same for your shop page."],
                ["A waitlist when you sell out", "The Reserve button turns into Join the waitlist. Next batch, you know how many to make."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-peach" aria-hidden="true" />
                  <span><span className="font-semibold">{t}.</span> <span className="text-muted">{d}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <Reveal>
            <div className="tag-card overflow-hidden !p-0" aria-hidden="true">
              <Image
                src="/illustrations/goods.jpg"
                alt=""
                width={600}
                height={450}
                className="aspect-[16/10] w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 540px"
              />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted">Miller Farm · Piedmont, AL</p>
                    <p className="mt-0.5 font-display text-2xl font-semibold text-grove">Saturday sourdough</p>
                  </div>
                  <p className="font-display text-2xl font-semibold">$9</p>
                </div>
                <p className="mt-2 text-sm text-muted">Pickup Saturday 8 to 11 AM · Farmers market, Ladiga St.</p>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-cream px-4 py-2.5 text-sm">
                  <span className="font-medium">7 of 12 left</span>
                  <span className="text-muted">5 reserved</span>
                </div>
                <div className="btn btn-primary mt-4 w-full">Reserve yours</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Three steps */}
      <section className="bg-cream-dark/50 px-4 py-16" aria-labelledby="steps">
        <div className="mx-auto max-w-6xl">
          <h2 id="steps" className="text-3xl font-semibold">Three steps, start to finish</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {[
              { t: "Post it", d: "What it is, how many, the price, and where or when to get it. Add photos. About a minute, standing in the kitchen." },
              { t: "Share the link", d: "Paste it in the Facebook groups you already use, text it, put it on a sign. Your followers get an email automatically." },
              { t: "Hand it out", d: "Your reservations are your checklist. Tap names as people pay. No-show? Remove them and the items go back up." },
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
          <div className="mt-8">
            <Link href={ctaHref} className="btn btn-primary text-lg">{ctaLabel}</Link>
          </div>
        </div>
      </section>

      {/* Everything included */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="included">
        <h2 id="included" className="text-3xl font-semibold">Everything a drop comes with</h2>
        <p className="mt-2 max-w-2xl text-muted">All of it is included on every plan, including the free drops.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Live count", "Nobody has to ask what's left. Sold out becomes a waitlist on its own."],
            ["Reservations with no buyer account", "A name and a phone number. That's the whole form. Fifteen seconds on any phone."],
            ["Follower and subscriber emails", "Anyone can drop an email on your shop page. Every new drop goes out to them automatically."],
            ["Card payments to your bank", "Buyers pay through Stripe. The card is held at reservation and charged when you mark it picked up. Cash still works too."],
            ["Shipping, if you want it", "Set one flat rate. The card charges when you mark it shipped. Pickup and shipping on the same drop is fine."],
            ["Pickup reminders", "Buyers get an email the day before pickup, with a cancel link so you find out early instead of at the table."],
            ["Printable pickup sheet", "A PDF for the table and a spreadsheet for your records, per drop."],
            ["Your shop page", "Your photo, your bio, your drops, a follow button, and a link you can put on a business card."],
            ["Post again", "Same drop next week? One tap copies it, you change the date, done."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={(i % 3) * 60}>
              <li className="tag-card h-full p-5">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Made for */}
      <section className="bg-cream-dark/50 px-4 py-16" aria-labelledby="madefor">
        <div className="mx-auto max-w-6xl">
          <h2 id="madefor" className="text-3xl font-semibold">Built around what you sell</h2>
          <p className="mt-2 max-w-2xl text-muted">Pick the one that sounds like you for the specifics.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {FOR_PAGES.map((p, i) => (
              <Reveal key={p.slug} delay={i * 70}>
                <Link href={`/for/${p.slug}`} className="tag-card block h-full overflow-hidden !pl-0">
                  <Image src={p.image} alt={p.imageAlt} width={600} height={450} className="aspect-[4/3] w-full object-cover" sizes="(max-width: 640px) 50vw, 280px" />
                  <div className="p-3 sm:p-4">
                    <h3 className="text-sm font-semibold sm:text-base">{p.heading}</h3>
                    <p className="mt-1 hidden text-sm text-muted sm:block">{p.tagline}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
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
          <h2 className="text-3xl font-semibold">Your first drop could be live before dinner</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-cream/90">
            Setup takes about a minute. Three drops are free, no card needed, and you can stop any time.
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
