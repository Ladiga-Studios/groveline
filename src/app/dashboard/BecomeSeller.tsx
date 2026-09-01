"use client";
import ShopForm from "@/components/ShopForm";

/* Shown on the dashboard when an account has no shop yet. */
export default function BecomeSeller({ firstName, town, state }: { firstName: string; town: string; state: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-3xl font-semibold">Ready to sell, {firstName}?</h1>
      <p className="mt-2 text-muted">
        Set up your shop. It gets its own page, its own link, and its own followers. You can run more than one from the same account.
      </p>
      <div className="mt-6">
        <ShopForm defaults={{ town, state }} />
      </div>
    </div>
  );
}
