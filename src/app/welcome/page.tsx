"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify, shortId } from "@/lib/format";
import { useToast } from "@/components/Toast";

export default function WelcomePage() {
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [isSeller, setIsSeller] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2 || town.trim().length < 2) {
      setError("Name and town are both needed.");
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
      name: name.trim(),
      town: town.trim(),
      is_seller: isSeller,
      farm_name: farmName.trim() || null,
      slug: `${base}-${shortId()}`,
    });
    setBusy(false);
    if (err) {
      setError("Could not save. Try again.");
      return;
    }
    toast(`Welcome to Groveline, ${name.trim().split(" ")[0]}.`, "success");
    router.push(isSeller ? "/dashboard" : "/browse");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-semibold">Almost there</h1>
      <p className="mt-2 text-muted">A few basics and you are in.</p>
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
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isSeller}
            onChange={(e) => setIsSeller(e.target.checked)}
            className="h-5 w-5 accent-[#1e4d2b]"
          />
          <span className="font-medium">I want to sell on Groveline</span>
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
        {error && <p className="field-error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving" : "Finish"}
        </button>
      </form>
    </div>
  );
}
