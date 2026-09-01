import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start selling",
  description:
    "Post what you have, share one link, and let Groveline keep track of who ordered what. Cash or card, pickup or shipping. Your first three drops are free.",
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
    q: "Do my buyers need to sign up for anything?",
    a: "Nope. They tap your link, type in their name and phone number, and that's a reservation. Making an account is only for people who want to follow you and keep a running list of what they've claimed.",
  },
  {
    q: "Someone doesn't show up. Now what?",
    a: "Tap Remove next to their name and those items go straight back up for the next person to claim. If they'd paid by card, the hold releases and they're never charged.",
  },
  {
    q: "How does getting paid by card actually work?",
    a: "You link a bank account through Stripe, right from Settings, takes a few minutes. When someone pays by card, we put a hold on it, and it only actually charges once you mark them picked up or shipped. The money lands in your account, never ours, and we don't take a cut.",
  },
  {
    q: "Can I ship things instead of doing pickup?",
    a: "You can, once card payments are turned on. Set a flat shipping charge, the buyer pays it when they order, and their card is charged once you mark the order shipped.",
  },
  {
    q: "What's the actual cost?",
    a: "Your first three drops don't cost anything. After that, it's $10 a month or $60 a year, and that's genuinely the whole bill. No percentage of your sales, ever.",
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
          <h1 className="text-4xl font-semibold">You make the thing. Let us keep the list.</h1>
          <p className="mt-4 text-lg">
            Right now you probably post to Facebook and spend the next two days fielding the same three
            questions. Is this still available. How do I pay. When can I get it. Groveline answers all three
            before anyone has to ask, so you can get back to the oven, the field, or the workbench.
          </p>
          <div className="mt-6">
            <Link href={ctaHref} className="btn btn-primary text-lg">{ctaLabel}</Link>
            <p className="mt-3 text-sm text-muted">Three drops on us, no card needed to get started.</p>
          </div>
        </div>
        <Image
          src="/illustrations/workshop.jpg"
          alt="A woodworker sanding down a cutting board in a small, sunlit shop"
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
            <h2 className="text-2xl font-semibold">What you actually do</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Fill in what it is, how many you've got, the price, and where or when to get it. Toss in a few photos.</li>
              <li>Grab your link and paste it wherever your buyers already hang out.</li>
              <li>Show up with the goods and your phone. Tap names off the list as folks pay.</li>
            </ol>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="tag-card h-full p-6">
            <h2 className="text-2xl font-semibold">What Groveline handles for you</h2>
            <ul className="mt-3 space-y-2">
              <li>Keeps a live count going so nobody has to ask what's left</li>
              <li>Takes reservations with just a name and phone number, no accounts required</li>
              <li>Emails your followers and subscribers the moment you post something new</li>
              <li>Starts a waitlist the second you sell out, and reminds buyers the day before pickup</li>
              <li>Holds card payments until you actually hand something over, and covers shipping too</li>
              <li>Gives you a real page with your photo, your drops, and a place for people to sign up</li>
            </ul>
          </div>
        </Reveal>
      </div>

      <section className="mt-16" aria-labelledby="faq">
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

      <div className="mt-12 text-center">
        <Link href={ctaHref} className="btn btn-primary text-lg">{ctaLabel}</Link>
        <p className="mt-3 text-sm text-muted">Takes about a minute to set up. Your first drop could be live before dinner.</p>
      </div>
    </div>
  );
}
