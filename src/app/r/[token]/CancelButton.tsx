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
      toast("Cancelled. Appreciate you letting them know.", "success");
      router.refresh();
    } else {
      toast("Couldn't cancel that. It might be too close to pickup time.", "error");
    }
  }

  return (
    <>
      <button className="btn btn-outline" onClick={() => setOpen(true)}>Can't make it? Cancel</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cancel this reservation?">
        <p className="mb-4">
          Your spot opens right back up for someone else.{hasCardHold ? " The hold on your card releases, so you won't be charged a thing." : ""} The seller gets a heads up too.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-primary grow" onClick={cancel} disabled={busy}>{busy ? "One second" : "Yes, cancel it"}</button>
          <button className="btn btn-outline" onClick={() => setOpen(false)}>Never mind</button>
        </div>
      </Modal>
    </>
  );
}
