"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import { STATES } from "@/lib/states";
import { resizeImageFile } from "@/lib/image";
import Modal from "@/components/Modal";
import Subscriptions from "./Subscriptions";

type BillingStatus = {
  stripeConfigured: boolean;
  plansConfigured: boolean;
  subscribed: boolean;
  subscriptionStatus: string;
  hasStripeAccount: boolean;
  payoutsEnabled: boolean;
  plan: null | { interval: "month" | "year"; renewsAt: string; cancelAtPeriodEnd: boolean; trialing: boolean };
};

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [usState, setUsState] = useState("AL");
  const [notify, setNotify] = useState(true);
  const [digest, setDigest] = useState(true);
  const [followEmails, setFollowEmails] = useState(true);
  const [following, setFollowing] = useState<{ id: string; name: string; slug: string; avatar_url: string | null }[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string; slug: string; avatar_url: string | null }[]>([]);
  const [testBusy, setTestBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
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
      setNotify(p.notify_on_claim ?? true);
      setDigest(p.notify_digest ?? true);
      setFollowEmails(p.follow_emails ?? true);
      const { data: f } = await supabase.from("follows").select("shops!follows_seller_id_fkey(id, name, slug, avatar_url)").eq("buyer_id", user.id);
      setFollowing((f ?? []).map((r) => (Array.isArray(r.shops) ? r.shops[0] : r.shops)).filter(Boolean) as { id: string; name: string; slug: string; avatar_url: string | null }[]);
      const lr = await fetch("/api/newsletter/mine");
      if (lr.ok) setLists(await lr.json());
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
      toast("Name and town both need something.", "error");
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
      .update({ name: name.trim(), town: town.trim(), state: usState, notify_on_claim: notify, notify_digest: digest, follow_emails: followEmails })
      .eq("id", user.id);
    setBusy(false);
    toast(error ? "Couldn't save that. Try again." : "Saved.", error ? "error" : "success");
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
      toast("That's a good look. Photo updated.", "success");
    } else toast(data.error || "Couldn't upload that. Try again.", "error");
  }

  async function go(path: string, body?: object) {
    setBusy(true);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else toast(data.error || "Something didn't go through.", "error");
  }

  async function cancelPlan(resume: boolean) {
    setBusy(true);
    const res = await fetch("/api/stripe/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume }),
    });
    setBusy(false);
    setConfirmCancel(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || "Couldn't update your plan. Try again.", "error");
      return;
    }
    setBilling((b) => (b && b.plan ? { ...b, plan: { ...b.plan, cancelAtPeriodEnd: data.cancelAtPeriodEnd, renewsAt: data.renewsAt } } : b));
    toast(resume ? "Welcome back. Your plan continues." : "Cancelled. You're good through the end of what you paid for.", "success");
  }

  async function testEmail() {
    setTestBusy(true);
    const res = await fetch("/api/email/test", { method: "POST" });
    setTestBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast("Sent. Check your inbox (and spam, the first time).", "success");
    else toast(`Email failed: ${data.error || "unknown error"}${data.from ? ` (sending from ${data.from})` : " (RESEND_FROM not set)"}`, "error");
  }

  async function logOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!loaded) return <div className="mx-auto max-w-md px-4 py-14"><p className="text-muted" role="status">Loading your settings</p></div>;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Your account</h1>
      {isSeller && (
        <p className="mt-2 text-sm text-muted">Shop names, photos, bios, and contact info live over in <a href="/dashboard/shops" className="text-grove underline">My shops</a>. This page is just you, the person.</p>
      )}

      <section className="tag-card mt-6 flex items-center gap-5 p-6">
        <Avatar url={avatarUrl} name={name} size={72} />
        <div>
          <p className="font-semibold">Your photo</p>
          <p className="text-sm text-muted">This is just you. Each shop you run gets its own separate photo.</p>
          <label className="btn btn-outline mt-2 !min-h-10 cursor-pointer">
            {avatarBusy ? "Uploading" : avatarUrl ? "Change photo" : "Add a photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} disabled={avatarBusy} />
          </label>
        </div>
      </section>

      <form onSubmit={save} className="tag-card mt-4 flex flex-col gap-4 p-6" noValidate>
        <div>
          <label htmlFor="st-name" className="field-label">What we call you</label>
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
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={followEmails} onChange={(e) => setFollowEmails(e.target.checked)} className="h-5 w-5 accent-[#1e4d2b]" />
          <span>Email me when a shop I follow posts a new drop</span>
        </label>
        {isSeller && (
          <>
            <fieldset className="rounded-xl border-2 border-cream-dark p-4">
              <legend className="px-1 font-semibold">When someone reserves something</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-5 w-5 accent-[#1e4d2b]" />
                <span>Email me when people reserve or cancel</span>
              </label>
              {notify && (
                <div className="mt-2 grid gap-2 pl-8 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="digest" checked={digest} onChange={() => setDigest(true)} className="accent-[#1e4d2b]" />
                    One roundup email per hour
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="digest" checked={!digest} onChange={() => setDigest(false)} className="accent-[#1e4d2b]" />
                    A separate email for each one
                  </label>
                </div>
              )}
            </fieldset>
          </>
        )}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving" : "Save changes"}</button>
      </form>

      <Subscriptions following={following} lists={lists} />

      {isSeller && (
        <section className="tag-card mt-4 p-6">
          <h2 className="text-lg font-semibold">Card payments and shipping</h2>
          <p className="mt-1 text-sm text-muted">
            Let buyers pay by card right when they reserve. The money goes straight to your bank through
            Stripe, it never passes through us. We put a hold on their card at reservation and only charge it
            once you mark them picked up, so a no-show never costs anyone anything.
          </p>
          <p className="mt-2 text-sm text-muted">
            Shipping rides on this too. Once card payments are on, every drop you post gets a pickup, shipping,
            or both option, and you set the shipping charge per drop.
          </p>
          {!billing ? (
            <p className="mt-3 text-sm text-muted">Checking your setup</p>
          ) : !billing.stripeConfigured ? (
            <p className="mt-3 text-sm text-muted">Card payments are being connected. Cash at pickup works in the meantime.</p>
          ) : billing.payoutsEnabled ? (
            <p className="mt-3 font-medium text-grove">Card payments are live. Buyers see the option when they reserve, and shipping is unlocked on your drops.</p>
          ) : (
            <div className="mt-3">
              <button className="btn btn-grove" onClick={() => go("/api/stripe/connect")} disabled={busy}>
                {billing.hasStripeAccount ? "Finish setting up payouts" : "Turn on card payments"}
              </button>
              <p className="field-hint">Stripe walks you through it: you create a Stripe login, add your bank account and ID. About five minutes, once.</p>
            </div>
          )}
        </section>
      )}

      {isSeller && billing?.plansConfigured && (
        <>

          <section className="tag-card mt-4 p-6">
            <h2 className="text-lg font-semibold">Your plan</h2>
            {billing.subscribed && billing.plan ? (
              <>
                <p className="mt-1">
                  <span className="font-semibold">{billing.plan.interval === "year" ? "$60 a year" : "$10 a month"}</span>
                  {billing.plan.trialing ? ", free trial" : ""}.{" "}
                  {billing.plan.cancelAtPeriodEnd
                    ? `Ends ${new Date(billing.plan.renewsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}. You keep everything until then.`
                    : `${billing.plan.trialing ? "First charge" : "Renews"} ${new Date(billing.plan.renewsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {billing.plan.cancelAtPeriodEnd ? (
                    <button className="btn btn-primary" onClick={() => cancelPlan(true)} disabled={busy}>Keep my plan</button>
                  ) : (
                    <button className="btn btn-outline" onClick={() => setConfirmCancel(true)} disabled={busy}>Cancel my plan</button>
                  )}
                  <button className="btn btn-outline" onClick={() => go("/api/stripe/portal")} disabled={busy}>Update card or switch plans</button>
                </div>
              </>
            ) : billing.subscribed ? (
              <button className="btn btn-outline mt-3" onClick={() => go("/api/stripe/portal")} disabled={busy}>Manage billing</button>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Your first three drops are free. After that, it's $10 a month or $60 a year. Have a code? Use it on the <a href="/pricing" className="text-grove underline">pricing page</a>.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn btn-outline" onClick={() => go("/api/stripe/subscribe", { interval: "month" })} disabled={busy}>$10 monthly</button>
                  <button className="btn btn-primary" onClick={() => go("/api/stripe/subscribe", { interval: "year" })} disabled={busy}>$60 yearly</button>
                </div>
              </>
            )}
          </section>

          <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel your plan?">
            <p className="mb-4">
              Nothing changes until {billing.plan ? new Date(billing.plan.renewsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "the end of your billing period"}. You keep posting until then, and you won't be charged again. Your shop, your drops, and your followers all stay put, you'll just be back on the free tier.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-primary grow" onClick={() => cancelPlan(false)} disabled={busy}>Yes, cancel it</button>
              <button className="btn btn-outline" onClick={() => setConfirmCancel(false)}>Never mind</button>
            </div>
          </Modal>
        </>
      )}

      <section className="tag-card mt-4 p-6">
        <h2 className="text-lg font-semibold">Not getting emails?</h2>
        <p className="mt-1 text-sm text-muted">Send yourself a test. If it fails, the message tells you exactly why.</p>
        <button className="btn btn-outline mt-3" onClick={testEmail} disabled={testBusy}>{testBusy ? "Sending" : "Send me a test email"}</button>
      </section>

      <div className="mt-8 text-center">
        <button onClick={logOut} className="btn btn-outline">Log out</button>
      </div>
    </div>
  );
}
