"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { STATES } from "@/lib/states";

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [usState, setUsState] = useState("AL");
  const [farmName, setFarmName] = useState("");
  const [bio, setBio] = useState("");
  const [isSeller, setIsSeller] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (!p) {
        router.replace("/welcome");
        return;
      }
      setName(p.name);
      setTown(p.town);
      setUsState(p.state || "AL");
      setFarmName(p.farm_name || "");
      setBio(p.bio || "");
      setIsSeller(p.is_seller);
      setLoaded(true);
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 || town.trim().length < 2) {
      toast("Name and town are both needed.", "error");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        town: town.trim(),
        state: usState,
        farm_name: farmName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast("Could not save. Try again.", "error");
    else toast("Saved.", "success");
  }

  async function logOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <p className="text-muted" role="status">
          Loading your settings
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <form onSubmit={save} className="tag-card mt-6 flex flex-col gap-4 p-6" noValidate>
        <div>
          <label htmlFor="st-name" className="field-label">
            Your name
          </label>
          <input
            id="st-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-town" className="field-label">
              Town
            </label>
            <input
              id="st-town"
              className="field"
              value={town}
              onChange={(e) => setTown(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="st-state" className="field-label">
              State
            </label>
            <select
              id="st-state"
              className="field"
              value={usState}
              onChange={(e) => setUsState(e.target.value)}
            >
              {STATES.map(([code, n]) => (
                <option key={code} value={code}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isSeller && (
          <>
            <div>
              <label htmlFor="st-farm" className="field-label">
                Farm or business name{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="st-farm"
                className="field"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="st-bio" className="field-label">
                About you{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="st-bio"
                className="field min-h-24"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Small farm outside Piedmont. Bread on Saturdays, eggs most weeks."
              />
              <p className="field-hint">Shows at the top of your public page.</p>
            </div>
          </>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving" : "Save changes"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button onClick={logOut} className="btn btn-outline">
          Log out
        </button>
      </div>
    </div>
  );
}
