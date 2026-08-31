"use client";
import { useState } from "react";
import Modal from "./Modal";
import { useToast } from "./Toast";

export default function ReportButton({ dropId }: { dropId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("not-real");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_id: dropId, reason, details, email }),
    });
    setBusy(false);
    setOpen(false);
    toast(res.ok ? "Thanks, we will take a look." : "Could not send the report.", res.ok ? "success" : "error");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-muted underline">
        Report this listing
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Report this listing">
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="rp-reason" className="field-label">
              What is wrong
            </label>
            <select id="rp-reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="not-real">Not a real listing</option>
              <option value="inappropriate">Inappropriate photo or wording</option>
              <option value="scam">Looks like a scam</option>
              <option value="wrong-category">Wrong category</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div>
            <label htmlFor="rp-details" className="field-label">
              Details <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea id="rp-details" className="field min-h-20" value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <div>
            <label htmlFor="rp-email" className="field-label">
              Your email <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="rp-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Sending" : "Send report"}
          </button>
        </div>
      </Modal>
    </>
  );
}
