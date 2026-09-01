"use client";
import ShopForm from "@/components/ShopForm";

/* Shown on the dashboard when an account has no shop yet. */
export default function BecomeSeller({ firstName, town, state }: { firstName: string; town: string; state: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-3xl font-semibold">Ready to sell, {firstName}?</h1>
      <p className="mt-2 text-muted">
        Set up your shop and you're most of the way there. It gets its own page, its own link, and its own
        followers, separate from your personal account. You can always add another shop later if you end up
        running more than one thing.
      </p>
      <div className="mt-6">
        <ShopForm defaults={{ town, state }} />
      </div>
    </div>
  );
}
