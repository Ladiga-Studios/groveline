"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import { STATES } from "@/lib/states";
import { resizeImageFile } from "@/lib/image";

type BillingStatus = {
  stripeConfigured: boolean;
  subscribed: boolean;
  subscriptionStatus: string;
  hasStripeAccount: boolean;
  payoutsEnabled: boolean;
};

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [usState, setUsState] = useState("AL");
  const [farmName, setFarmName] = useState("");
  const [bio, setBio] = useState("");
  const [notify, setNotify] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
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
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!p) {
        router.replace("/welcome");
        return;
      }
      setName(p.name);
      setTown(p.town);
      setUsState(p.state || "AL");
      setFarmName(p.farm_name || "");
      setBio(p.bio || "");
      setNotify(p.notify_on_claim ?? true);
      setAvatarUrl(p.avatar_url);
      setIsSeller(p.is_seller);
      setLoaded(true);
      if (p.is_seller) {
        const res = await fetch("/api/billing/status");
        if (res.ok) setBilling(await res.json());
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("connect") === "return") toast("Payout setup received. It can take a minute to activate.", "success");
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
    if (!user) return router.replace("/login");
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), town: town.trim(), state: usState, farm_name: farmName.trim() || null, bio: bio.trim() || null, notify_on_claim: notify })
      .eq("id", user.id);
    setBusy(false);
    toast(error ? "Could not save. Try again." : "Saved.", error ? "error" : "success");
  }

  async function uploadAvatar(file: File) {
    setAvatarBusy(true);
    const resized = await resizeImageFile(file, 512, 0.85);
    const body = new FormData();
    body.set("avatar", resized);
    const res = await fetch("/api/profile/avatar", { method: "POST", body });
    setAvatarBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAvatarUrl(data.url);
      toast("Profile photo updated.", "success");
    } else toast(data.error || "Could not upload.", "error");
  }

  async function go(path: string) {
    setBusy(true);
    const res = await fetch(path, { method: "POST" });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else toast(data.error || "Something went wrong.", "error");
  }

  async function logOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!loaded) return <div className="mx-auto max-w-md px-4 py-14"><p className="text-muted" role="status">Loading your settings</p></div>;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <section className="tag-card mt-6 flex items-center gap-5 p-6">
        <Avatar url={avatarUrl} name={farmName || name} size={72} />
        <div>
          <p className="font-semibold">Profile photo</p>
          <p className="text-sm text-muted">Shows on your page and your drops. A friendly face sells more bread.</p>
          <label className="btn btn-outline mt-2 !min-h-10 cursor-pointer">
            {avatarBusy ? "Uploading" : avatarUrl ? "Change photo" : "Add a photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} disabled={avatarBusy} />
          </label>
        </div>
      </section>

      <form onSubmit={save} className="tag-card mt-4 flex flex-col gap-4 p-6" noValidate>
        <div>
          <label htmlFor="st-name" className="field-label">Your name</label>
          <input id="st-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-town" className="field-label">Town</label>
            <input id="st-town" className="field" value={town} onChange={(e) => setTown(e.target.value)} />
          </div>
          <div>
            <label htmlFor="st-state" className="field-label">State</label>
            <select id="st-state" className="field" value={usState} onChange={(e) => setUsState(e.target.value)}>
              {STATES.map(([code, n]) => <option key={code} value={code}>{n}</option>)}
            </select>
          </div>
        </div>
        {isSeller && (
          <>
            <div>
              <label htmlFor="st-farm" className="field-label">Farm or business name <span className="font-normal text-muted">(optional)</span></label>
              <input id="st-farm" className="field" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="st-bio" className="field-label">About you <span className="font-normal text-muted">(optional)</span></label>
              <textarea id="st-bio" className="field min-h-24" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Small farm outside Piedmont. Bread on Saturdays, eggs most weeks." />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-5 w-5 accent-[#1e4d2b]" />
              <span>Email me each time someone reserves or cancels</span>
            </label>
          </>
        )}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving" : "Save changes"}</button>
      </form>

      {isSeller && billing?.stripeConfigured && (
        <>
          <section className="tag-card mt-4 p-6">
            <h2 className="text-lg font-semibold">Card payments</h2>
            <p className="mt-1 text-sm text-muted">
              Let buyers pay by card when they reserve. The money goes straight to your bank through Stripe, never through Groveline. A hold goes on their card at reservation and it is charged when you mark them picked up, so no-shows never cost anyone.
            </p>
            {billing.payoutsEnabled ? (
              <p className="mt-3 font-medium text-grove">Card payments are on. Buyers see the option at checkout.</p>
            ) : (
              <button className="btn btn-grove mt-3" onClick={() => go("/api/stripe/connect")} disabled={busy}>
                {billing.hasStripeAccount ? "Finish payout setup" : "Set up card payments"}
              </button>
            )}
          </section>

          <section className="tag-card mt-4 p-6">
            <h2 className="text-lg font-semibold">Subscription</h2>
            <p className="mt-1 text-sm text-muted">
              {billing.subscribed ? `Active. $10 a month, cancel any time.` : "Your first drop is free. After that it is a flat $10 a month."}
            </p>
            {billing.subscribed ? (
              <button className="btn btn-outline mt-3" onClick={() => go("/api/stripe/portal")} disabled={busy}>Manage billing</button>
            ) : (
              <button className="btn btn-primary mt-3" onClick={() => go("/api/stripe/subscribe")} disabled={busy}>Subscribe</button>
            )}
          </section>
        </>
      )}

      <div className="mt-8 text-center">
        <button onClick={logOut} className="btn btn-outline">Log out</button>
      </div>
    </div>
  );
}
