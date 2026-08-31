"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

/* Shown on the dashboard when a buyer account visits. One tap turns
   selling on for the same account, no new signup. */
export default function BecomeSeller({ firstName }: { firstName: string }) {
  const [farmName, setFarmName] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function turnOn() {
    setBusy(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ is_seller: true, farm_name: farmName.trim() || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast("Could not turn on selling. Try again.", "error");
      return;
    }
    toast("Selling is on. Post your first drop.", "success");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-semibold">
        Ready to sell, {firstName}?
      </h1>
      <p className="mt-2 text-muted">
        Your account already covers it. Turn selling on and your first drop can
        be live in about a minute. Buying works exactly like before.
      </p>
      <div className="tag-card mt-6 flex flex-col gap-4 p-6">
        <div>
          <label htmlFor="bs-farm" className="field-label">
            Farm or business name{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="bs-farm"
            className="field"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            placeholder="Miller Farm"
          />
          <p className="field-hint">
            Shows on your public page and your drops. Skip it and your name is
            used instead.
          </p>
        </div>
        <button className="btn btn-primary" onClick={turnOn} disabled={busy}>
          {busy ? "One second" : "Turn on selling"}
        </button>
      </div>
    </div>
  );
}
