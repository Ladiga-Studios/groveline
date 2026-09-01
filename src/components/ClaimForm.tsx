"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { STATES } from "@/lib/states";
import type { Drop } from "@/lib/types";
import { money, pickupWindow, formatPhone } from "@/lib/format";
import { captureModeFor } from "@/lib/payments";
import { MIN_AGE } from "@/lib/policy";
import { useToast } from "./Toast";
import Sprout from "./Sprout";

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
  const chargeNow = captureModeFor(drop.pickup_end) === "automatic";

  const [qty, setQty] = useState(1);
  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const shipOnly = drop.fulfillment === "shipping";
  const canShip = drop.fulfillment === "both" || shipOnly;
  const [delivery, setDelivery] = useState<"pickup" | "shipping">(shipOnly ? "shipping" : "pickup");
  const [method, setMethod] = useState<"cash" | "card">(shipOnly ? "card" : "cash");
  const [ship, setShip] = useState({ line1: "", city: "", state: "AL", zip: "" });
  const [agreed, setAgreed] = useState(false);
  const [ofAge, setOfAge] = useState(false);
  const [company, setCompany] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [claim, setClaim] = useState<{ position: number; token: string } | null>(null);
  const toast = useToast();
  const router = useRouter();

  function renderTurnstile() {
    if (TURNSTILE_SITE_KEY && turnstileRef.current && window.turnstile) {
      window.turnstile.render(turnstileRef.current, { sitekey: TURNSTILE_SITE_KEY, callback: setTurnstileToken });
    }
  }

  function validate(): boolean {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Let us know your name.";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "That phone number looks a digit short.";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = "That email doesn't quite look right.";
    if ((method === "card" || delivery === "shipping") && !email) next.email = "We need an email for your card receipt.";
    setErrors(next);
    if (delivery === "shipping" && (ship.line1.trim().length < 4 || ship.city.trim().length < 2 || ship.zip.trim().length < 5)) {
      toast("Looks like the shipping address needs a bit more.", "error");
      return false;
    }
    if (!ofAge) {
      toast(`You need to be ${MIN_AGE} or older to reserve.`, "error");
      return false;
    }
    if (!agreed) {
      toast("Give the terms a quick check to reserve.", "error");
      return false;
    }
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
        method: delivery === "shipping" ? "card" : method,
        delivery,
        shipAddress: delivery === "shipping" ? `${ship.line1.trim()}, ${ship.city.trim()}, ${ship.state} ${ship.zip.trim()}` : "",
        acceptedTerms: agreed,
        confirmedAge: ofAge,
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
      toast("You're in. See you soon.", "success");
      router.refresh();
      return;
    }
    setBusy(false);
    if (res.status === 409) toast("Somebody just beat you to the last one. Refresh to see what's left.", "error");
    else if (res.status === 403) toast("Couldn't confirm you're human. Refresh and give it another go.", "error");
    else {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "That didn't go through. Try again in a moment.", "error");
    }
  }

  if (claim) {
    return (
      <div className="tag-card p-6" role="status">
        <div className="flex items-center gap-2">
          <Sprout size={24} className="text-leaf" />
          <p className="font-display text-2xl font-semibold text-grove">You're number {claim.position}.</p>
        </div>
        <p className="mt-3">
          {qty} {qty === 1 ? "item" : "items"} reserved under <span className="font-semibold">{name}</span>.{" "}
          {method === "card" ? "Your card is on hold and only charged at pickup." : "Pay cash when you pick up."}
        </p>
        <p className="mt-2">
          Pickup is {pickupWindow(drop.pickup_start, drop.pickup_end)} at <span className="font-semibold">{drop.pickup_place}</span>.
        </p>
        <p className="mt-3 text-sm text-muted">
          Just give your name at the table and you're all set.{email ? " We sent the details to your email too." : ""}
        </p>
        <Link href={`/r/${claim.token}`} className="btn btn-outline mt-4">
          View or cancel this reservation
        </Link>
      </div>
    );
  }

  if (soldOut) return <WaitlistForm dropId={drop.id} />;

  return (
    <form onSubmit={submit} className="tag-card flex flex-col gap-4 p-5 sm:p-6" noValidate aria-labelledby="reserve-heading">
      <div>
        <h2 id="reserve-heading" className="text-xl font-semibold">Reserve yours</h2>
        <p className="mt-0.5 text-sm text-muted">Name and number, that's it. About fifteen seconds.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="field-label !mb-0" id="qty-label">How many</span>
          <p className="text-sm text-muted">
            {maxQty} available{drop.max_per_buyer ? `, up to ${drop.max_per_buyer} each` : ""}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border-2 border-cream-dark bg-white p-1" role="group" aria-labelledby="qty-label">
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-xl font-semibold hover:bg-cream-dark" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Fewer" disabled={qty <= 1}>&minus;</button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n)) setQty(Math.min(maxQty, Math.max(1, n)));
            }}
            aria-labelledby="qty-label"
            className="w-14 border-0 bg-transparent text-center text-lg font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-xl font-semibold hover:bg-cream-dark" onClick={() => setQty(Math.min(maxQty, qty + 1))} aria-label="More" disabled={qty >= maxQty}>+</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div>
          <label htmlFor="claim-name" className="field-label">Your name</label>
          <input id="claim-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="claim-phone" className="field-label">Phone</label>
          <input id="claim-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} autoComplete="tel" inputMode="tel" placeholder="256-555-0100" aria-invalid={!!errors.phone} />
          {errors.phone && <p className="field-error">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="claim-email" className="field-label">
          Email <span className="font-normal text-muted">{method === "card" || delivery === "shipping" ? "(for your receipt)" : "(optional)"}</span>
        </label>
        <input id="claim-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
        {errors.email && <p className="field-error">{errors.email}</p>}
        <p className="field-hint">Pickup details now, a reminder the day before.</p>
      </div>

      {canShip && !shipOnly && (
        <fieldset>
          <legend className="field-label">How do you want it</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["pickup", "shipping"] as const).map((d) => (
              <label key={d} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${delivery === d ? "border-leaf bg-cream" : "border-cream-dark bg-white"}`}>
                <input type="radio" name="delivery" value={d} checked={delivery === d} onChange={() => { setDelivery(d); if (d === "shipping") setMethod("card"); }} className="mt-1 accent-[#1e4d2b]" />
                <span>
                  <span className="block font-semibold">{d === "pickup" ? "I'll pick it up" : `Ship it to me${drop.shipping_cents ? `, +${money(drop.shipping_cents)}` : ""}`}</span>
                  <span className="block text-sm text-muted">{d === "pickup" ? pickupWindow(drop.pickup_start, drop.pickup_end) : chargeNow ? "Paid by card now, refunded if the seller can't ship." : "Paid by card, only charged once it's on its way."}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {delivery === "shipping" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="field-label">Where should it go</legend>
          <input className="field" placeholder="Street address" value={ship.line1} onChange={(e) => setShip({ ...ship, line1: e.target.value })} autoComplete="street-address" aria-label="Street address" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <input className="field col-span-2 sm:col-span-3" placeholder="City" value={ship.city} onChange={(e) => setShip({ ...ship, city: e.target.value })} autoComplete="address-level2" aria-label="City" />
            <select className="field col-span-1 sm:col-span-2" value={ship.state} onChange={(e) => setShip({ ...ship, state: e.target.value })} aria-label="State">
              {STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
            <input className="field col-span-1" placeholder="Zip" value={ship.zip} onChange={(e) => setShip({ ...ship, zip: e.target.value })} inputMode="numeric" autoComplete="postal-code" aria-label="Zip" />
          </div>
        </fieldset>
      )}

      {acceptsCard && delivery === "pickup" && (
        <fieldset>
          <legend className="field-label">How do you want to pay</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["cash", "card"] as const).map((m) => (
              <label key={m} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${method === m ? "border-leaf bg-cream" : "border-cream-dark bg-white"}`}>
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="mt-1 accent-[#1e4d2b]" />
                <span>
                  <span className="block font-semibold">{m === "cash" ? "Cash when I pick up" : "Card, right now"}</span>
                  <span className="block text-sm text-muted">
                    {m === "cash"
                      ? "Exact change is always appreciated."
                      : chargeNow
                        ? "Charged now since pickup is over a week out. Refunded in full if you or the seller cancel before then."
                        : "We place a hold now. You're only actually charged at pickup."}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-2.5 border-t border-cream-dark pt-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={ofAge} onChange={(e) => setOfAge(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1e4d2b]" />
          <span>I&apos;m {MIN_AGE} or older.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1e4d2b]" />
          <span>
            Reserving means I&apos;m actually planning to come. I agree to the{" "}
            <Link href="/terms" className="text-grove underline" target="_blank">terms</Link> and{" "}
            <Link href="/privacy" className="text-grove underline" target="_blank">privacy policy</Link>.
          </span>
        </label>
      </div>

      {/* Trap for bots that fill every field. Named so browsers never
          autofill it: no "company", "name", "email", or anything else
          autofill recognizes. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="gl-leave-blank">Leave this blank</label>
        <input id="gl-leave-blank" name="gl_leave_blank" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer onLoad={renderTurnstile} />
          <div ref={turnstileRef} />
        </>
      )}

      <button className="btn btn-primary w-full text-lg" disabled={busy || (!!TURNSTILE_SITE_KEY && !turnstileToken)}>
        {busy
          ? "Hang on"
          : delivery === "shipping"
            ? `Reserve and hold ${money(drop.price_cents * qty + (drop.shipping_cents || 0))}`
            : method === "card"
              ? `Reserve and hold ${money(drop.price_cents * qty)}`
              : `Reserve ${qty} for ${money(drop.price_cents * qty)}`}
      </button>
      <p className="text-center text-sm text-muted">
        {acceptsCard ? "No account needed, and you can cancel any time before pickup." : "Pay with cash at pickup. No account needed."}
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
      setError("That number looks a digit short.");
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
    else setError("That didn't go through. Give it another try.");
  }

  if (done) {
    return (
      <div className="tag-card p-6" role="status">
        <p className="font-semibold text-grove">You're on the list.</p>
        <p className="mt-1 text-sm">If more turns up, the seller will reach out and let you know.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="tag-card flex flex-col gap-3 p-6" noValidate>
      <Image src="/illustrations/basket.jpg" alt="" width={1254} height={1254} className="mx-auto h-24 w-auto" />
      <p className="text-center font-display text-xl font-semibold">This one's sold out.</p>
      <p className="text-sm text-muted">Leave your number and the seller can reach out if more comes available.</p>
      <div>
        <label htmlFor="wl-phone" className="field-label">Phone number</label>
        <input id="wl-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="256-555-0100" aria-invalid={!!error} />
        {error && <p className="field-error">{error}</p>}
      </div>
      <button className="btn btn-grove" disabled={busy}>{busy ? "One second" : "Join the waitlist"}</button>
    </form>
  );
}
