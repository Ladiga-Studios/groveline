import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Start selling",
  description:
    "Post a drop in about a minute, share one link, and Groveline tracks every claim and emails your regulars. Free until you sell.",
  alternates: { canonical: "/sell" },
};

export default function SellPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Your post, minus the chaos</h1>
      <p className="mt-4 text-lg">
        Right now you post to Facebook and spend the next two days answering
        the same three questions. Is this still available. How do I pay. When
        can I get it. Groveline answers all of that for you, whether you sell
        bread, beef, plants, soap, or Friday plate sales.
      </p>

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
            Free until money moves. Cash reservations cost nothing, forever.
            When card payments launch, Groveline keeps 5 percent per card order
            and that is the whole fee. No subscription, no monthly bill.
          </p>
        </div>
      </Reveal>

      <div className="mt-8 text-center">
        <Link href="/login?mode=register" className="btn btn-primary text-lg">
          Create your free account
        </Link>
        <p className="mt-3 text-sm text-muted">
          Takes about a minute to sign up. Your first drop can be live tonight.
        </p>
      </div>
    </div>
  );
}
