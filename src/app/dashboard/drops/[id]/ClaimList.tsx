"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { Claim } from "@/lib/types";

export default function ClaimList({
  dropId,
  dropStatus,
  initialClaims,
}: {
  dropId: string;
  dropStatus: "active" | "closed";
  initialClaims: Claim[];
}) {
  const [claims, setClaims] = useState(initialClaims);
  const [status, setStatus] = useState(dropStatus);
  const [confirmClose, setConfirmClose] = useState(false);
  const toast = useToast();

  async function togglePickedUp(claim: Claim) {
    const supabase = supabaseBrowser();
    const next = !claim.picked_up;
    setClaims((cs) =>
      cs.map((c) => (c.id === claim.id ? { ...c, picked_up: next } : c))
    );
    const { error } = await supabase
      .from("claims")
      .update({ picked_up: next })
      .eq("id", claim.id);
    if (error) {
      setClaims((cs) =>
        cs.map((c) => (c.id === claim.id ? { ...c, picked_up: !next } : c))
      );
      toast("Could not update. Try again.", "error");
    }
  }

  async function setDropStatus(next: "active" | "closed") {
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("drops")
      .update({ status: next })
      .eq("id", dropId);
    if (error) toast("Could not update the drop.", "error");
    else {
      setStatus(next);
      toast(next === "closed" ? "Drop closed." : "Drop reopened.", "success");
    }
    setConfirmClose(false);
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Claims</h2>
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
          No claims yet. Share your link where your buyers already are. Most
          claims come in within a few hours of posting.
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
                <p className="text-sm text-muted">
                  <a href={`tel:${c.buyer_phone}`} className="underline">
                    {c.buyer_phone}
                  </a>{" "}
                  {c.method === "cash" ? "Cash at pickup" : c.paid ? "Paid by card" : "Card pending"}
                </p>
              </div>
              <button
                onClick={() => togglePickedUp(c)}
                aria-pressed={c.picked_up}
                className={c.picked_up ? "btn btn-grove !min-h-11" : "btn btn-outline !min-h-11"}
              >
                {c.picked_up ? "Picked up" : "Mark picked up"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Close this drop?"
      >
        <p className="mb-4">
          Buyers will no longer be able to reserve. Existing claims stay, and
          you can reopen any time.
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
