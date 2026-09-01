"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { Claim } from "@/lib/types";
import { formatPhone } from "@/lib/format";

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
  const router = useRouter();
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
    // The batch size and the counts at the top of the page come from the
    // server, so re-read them or they sit there contradicting this control.
    router.refresh();
    toast(
      delta < 0
        ? `Batch is ${next} now. ${next - claimed} still up for grabs.`
        : `Batch is ${next} now. ${next - claimed} up for grabs.`,
      "success"
    );
  }

  return (
    <div className="tag-card p-5">
      <p className="font-semibold">Batch size</p>
      <p className="mt-0.5 text-sm text-muted">
        Sold some at your booth? Take them off so nobody online reserves
        what&apos;s gone. Made more? Add them back.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex items-center gap-1 rounded-full border-2 border-cream-dark bg-white p-1"
          role="group"
          aria-label="Adjust batch size"
        >
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-xl font-semibold hover:bg-cream-dark disabled:opacity-40"
            onClick={() => adjust(-1)}
            disabled={busy || quantity <= claimed || quantity <= 1}
            aria-label="One fewer"
          >
            &minus;
          </button>
          <span className="w-12 text-center font-display text-xl font-semibold text-grove" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-xl font-semibold hover:bg-cream-dark disabled:opacity-40"
            onClick={() => adjust(1)}
            disabled={busy}
            aria-label="One more"
          >
            +
          </button>
        </div>
        <p className={`text-sm font-semibold ${available > 0 ? "text-grove" : "text-muted"}`}>
          {available > 0 ? `${available} still up for grabs` : "All spoken for"}
        </p>
      </div>
      {quantity <= claimed && (
        <p className="field-hint">
          Can&apos;t go below {claimed}, that&apos;s how many are already reserved. Take a
          reservation off the list first.
        </p>
      )}
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
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [shipping, setShipping] = useState<Claim | null>(null);
  const [tracking, setTracking] = useState("");
  const [refunding, setRefunding] = useState<Claim | null>(null);
  const [removing, setRemoving] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function togglePickedUp(claim: Claim, trk?: string) {
    const next = !claim.picked_up;
    if (next && claim.delivery === "shipping" && trk === undefined) {
      setTracking("");
      setShipping(claim);
      return;
    }
    setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, picked_up: next } : c)));
    const res = await fetch(`/api/claims/${claim.id}/pickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picked_up: next, ...(trk !== undefined ? { tracking: trk } : {}) }),
    });
    if (!res.ok) {
      setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, picked_up: !next } : c)));
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Could not update. Try again.", "error");
      return;
    }
    const data = await res.json();
    setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, picked_up_at: next ? new Date().toISOString() : null } : c)));
    if (trk !== undefined) setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, tracking: trk || null } : c)));
    if (next && data.payment_status === "captured" && claim.payment_status !== "captured") {
      setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, payment_status: "captured", paid: true } : c)));
      toast(claim.delivery === "shipping" ? "Shipped, and the card just went through." : "Picked up, and the card just went through.", "success");
    } else if (!next) {
      toast("Undone. Back on the list.", "success");
    }
  }

  /* A pickup that charged the card can't be un-marked; refund is the way
     back from a mistake there. Everything else can be undone. */
  function canUndo(c: Claim) {
    return !(c.payment_status === "captured" && c.capture_mode === "manual");
  }

  async function cancelDrop() {
    setBusy(true);
    const res = await fetch(`/api/drops/${dropId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || "Couldn't cancel. Try again.", "error");
      return;
    }
    setCancelOpen(false);
    setStatus("closed");
    setClaims((cs) => cs.map((c) => (c.picked_up ? c : { ...c, cancelled_at: new Date().toISOString() })).filter((c) => !c.cancelled_at));
    const stuck: string[] = data.stuck ?? [];
    if (stuck.length > 0) {
      toast(
        `Cancelled, but Stripe wouldn't undo the payment for ${stuck.join(", ")}. Settle those in your Stripe dashboard.`,
        "error"
      );
      return;
    }
    toast(`Cancelled. ${data.notified} ${data.notified === 1 ? "buyer" : "buyers"} emailed${data.refunded ? `, ${data.refunded} refunded` : ""}${data.released ? `, ${data.released} ${data.released === 1 ? "hold" : "holds"} released` : ""}.`, "success");
  }

  async function refund(claim: Claim) {
    setBusy(true);
    const res = await fetch(`/api/claims/${claim.id}/refund`, { method: "POST" });
    setBusy(false);
    setRefunding(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || "Couldn't refund.", "error");
      return;
    }
    setClaims((cs) => cs.map((c) => (c.id === claim.id ? { ...c, payment_status: "refunded" } : c)));
    toast("Refunded. They'll see it in a few days.", "success");
  }

  async function removeClaim(claim: Claim) {
    const res = await fetch(`/api/claims/${claim.id}/remove`, { method: "POST" });
    setRemoving(null);
    if (!res.ok) {
      toast("Couldn't remove that. Try again.", "error");
      return;
    }
    setClaims((cs) => cs.filter((c) => c.id !== claim.id));
    // Frees inventory back up, so the counts above need a re-read.
    router.refresh();
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

  const done = claims.filter((c) => c.picked_up).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Who's coming</h2>
          {claims.length > 0 && (
            <p className="text-sm text-muted" aria-live="polite">
              {done} of {claims.length} handed out{done === claims.length ? ". All done." : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {status === "active" && claims.length > 0 && (
            <button className="px-2 py-1 text-sm text-muted underline" onClick={() => { setCancelReason(""); setCancelOpen(true); }}>
              Cancel drop
            </button>
          )}
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
      </div>

      {claims.length === 0 ? (
        <p className="tag-card mt-4 p-6 text-muted">
          Nobody's claimed anything yet. Get your link out where your buyers
          already are. Most drops start picking up within a few hours.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {claims.map((c, i) => (
            <li
              key={c.id}
              className={`tag-card flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${c.picked_up ? "border-leaf/40 bg-cream" : ""}`}
            >
              <div className="flex min-w-0 gap-3">
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${c.picked_up ? "bg-grove text-cream" : "bg-cream-dark text-ink"}`}
                  aria-hidden="true"
                >
                  {c.picked_up ? (
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2.5 7.5 L5.5 10.5 L11.5 4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0">
                  <p className={`font-semibold ${c.picked_up ? "text-muted" : ""}`}>
                    {c.buyer_name}{" "}
                    <span className="font-normal text-muted">x{c.quantity}</span>
                  </p>
                  {c.delivery === "shipping" && c.ship_address && (
                    <p className="text-sm">Ship to: {c.ship_address}</p>
                  )}
                  <p className="text-sm text-muted">
                    <a href={`tel:${c.buyer_phone.replace(/\D/g, "")}`} className="underline">
                      {formatPhone(c.buyer_phone)}
                    </a>{" "}
                    {c.method === "cash"
                      ? "Cash at pickup"
                      : c.payment_status === "captured"
                        ? c.capture_mode === "automatic" && !c.picked_up ? "Paid by card, refundable until pickup" : "Paid by card"
                        : c.payment_status === "authorized"
                          ? "Card on hold, charges at pickup"
                          : c.payment_status === "refunded"
                            ? "Refunded"
                            : "Card not completed"}
                    {c.tracking ? ` · Tracking ${c.tracking}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
                {c.picked_up ? (
                  <p className="inline-flex min-h-11 items-center gap-2 rounded-full bg-grove px-4 font-semibold text-cream">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5 L5.5 10.5 L11.5 4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {c.delivery === "shipping" ? "Shipped" : "Picked up"}
                    {c.picked_up_at && (
                      <span className="text-sm font-normal text-cream/80">
                        {new Date(c.picked_up_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                  </p>
                ) : (
                  <button
                    onClick={() => togglePickedUp(c)}
                    className="btn btn-outline !min-h-11 grow sm:grow-0"
                  >
                    {c.delivery === "shipping" ? "Mark shipped" : "Mark it picked up"}
                  </button>
                )}
                <div className="flex gap-3">
                  {c.picked_up && canUndo(c) && (
                    <button onClick={() => togglePickedUp(c)} className="px-2 py-1 text-xs text-muted underline">
                      Undo
                    </button>
                  )}
                  {!c.picked_up && (
                    <button onClick={() => setRemoving(c)} className="px-2 py-1 text-xs text-muted underline">
                      Take them off
                    </button>
                  )}
                  {c.payment_status === "captured" && (
                    <button onClick={() => setRefunding(c)} className="px-2 py-1 text-xs text-muted underline">
                      Refund
                    </button>
                  )}
                </div>
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

      <Modal open={!!shipping} onClose={() => setShipping(null)} title="Mark this one shipped?">
        <p className="mb-3">
          {shipping ? `${shipping.buyer_name}'s order of ${shipping.quantity} goes out.${shipping.payment_status === "authorized" ? " Their card is charged now." : ""}${shipping.buyer_email ? " They get an email, with the tracking number if you add one." : ""}` : ""}
        </p>
        <label htmlFor="tracking" className="field-label">Tracking number <span className="font-normal text-muted">(optional)</span></label>
        <input id="tracking" className="field" value={tracking} onChange={(e) => setTracking(e.target.value)} autoComplete="off" placeholder="9400 1000 0000 0000 0000 00" />
        <div className="mt-4 flex gap-3">
          <button
            className="btn btn-primary grow"
            onClick={() => {
              if (!shipping) return;
              const c = shipping;
              setShipping(null);
              togglePickedUp(c, tracking.trim());
            }}
          >
            Mark shipped
          </button>
          <button className="btn btn-outline" onClick={() => setShipping(null)}>
            Not yet
          </button>
        </div>
      </Modal>

      <Modal open={!!refunding} onClose={() => setRefunding(null)} title="Refund this card payment?">
        <p className="mb-4">
          {refunding ? `${refunding.buyer_name} gets ${refunding.quantity === 1 ? "the full amount" : "the full amount for all " + refunding.quantity} back on their card. It usually shows up in a few business days. Their spot on the list stays as it is.` : ""}
        </p>
        <div className="flex gap-3">
          <button className="btn btn-primary grow" onClick={() => refunding && refund(refunding)} disabled={busy}>
            {busy ? "One second" : "Refund it"}
          </button>
          <button className="btn btn-outline" onClick={() => setRefunding(null)}>
            Keep it
          </button>
        </div>
      </Modal>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel the whole drop?">
        <p className="mb-3">
          Every open reservation comes off, every card hold or charge is undone, and every buyer gets an email with your reason. Anything already handed out stays as is. This can't be undone.
        </p>
        <label htmlFor="cancel-reason" className="field-label">Tell buyers why</label>
        <textarea
          id="cancel-reason"
          className="field min-h-24"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="The oven died. Next batch is Saturday."
          maxLength={300}
        />
        <div className="mt-4 flex gap-3">
          <button className="btn btn-primary grow" onClick={cancelDrop} disabled={busy || cancelReason.trim().length < 5}>
            {busy ? "Cancelling" : "Cancel the drop"}
          </button>
          <button className="btn btn-outline" onClick={() => setCancelOpen(false)}>
            Keep it
          </button>
        </div>
      </Modal>
    </div>
  );
}
