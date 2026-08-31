"use client";
import { useState } from "react";
import { useToast } from "./Toast";

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
      setError("Enter a valid email address.");
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
      toast("You are on the list.", "success");
    } else {
      setError("Something went wrong. Try again.");
    }
  }

  if (done) {
    return (
      <p className="font-medium text-grove">
        You are on the list. You will get an email when they post a new drop.
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
        {busy ? "Joining" : "Get new drop emails"}
      </button>
    </form>
  );
}
