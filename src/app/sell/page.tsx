import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start selling",
  description:
    "Post a drop in a minute, share one link, and Groveline keeps the list. Cash or card, pickup or shipping. First three drops free.",
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

const faq = [
  {
    q: "Do I need a business license or anything?",
    a: "That depends on what you sell and where you live. Every state has cottage food rules for home baked goods, and they differ a lot, so look yours up. Groveline is a list, not a license. What you sell and how you sell it is on you, same as it is on Facebook.",
  },
  {
    q: "Do my buyers need an account?",
    a: "No. They tap your link, put in a name and a phone number, and that is a reservation. If they want, they can make a free account to follow you and keep track of what they have reserved.",
  },
  {
    q: "What happens when somebody does not show up?",
    a: "You tap Remove on their name and those items go right back up for anyone to claim. If they paid by card, the hold on their card is released and nobody is charged.",
  },
  {
    q: "How do card payments work?",
    a: "You connect a bank account through Stripe from Settings. When a buyer pays by card, the money is held on their card, and it is only charged when you mark them picked up or shipped. It lands in your bank, not ours. We never take a cut.",
  },
  {
    q: "Can I ship?",
    a: "Yes, once card payments are set up. You set a flat shipping charge, the buyer pays when they order, and you charge the card when you mark it shipped.",
  },
  {
    q: "What does it cost?",
    a: "Your first three drops are free. After that it is $10 a month or $60 a year, and that is the whole bill. We never take a percentage of what you sell.",
  },
];

export default async function SellPage() {
  const { loggedIn, isSeller } = await getViewer();
  const ctaHref = isSeller ? "/dashboard/new" : loggedIn ? "/dashboard" : "/login?mode=register";
  const ctaLabel = isSeller ? "Post a drop" : loggedIn ? "Turn on selling for my account" : "Create your free account";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-semibold">You make the thing. We keep the list.</h1>
          <p className="mt-4 text-lg">
            Right now you post to Facebook and spend two days answering the same three questions. Is this still
            available. How do I pay. When can I get it. Groveline answers all three so you can get back to the oven,
            the field, or the shop.
          </p>
          <div className="mt-6">
            <Link href={ctaHref} className="btn btn-primary text-lg">{ctaLabel}</Link>
            <p className="mt-3 text-sm text-muted">Three free drops, no card needed to start.</p>
          </div>
        </div>
        <Image
          src="/illustrations/workshop.jpg"
          alt="A woodworker sanding a cutting board in a small shop"
          width={1254}
          height={1254}
          className="mx-auto w-full max-w-md rounded-2xl"
          sizes="(max-width: 1024px) 100vw, 448px"
          priority
        />
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="tag-card h-full p-6">
            <h2 className="text-2xl font-semibold">What you do</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Fill out what, how many, price, and where and when to get it. Add photos.</li>
              <li>Copy your link. Paste it where your buyers already are.</li>
              <li>Show up with the goods and a phone. Tap names as they pay.</li>
            </ol>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="tag-card h-full p-6">
            <h2 className="text-2xl font-semibold">What Groveline does</h2>
            <ul className="mt-3 space-y-2">
              <li>Keeps a live count so nobody asks what is left</li>
              <li>Takes reservations with a name and phone number, no buyer accounts</li>
              <li>Emails your followers and subscribers every time you post</li>
              <li>Keeps a waitlist when you sell out and reminds buyers the day before</li>
              <li>Holds card payments until you hand it over, and handles shipping orders</li>
              <li>Gives you a page with your photo, your drops, and a signup box</li>
            </ul>
          </div>
        </Reveal>
      </div>

      <section className="mt-16" aria-labelledby="faq">
        <h2 id="faq" className="text-3xl font-semibold">Questions people ask</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {faq.map((f) => (
            <div key={f.q} className="tag-card p-5">
              <h3 className="font-semibold">{f.q}</h3>
              <p className="mt-2 text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12 text-center">
        <Link href={ctaHref} className="btn btn-primary text-lg">{ctaLabel}</Link>
        <p className="mt-3 text-sm text-muted">Takes about a minute. Your first drop can be live tonight.</p>
      </div>
    </div>
  );
}
