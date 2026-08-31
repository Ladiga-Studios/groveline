"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function CancelButton({ token, hasCardHold }: { token: string; hasCardHold: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function cancel() {
    setBusy(true);
    const res = await fetch(`/api/reservations/${token}/cancel`, { method: "POST" });
    setBusy(false);
    setOpen(false);
    if (res.ok) {
      toast("Cancelled. Thanks for letting the seller know.", "success");
      router.refresh();
    } else {
      toast("Could not cancel. It may be too close to pickup.", "error");
    }
  }

  return (
    <>
      <button className="btn btn-outline" onClick={() => setOpen(true)}>Cancel my reservation</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cancel this reservation?">
        <p className="mb-4">
          Your items go back up for someone else.{hasCardHold ? " The hold on your card is released, you will not be charged." : ""} The seller gets a heads up.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-primary grow" onClick={cancel} disabled={busy}>{busy ? "Cancelling" : "Yes, cancel it"}</button>
          <button className="btn btn-outline" onClick={() => setOpen(false)}>Keep it</button>
        </div>
      </Modal>
    </>
  );
}
