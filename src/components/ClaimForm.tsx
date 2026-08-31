"use client";
import { useRef, useState } from "react";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import type { Drop } from "@/lib/types";
import { money, pickupWindow } from "@/lib/format";
import { useToast } from "./Toast";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => string;
    };
  }
}

type Errors = Partial<Record<"name" | "phone" | "email", string>>;

export default function ClaimForm({
  drop,
  acceptsCard,
  prefill,
}: {
  drop: Drop;
  acceptsCard: boolean;
  prefill?: { name?: string; email?: string };
}) {
  const left = drop.quantity - drop.claimed;
  const soldOut = left <= 0 || drop.status !== "active";
  const maxQty = Math.min(left, drop.max_per_buyer ?? left);

  const [qty, setQty] = useState(1);
  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [company, setCompany] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [claim, setClaim] = useState<{ position: number; token: string } | null>(null);
  const toast = useToast();

  function renderTurnstile() {
    if (TURNSTILE_SITE_KEY && turnstileRef.current && window.turnstile) {
      window.turnstile.render(turnstileRef.current, { sitekey: TURNSTILE_SITE_KEY, callback: setTurnstileToken });
    }
  }

  function validate(): boolean {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Enter your name.";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Enter a 10 digit phone number.";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = "That email does not look right.";
    if (method === "card" && !email) next.email = "Email is needed for a card receipt.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drop_id: drop.id,
        quantity: qty,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        method,
        company,
        renderedAt,
        turnstileToken,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setBusy(false);
      setClaim({ position: data.position, token: data.token });
      toast("Reserved. See you at pickup.", "success");
      return;
    }
    setBusy(false);
    if (res.status === 409) toast("Not enough left. Refresh to see what is available.", "error");
    else if (res.status === 403) toast("Could not verify you're not a robot. Refresh and try again.", "error");
    else {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Could not reserve. Try again.", "error");
    }
  }

  if (claim) {
    return (
      <div className="tag-card p-6" role="status">
        <p className="font-display text-2xl font-semibold text-grove">You are number {claim.position}.</p>
        <p className="mt-2">
          {qty} {qty === 1 ? "item" : "items"} reserved under <span className="font-semibold">{name}</span>. Pay cash at pickup.
        </p>
        <p className="mt-2">
          Pickup is {pickupWindow(drop.pickup_start, drop.pickup_end)} at <span className="font-semibold">{drop.pickup_place}</span>.
        </p>
        <p className="mt-3 text-sm text-muted">
          Give your name at the table and you are set.{email ? " We emailed you the details." : ""}
        </p>
        <Link href={`/r/${claim.token}`} className="btn btn-outline mt-4">
          View or cancel my reservation
        </Link>
      </div>
    );
  }

  if (soldOut) return <WaitlistForm dropId={drop.id} />;

  return (
    <form onSubmit={submit} className="tag-card flex flex-col gap-4 p-6" noValidate>
      <div>
        <span className="field-label" id="qty-label">How many</span>
        <div className="inline-flex items-center gap-1 rounded-full border-2 border-cream-dark bg-white p-1" role="group" aria-labelledby="qty-label">
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-xl font-semibold hover:bg-cream-dark" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Fewer" disabled={qty <= 1}>&minus;</button>
          <span className="w-10 text-center text-lg font-semibold" aria-live="polite">{qty}</span>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-xl font-semibold hover:bg-cream-dark" onClick={() => setQty(Math.min(maxQty, qty + 1))} aria-label="More" disabled={qty >= maxQty}>+</button>
        </div>
        {drop.max_per_buyer && <p className="field-hint">Limit {drop.max_per_buyer} per person.</p>}
      </div>

      <div>
        <label htmlFor="claim-name" className="field-label">Your name</label>
        <input id="claim-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="claim-phone" className="field-label">Phone number</label>
        <input id="claim-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" aria-invalid={!!errors.phone} />
        {errors.phone && <p className="field-error">{errors.phone}</p>}
        <p className="field-hint">So the seller can reach you if plans change.</p>
      </div>

      <div>
        <label htmlFor="claim-email" className="field-label">
          Email <span className="font-normal text-muted">{method === "card" ? "(for your receipt)" : "(optional)"}</span>
        </label>
        <input id="claim-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
        {errors.email && <p className="field-error">{errors.email}</p>}
        <p className="field-hint">We will email your pickup details and a reminder.</p>
      </div>

      {acceptsCard && (
        <fieldset>
          <legend className="field-label">How you will pay</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["cash", "card"] as const).map((m) => (
              <label key={m} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${method === m ? "border-leaf bg-cream" : "border-cream-dark bg-white"}`}>
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="mt-1 accent-[#1e4d2b]" />
                <span>
                  <span className="block font-semibold">{m === "cash" ? "Cash at pickup" : "Card now"}</span>
                  <span className="block text-sm text-muted">
                    {m === "cash" ? "Bring exact change if you can." : "A hold goes on your card. You are only charged when you pick up."}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="hp-field" aria-hidden="true">
        <label htmlFor="claim-company">Company</label>
        <input id="claim-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer onLoad={renderTurnstile} />
          <div ref={turnstileRef} />
        </>
      )}

      <button className="btn btn-primary w-full text-lg" disabled={busy || (!!TURNSTILE_SITE_KEY && !turnstileToken)}>
        {busy ? "Reserving" : method === "card" ? `Reserve and hold ${money(drop.price_cents * qty)}` : `Reserve ${qty} for ${money(drop.price_cents * qty)}`}
      </button>
      <p className="text-center text-sm text-muted">
        {acceptsCard ? "No account needed. Cancel any time before pickup." : "Pay cash at pickup. No account needed."}
      </p>
    </form>
  );
}

function WaitlistForm({ dropId }: { dropId: string }) {
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a 10 digit phone number.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_id: dropId, phone: phone.trim() }),
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError("Could not join the waitlist. Try again.");
  }

  if (done) {
    return (
      <div className="tag-card p-6" role="status">
        <p className="font-semibold text-grove">You are on the waitlist.</p>
        <p className="mt-1 text-sm">If more becomes available, the seller can let you know.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="tag-card flex flex-col gap-3 p-6" noValidate>
      <Image src="/illustrations/basket.jpg" alt="" width={1254} height={1254} className="mx-auto h-24 w-auto" />
      <p className="text-center font-display text-xl font-semibold">This drop is sold out.</p>
      <p className="text-sm text-muted">Leave your number and the seller can reach you if more opens up.</p>
      <div>
        <label htmlFor="wl-phone" className="field-label">Phone number</label>
        <input id="wl-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" aria-invalid={!!error} />
        {error && <p className="field-error">{error}</p>}
      </div>
      <button className="btn btn-grove" disabled={busy}>{busy ? "Joining" : "Join the waitlist"}</button>
    </form>
  );
}
