"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function TakeDownButton({ dropId }: { dropId: string }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const router = useRouter();
  async function go() {
    const res = await fetch(`/api/admin/drops/${dropId}/remove`, { method: "POST" });
    setOpen(false);
    toast(res.ok ? "Taken down." : "Could not take it down.", res.ok ? "success" : "error");
    router.refresh();
  }
  return (
    <>
      <button className="btn btn-outline !min-h-10 !px-4 text-sm" onClick={() => setOpen(true)}>Take down</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Take this listing down?">
        <p className="mb-4">It disappears from browse and the link stops working. Existing reservations stay on the seller's dashboard.</p>
        <div className="flex gap-3">
          <button className="btn btn-primary grow" onClick={go}>Take it down</button>
          <button className="btn btn-outline" onClick={() => setOpen(false)}>Leave it</button>
        </div>
      </Modal>
    </>
  );
}
