"use client";
import { useRef, useState } from "react";
import Script from "next/script";
import { useToast } from "@/components/Toast";
import Sprout from "@/components/Sprout";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function SupportForm({ prefill }: { prefill?: { name?: string; email?: string } }) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [topic, setTopic] = useState("question");
  const [message, setMessage] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const toast = useToast();

  function renderTurnstile() {
    if (TURNSTILE_SITE_KEY && turnstileRef.current && window.turnstile) {
      window.turnstile.render(turnstileRef.current, { sitekey: TURNSTILE_SITE_KEY, callback: setTurnstileToken });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Let us know your name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("That email doesn't quite look right.");
    if (message.trim().length < 10) return setError("Tell us a little more so we can actually help.");
    setBusy(true);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, topic, message, renderedAt, turnstileToken }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "That didn't send. Try again in a moment.");
    setSent(true);
    toast("Sent. We'll get back to you.", "success");
  }

  if (sent) {
    return (
      <div className="tag-card p-6" role="status">
        <div className="flex items-center gap-2">
          <Sprout size={22} className="text-leaf" />
          <p className="font-display text-xl font-semibold text-grove">Got it.</p>
        </div>
        <p className="mt-2">We read every message and reply by email, usually within a day. Check your spam folder if you don&apos;t see anything.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="tag-card flex flex-col gap-4 p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sp-name" className="field-label">Your name</label>
          <input id="sp-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="sp-email" className="field-label">Email to reply to</label>
          <input id="sp-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
      </div>
      <div>
        <label htmlFor="sp-topic" className="field-label">What is it about</label>
        <select id="sp-topic" className="field" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="question">A question</option>
          <option value="order">A problem with an order</option>
          <option value="account">My account or billing</option>
          <option value="payments">Card payments or payouts</option>
          <option value="bug">Something is broken</option>
          <option value="idea">An idea</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div>
        <label htmlFor="sp-message" className="field-label">What's going on</label>
        <textarea id="sp-message" className="field min-h-36" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="The more detail the better. If it's about a drop, paste the link." />
      </div>
      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer onLoad={renderTurnstile} />
          <div ref={turnstileRef} />
        </>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy || (!!TURNSTILE_SITE_KEY && !turnstileToken)}>
        {busy ? "Sending" : "Send it"}
      </button>
    </form>
  );
}
