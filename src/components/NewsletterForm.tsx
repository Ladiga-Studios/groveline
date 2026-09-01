"use client";
import { useState } from "react";
import { useToast } from "./Toast";
import Sprout from "./Sprout";

export default function NewsletterForm({ sellerId }: { sellerId: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("That email doesn't quite look right.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_id: sellerId, email }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      toast("You're in.", "success");
    } else {
      setError("That didn't go through. Mind trying again?");
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 font-medium text-grove">
        <Sprout size={20} className="text-leaf" />
        You&apos;re on the list. We&apos;ll email you the moment something new goes up.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" noValidate>
      <div className="grow">
        <label htmlFor="nl-email" className="sr-only">
          Email address
        </label>
        <input
          id="nl-email"
          type="email"
          className="field"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {error && <p className="field-error">{error}</p>}
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "One second" : "Get new drop emails"}
      </button>
    </form>
  );
}
