"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";

/* Emails followers and subscribers about a change to this drop. Once an hour, tops. */
export default function NotifyFollowersButton({ slug, className = "btn btn-outline" }: { slug: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function send() {
    setBusy(true);
    const res = await fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind: "update" }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast(data.sent ? `Sent. ${data.sent} ${data.sent === 1 ? "person heard" : "people heard"} about it.` : "Nobody to tell just yet.", "success");
    else toast(data.error || "That didn't send. Try again shortly.", "error");
  }
  return (
    <button onClick={send} disabled={busy} className={className}>
      {busy ? "Sending" : "Let my followers know"}
    </button>
  );
}
