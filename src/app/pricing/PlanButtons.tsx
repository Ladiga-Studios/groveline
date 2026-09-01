"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function PlanButtons({
  loggedIn,
  subscribed,
  yearlyAvailable,
}: {
  loggedIn: boolean;
  subscribed: boolean;
  yearlyAvailable: boolean;
}) {
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState<"month" | "year" | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function go(interval: "month" | "year") {
    if (!loggedIn) {
      router.push("/login?mode=register");
      return;
    }
    setBusy(interval);
    const res = await fetch("/api/stripe/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval, promo }),
    });
    setBusy(null);
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else toast(data.error || "Couldn't start checkout. Try again.", "error");
  }

  if (subscribed) {
    return (
      <div className="tag-card p-6 text-center">
        <p className="font-semibold text-grove">You&apos;re already on a plan.</p>
        <p className="mt-1 text-sm text-muted">Switch, update your card, or cancel from your account settings.</p>
        <a href="/dashboard/settings" className="btn btn-outline mt-4">Manage my plan</a>
      </div>
    );
  }

  return (
    <div>
      <div className={`grid gap-4 ${yearlyAvailable ? "sm:grid-cols-2" : ""}`}>
        <div className="tag-card p-6">
          <p className="font-display text-4xl font-semibold text-grove">$10<span className="text-lg font-normal text-muted"> / month</span></p>
          <p className="mt-1 text-sm text-muted">Month to month. Stop whenever.</p>
          <button className="btn btn-outline mt-5 w-full" onClick={() => go("month")} disabled={!!busy}>
            {busy === "month" ? "One second" : loggedIn ? "Start monthly" : "Sign up, then start monthly"}
          </button>
        </div>
        {yearlyAvailable && (
          <div className="tag-card border-leaf p-6">
            <p className="font-display text-4xl font-semibold text-grove">$60<span className="text-lg font-normal text-muted"> / year</span></p>
            <p className="mt-1 text-sm text-muted">Two months free. Set it and forget it.</p>
            <button className="btn btn-primary mt-5 w-full" onClick={() => go("year")} disabled={!!busy}>
              {busy === "year" ? "One second" : loggedIn ? "Start yearly" : "Sign up, then start yearly"}
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <label htmlFor="promo" className="text-sm text-muted">Have a code?</label>
        <input
          id="promo"
          className="field sm:w-56"
          placeholder="Enter it here"
          value={promo}
          onChange={(e) => setPromo(e.target.value.toUpperCase())}
          autoCapitalize="characters"
        />
      </div>
    </div>
  );
}
