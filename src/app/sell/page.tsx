import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start selling",
  description:
    "Post a drop in about a minute, share one link, and Groveline tracks every claim and emails your regulars. Free until you sell.",
  alternates: { canonical: "/sell" },
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

export default async function SellPage() {
  const { loggedIn, isSeller } = await getViewer();
  const ctaHref = isSeller
    ? "/dashboard/new"
    : loggedIn
      ? "/dashboard"
      : "/login?mode=register";
  const ctaLabel = isSeller
    ? "Post a drop"
    : loggedIn
      ? "Turn on selling for my account"
      : "Create your free account";
  const ctaHint = isSeller
    ? "You are all set up. A new drop takes about a minute."
    : loggedIn
      ? "You already have an account. One tap turns selling on, no new signup."
      : "Takes about a minute to sign up. Your first drop can be live tonight.";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-4xl font-semibold">Your post, minus the chaos</h1>
          <p className="mt-4 text-lg">
            Right now you post to Facebook and spend the next two days
            answering the same three questions. Is this still available. How
            do I pay. When can I get it. Groveline answers all of that for
            you, whether you sell bread, beef, plants, soap, or Friday plate
            sales.
          </p>
        </div>
        <Image
          src="/illustrations/bag.jpg"
          alt=""
          width={1254}
          height={1254}
          className="mx-auto hidden h-32 w-auto sm:block"
        />
      </div>

      <Reveal>
        <div className="tag-card mt-8 p-6">
          <h2 className="text-2xl font-semibold">What you do</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Fill out a few fields: what, how many, price, pickup.</li>
            <li>
              Add a photo. If words are not your thing, tap one button and the
              built in writer drafts your description from a few notes.
            </li>
            <li>Share your link in the groups you already post in.</li>
          </ol>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="tag-card mt-4 p-6">
          <h2 className="text-2xl font-semibold">What Groveline does</h2>
          <ul className="mt-3 space-y-2">
            <li>Shows a live count so nobody asks if it is still available</li>
            <li>Takes reservations with a name and phone number, no buyer accounts needed</li>
            <li>Builds your pickup day checklist: who, how many, paid or cash</li>
            <li>Keeps a waitlist when you sell out</li>
            <li>
              Emails your regulars for you. People join your list from your
              page, and every time you post a drop, the whole list gets an
              email automatically. You never have to send anything.
            </li>
          </ul>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="tag-card mt-4 p-6">
          <h2 className="text-2xl font-semibold">What it costs</h2>
          <p className="mt-2">
            Your first drop is free to try, no card needed. After that it is a
            flat $10 a month if you want to keep posting, and that is it, no
            cut taken out of any sale, cash or card.
          </p>
        </div>
      </Reveal>

      <div className="mt-8 text-center">
        <Link href={ctaHref} className="btn btn-primary text-lg">
          {ctaLabel}
        </Link>
        <p className="mt-3 text-sm text-muted">{ctaHint}</p>
      </div>
    </div>
  );
}
