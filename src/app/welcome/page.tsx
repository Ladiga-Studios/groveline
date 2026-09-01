"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify, shortId } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { STATES } from "@/lib/states";
import Link from "next/link";

export default function WelcomePage() {
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [usState, setUsState] = useState("AL");
  const [isSeller, setIsSeller] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2 || town.trim().length < 2) {
      setError("Name and town both need something in them.");
      return;
    }
    if (!agreed) {
      setError("Give the terms and privacy policy a quick check.");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const base = slugify(farmName || name) || "seller";
    const { error: err } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      accepted_terms_at: new Date().toISOString(),
      name: name.trim(),
      town: town.trim(),
      state: usState,
      is_seller: isSeller,
      farm_name: farmName.trim() || null,
      slug: `${base}-${shortId()}`,
    });
    setBusy(false);
    if (err) {
      setError("That didn't save. Try again.");
      return;
    }
    if (isSeller) {
      const body = new FormData();
      body.set("name", farmName.trim() || name.trim());
      body.set("town", town.trim());
      body.set("state", usState);
      await fetch("/api/shops", { method: "POST", body });
    }
    toast(`Welcome to Groveline, ${name.trim().split(" ")[0]}.`, "success");
    router.push(isSeller ? "/dashboard" : "/browse");
    router.refresh();
  }

  return (
    <div className="pattern-bg">
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="on-pattern">
        <h1 className="text-3xl font-semibold">Just a couple more things</h1>
        <p className="mt-2 text-muted">A few basics and you&apos;re all set.</p>
      </div>
      <form onSubmit={submit} className="tag-card mt-6 flex flex-col gap-4 p-6" noValidate>
        <div>
          <label htmlFor="w-name" className="field-label">
            Your name
          </label>
          <input
            id="w-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="w-town" className="field-label">
            Your town
          </label>
          <input
            id="w-town"
            className="field"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            placeholder="Piedmont"
          />
        </div>
        <div>
          <label htmlFor="w-state" className="field-label">
            State
          </label>
          <select
            id="w-state"
            className="field"
            value={usState}
            onChange={(e) => setUsState(e.target.value)}
          >
            {STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isSeller}
            onChange={(e) => setIsSeller(e.target.checked)}
            className="h-5 w-5 accent-[#1e4d2b]"
          />
          <span className="font-medium">I'd like to sell on Groveline too</span>
        </label>
        {isSeller && (
          <div>
            <label htmlFor="w-farm" className="field-label">
              Farm or business name{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="w-farm"
              className="field"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Miller Farm"
            />
          </div>
        )}
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1e4d2b]" />
          <span>
            I agree to the <Link href="/terms" className="text-grove underline" target="_blank">terms</Link> and{" "}
            <Link href="/privacy" className="text-grove underline" target="_blank">privacy policy</Link>.
          </span>
        </label>
        {error && <p className="field-error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "One second" : "All done"}
        </button>
      </form>
    </div>
    </div>
  );
}
