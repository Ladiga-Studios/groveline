"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

/* Deleting a shop takes its drops, reservations, followers, and email list
   with it, so the confirmation asks for the shop's name rather than a
   plain yes. Typing the name is slow enough to interrupt a mistake. */
export default function DeleteShop({
  shopId,
  shopName,
  openDrops,
}: {
  shopId: string;
  shopName: string;
  openDrops: number;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/shops/${shopId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: typed }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast(data.error || "That didn't delete. Try again.", "error");
      return;
    }
    setOpen(false);
    toast(`${shopName} is gone.`, "success");
    router.push("/dashboard/shops");
    router.refresh();
  }

  const matches = typed.trim().toLowerCase() === shopName.trim().toLowerCase();

  return (
    <section className="tag-card mt-8 border-2 border-clay/40 p-6">
      <h2 className="text-lg font-semibold">Delete this shop</h2>
      <p className="mt-1 text-sm text-muted">
        This takes the shop&apos;s drops, its followers, and its email list with it, and it can&apos;t be
        undone.{" "}
        {openDrops > 0
          ? `You have ${openDrops} ${openDrops === 1 ? "drop" : "drops"} still open. Anyone holding a reservation gets cancelled, refunded if they paid by card, and emailed about it.`
          : "Nothing is currently reserved."}
      </p>
      <button className="btn btn-outline mt-4" onClick={() => { setTyped(""); setOpen(true); }}>
        Delete this shop
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Delete ${shopName}?`}>
        <p className="mb-4">
          Everything under this shop goes: its drops, the reservations on them, its followers, and its
          email list. Anything already handed out stays in your Stripe records.{" "}
          {openDrops > 0 ? "Open reservations are cancelled and refunded first, and those buyers are emailed." : ""}{" "}
          This can&apos;t be undone.
        </p>
        <label htmlFor="confirm-shop" className="field-label">
          Type <span className="font-semibold">{shopName}</span> to confirm
        </label>
        <input
          id="confirm-shop"
          className="field"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
        <div className="mt-4 flex gap-3">
          <button className="btn btn-primary grow" onClick={remove} disabled={busy || !matches}>
            {busy ? "Deleting" : "Delete it"}
          </button>
          <button className="btn btn-outline" onClick={() => setOpen(false)}>
            Keep it
          </button>
        </div>
      </Modal>
    </section>
  );
}
