"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";

/* Emails followers and subscribers about a change to this drop. Once an hour, tops. */
export default function NotifyFollowersButton({ slug }: { slug: string }) {
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
    if (res.ok) toast(data.sent ? `Emailed ${data.sent} ${data.sent === 1 ? "person" : "people"}.` : "Nobody to email yet.", "success");
    else toast(data.error || "Could not send.", "error");
  }
  return (
    <button onClick={send} disabled={busy} className="btn btn-outline">
      {busy ? "Sending" : "Email my followers"}
    </button>
  );
}
