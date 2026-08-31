import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Start selling",
  description:
    "Post a drop in about a minute, share one link, and Groveline tracks every claim. Free until you sell, then 5 percent per card order.",
  alternates: { canonical: "/sell" },
};

export default function SellPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-semibold">
        Your post, minus the chaos
      </h1>
      <p className="mt-4 text-lg">
        Right now you post to Facebook and spend the next two days answering
        the same three questions. Is this still available. How do I pay. When
        can I get it. Groveline answers all of that for you.
      </p>

      <Reveal>
        <div className="tag-card mt-8 p-6">
          <h2 className="text-2xl font-semibold">What you do</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Fill out four fields: what, how many, price, pickup.</li>
            <li>Add a photo. If words are not your thing, the built in writer drafts your description for you.</li>
            <li>Share your link in the groups you already post in.</li>
          </ol>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="tag-card mt-4 p-6">
          <h2 className="text-2xl font-semibold">What Groveline does</h2>
          <ul className="mt-3 space-y-2">
            <li>Shows a live count so nobody asks if it is still available</li>
            <li>Takes reservations with a name and phone number, no buyer accounts</li>
            <li>Builds your pickup day checklist: who, how many, paid or cash</li>
            <li>Keeps a waitlist when you sell out</li>
            <li>Emails your subscriber list when you post something new</li>
          </ul>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="tag-card mt-4 p-6">
          <h2 className="text-2xl font-semibold">What it costs</h2>
          <p className="mt-2">
            Free until money moves. Cash reservations cost nothing. When card
            payments launch, Groveline keeps 5 percent per order and that is
            the whole fee.
          </p>
        </div>
      </Reveal>

      <div className="mt-8 text-center">
        <Link href="/login" className="btn btn-primary text-lg">
          Post your first drop
        </Link>
        <p className="mt-3 text-sm text-muted">
          Takes about two minutes to sign up. Your first drop can be live
          tonight.
        </p>
      </div>
    </div>
  );
}
