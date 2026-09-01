"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { Claim } from "@/lib/types";

export function InventoryControl({
  dropId,
  initialQuantity,
  claimed,
}: {
  dropId: string;
  initialQuantity: number;
  claimed: number;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const available = quantity - claimed;

  async function adjust(delta: number) {
    const next = quantity + delta;
    if (next < claimed || next < 1) return;
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("drops")
      .update({ quantity: next })
      .eq("id", dropId);
    setBusy(false);
    if (error) {
      toast("Couldn't update that count. Try again.", "error");
      return;
    }
    setQuantity(next);
    toast(
      delta < 0
        ? `Got it. ${next - claimed} left to claim online.`
        : `Added. ${next - claimed} left to claim online.`,
      "success"
    );
  }

  return (
    <div className="tag-card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold">What's left to claim online</p>
          <p className="text-sm text-muted">
            Sold a few at your booth already? Pull them out here so nobody
            online reserves what's actually gone. Made a fresh batch? Add
            them right back in.
          </p>
        </div>
        <div
          className="inline-flex items-center gap-1 rounded-full border-2 border-cream-dark bg-white p-1"
          role="group"
          aria-label="Adjust available quantity"
        >
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-xl font-semibold hover:bg-cream-dark"
            onClick={() => adjust(-1)}
            disabled={busy || available <= 0}
            aria-label="Remove one"
          >
            &minus;
          </button>
          <span className="w-14 text-center font-display text-xl font-semibold text-grove" aria-live="polite">
            {available}
          </span>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-xl font-semibold hover:bg-cream-dark"
            onClick={() => adjust(1)}
            disabled={busy}
            aria-label="Add one"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClaimList({
  dropId,
  dropStatus,
  initialClaims,
}: {
  dropId: string;
  dropStatus: "active" | "closed" | "removed";
  initialClaims: Claim[];
}) {
  const [claims, setClaims] = useState(initialClaims);
  const [status, setStatus] = useState<"active" | "closed" | "removed">(dropStatus);
  const [confirmClose, setConfirmClose] = useState(false);
  const [removing, setRemoving] = useState<Claim | null>(null);
  const toast = useToast();

  async function togglePickedUp(claim: Claim) {
    const next = !claim.picked_up;
    setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, picked_up: next } : c)));
    const res = await fetch(`/api/claims/${claim.id}/pickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picked_up: next }),
    });
    if (!res.ok) {
      setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, picked_up: !next } : c)));
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Could not update. Try again.", "error");
      return;
    }
    const data = await res.json();
    if (data.payment_status === "captured") {
      setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, payment_status: "captured", paid: true } : c)));
      toast(claim.delivery === "shipping" ? "Shipped, and the card just went through." : "Picked up, and the card just went through.", "success");
    }
  }

  async function removeClaim(claim: Claim) {
    const res = await fetch(`/api/claims/${claim.id}/remove`, { method: "POST" });
    setRemoving(null);
    if (!res.ok) {
      toast("Couldn't remove that. Try again.", "error");
      return;
    }
    setClaims((cs) => cs.filter((c) => c.id !== claim.id));
    toast(
      `Removed. ${claim.quantity} ${claim.quantity === 1 ? "item is" : "items are"} back up for grabs.`,
      "success"
    );
  }

  async function setDropStatus(next: "active" | "closed") {
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("drops")
      .update({ status: next })
      .eq("id", dropId);
    if (error) toast("Couldn't update the drop. Try again.", "error");
    else {
      setStatus(next);
      toast(next === "closed" ? "Closed up. Nobody can claim anything else." : "Reopened. Back in business.", "success");
    }
    setConfirmClose(false);
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Who's coming</h2>
        {status === "active" ? (
          <button className="btn btn-outline !min-h-11" onClick={() => setConfirmClose(true)}>
            Close drop
          </button>
        ) : (
          <button className="btn btn-grove !min-h-11" onClick={() => setDropStatus("active")}>
            Reopen drop
          </button>
        )}
      </div>

      {claims.length === 0 ? (
        <p className="tag-card mt-4 p-6 text-muted">
          Nobody's claimed anything yet. Get your link out where your buyers
          already are. Most drops start picking up within a few hours.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {claims.map((c, i) => (
            <li key={c.id} className="tag-card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {i + 1}. {c.buyer_name}{" "}
                  <span className="font-normal text-muted">x{c.quantity}</span>
                </p>
                {c.delivery === "shipping" && c.ship_address && (
                  <p className="text-sm">Ship to: {c.ship_address}</p>
                )}
                <p className="text-sm text-muted">
                  <a href={`tel:${c.buyer_phone}`} className="underline">
                    {c.buyer_phone}
                  </a>{" "}
                  {c.method === "cash"
                    ? "Cash at pickup"
                    : c.payment_status === "captured"
                      ? "Paid by card"
                      : c.payment_status === "authorized"
                        ? "Card on hold, charges at pickup"
                        : "Card not completed"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => togglePickedUp(c)}
                  aria-pressed={c.picked_up}
                  className={c.picked_up ? "btn btn-grove !min-h-11" : "btn btn-outline !min-h-11"}
                >
                  {c.delivery === "shipping" ? (c.picked_up ? "Shipped" : "Mark shipped") : c.picked_up ? "Picked up" : "Mark it picked up"}
                </button>
                {!c.picked_up && (
                  <button
                    onClick={() => setRemoving(c)}
                    className="px-2 py-1 text-xs text-muted underline"
                  >
                    Take them off
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Take this reservation off?"
      >
        <p className="mb-4">
          {removing
            ? `${removing.buyer_name}'s reservation for ${removing.quantity} comes off the list and those items open right back up for the next person.${removing.payment_status === "authorized" ? " The hold on their card releases, so they're never charged." : ""} Good for a cancellation, or someone who just didn't show.`
            : ""}
        </p>
        <div className="flex gap-3">
          <button
            className="btn btn-primary grow"
            onClick={() => removing && removeClaim(removing)}
          >
            Take them off
          </button>
          <button className="btn btn-outline" onClick={() => setRemoving(null)}>
            Keep it
          </button>
        </div>
      </Modal>

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Close this drop for good?"
      >
        <p className="mb-4">
          Buyers won't be able to reserve anything new. Whoever's already
          claimed stays claimed, and you can reopen this whenever you want.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-primary grow" onClick={() => setDropStatus("closed")}>
            Close drop
          </button>
          <button className="btn btn-outline" onClick={() => setConfirmClose(false)}>
            Keep it open
          </button>
        </div>
      </Modal>
    </div>
  );
}
