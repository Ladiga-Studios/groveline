"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import CopyButton from "@/components/CopyButton";
import ShareButton from "@/components/ShareButton";
import FacebookShareButton from "@/components/FacebookShareButton";
import PhotoPicker from "@/components/PhotoPicker";
import CategorySelect from "@/components/CategorySelect";
import PickupFields, { type Pickup } from "@/components/PickupFields";
import { supabaseBrowser } from "@/lib/supabase/client";
import { parsePrice, formatPriceInput, money } from "@/lib/format";

const todayLocal = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function NewDropPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pickup, setPickup] = useState<Pickup>({
    fulfillment: "pickup", shipping: "", place: "", address: "", city: "", state: "AL", zip: "", date: "", start: "08:00", end: "11:00",
  });
  const [customSlug, setCustomSlug] = useState("");
  const [canShip, setCanShip] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [gate, setGate] = useState<null | { needsSubscription: boolean; yearlyAvailable: boolean; freeLeft: number | null }>(null);
  const [created, setCreated] = useState<{ url: string; caption: string } | null>(null);
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
      // Default the pickup city/state from the seller's profile.
      const { data: p } = await supabase.from("profiles").select("town, state").eq("id", user.id).maybeSingle();
      if (p) setPickup((v) => ({ ...v, city: v.city || p.town, state: p.state || "AL" }));

      // "Post again" prefill from a previous drop.
      const from = new URLSearchParams(window.location.search).get("from");
      if (from) {
        const { data: d } = await supabase.from("drops").select("*, shops!drops_seller_id_fkey(owner_id)").eq("id", from).maybeSingle();
        const owner = Array.isArray(d?.shops) ? d?.shops[0] : d?.shops;
        if (d && owner?.owner_id === user.id) {
          setTitle(d.title);
          setCategory(d.category);
          setDescription(d.description || "");
          setPrice(formatPriceInput(d.price_cents / 100));
          setQuantity(String(d.quantity));
          setPickup((v) => ({
            ...v,
            fulfillment: d.fulfillment || "pickup",
            shipping: d.shipping_cents ? String(d.shipping_cents / 100) : "",
            place: d.pickup_place || "",
            address: d.pickup_address || "",
            city: d.pickup_city || v.city,
            state: d.pickup_state || v.state,
            zip: d.pickup_zip || "",
          }));
        }
      }

      const res = await fetch("/api/billing/status");
      if (res.ok) {
        const b = await res.json();
        setGate({ needsSubscription: !!b.needsSubscription, yearlyAvailable: !!b.yearlyAvailable, freeLeft: b.freeLeft ?? null });
        setCanShip(!!b.payoutsEnabled);
      } else {
        setGate({ needsSubscription: false, yearlyAvailable: false, freeLeft: null });
      }
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  async function subscribe(interval: "month" | "year") {
    setBusy(true);
    const res = await fetch("/api/stripe/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else toast("Could not start checkout. Try again.", "error");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const priceCents = Math.round(parsePrice(price) * 100);
    const qty = parseInt(quantity, 10);
    if (!title.trim()) return setError("It needs a name, something like Sourdough loaves.");
    if (!category) return setError("Pick a category so folks can actually find this.");
    if (!priceCents || priceCents <= 0) return setError("What's it going for?");
    if (!qty || qty <= 0) return setError("How many do you have?");
    const shipOnly = pickup.fulfillment === "shipping";
    if (!shipOnly && !pickup.place.trim()) return setError("Where should people pick this up?");
    if (!pickup.city.trim()) return setError("Which city is this in?");
    if (!pickup.date) return setError(shipOnly ? "When's the last day to order?" : "Pick a pickup date.");
    if (pickup.fulfillment !== "pickup" && !(parsePrice(pickup.shipping || "0") >= 0)) return setError("What's the shipping charge? Zero works fine too.");
    const startAt = shipOnly ? new Date(`${pickup.date}T00:00`) : new Date(`${pickup.date}T${pickup.start}`);
    const endAt = shipOnly ? new Date(`${pickup.date}T23:59`) : new Date(`${pickup.date}T${pickup.end}`);
    if (endAt <= startAt) return setError("The end time needs to come after the start time.");
    if (endAt < new Date()) return setError("That date has already passed. Pick one that hasn't happened yet.");

    setBusy(true);
    const body = new FormData();
    body.set("title", title.trim());
    body.set("category", category);
    body.set("description", description.trim());
    body.set("price", String(parsePrice(price)));
    body.set("quantity", quantity);
    body.set("fulfillment", pickup.fulfillment);
    body.set("shipping", String(isNaN(parsePrice(pickup.shipping)) ? 0 : parsePrice(pickup.shipping)));
    body.set("slug", customSlug);
    body.set("pickupPlace", pickup.place.trim());
    body.set("pickupAddress", pickup.address.trim());
    body.set("pickupCity", pickup.city.trim());
    body.set("pickupState", pickup.state);
    body.set("pickupZip", pickup.zip.trim());
    body.set("pickupStart", startAt.toISOString());
    body.set("pickupEnd", endAt.toISOString());
    photos.forEach((p) => body.append("photos", p));

    const res = await fetch("/api/drops", { method: "POST", body });
    setBusy(false);
    if (res.status === 402) {
      setGate((g) => ({ needsSubscription: true, yearlyAvailable: g?.yearlyAvailable ?? false, freeLeft: 0 }));
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "That didn't go through. Give it another try.");
      return;
    }
    const data = await res.json();
    const url = `${window.location.origin}/d/${data.slug}`;
    const caption = shipOnly
      ? `${title.trim()}, ${money(priceCents)} each, shipped to you. Order by ${endAt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}: ${url}`
      : `${title.trim()}, ${money(priceCents)} each. Pickup ${startAt.toLocaleDateString("en-US", { weekday: "long" })} at ${pickup.place.trim()}. Tap to reserve yours: ${url}`;
    setCreated({ url, caption });
    fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: data.slug }),
    }).catch(() => {});
    toast("Drop created.", "success");
  }

  if (created) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-3xl font-semibold text-grove">You're live.</h1>
        <p className="mt-2">Nobody can claim what they never see, so here's what to do next. Takes about a minute.</p>
        <ol className="mt-5 list-none space-y-4">
          <li className="tag-card p-4">
            <p className="font-semibold">1. Grab the link</p>
            <p className="mt-1 break-all font-mono text-sm text-muted">{created.url}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <FacebookShareButton url={created.url} label="Post to Facebook" />
              <ShareButton url={created.url} title={title || "My new drop on Groveline"} text="Reserve yours before it is gone." />
              <CopyButton text={created.url} />
              <CopyButton text={created.caption} label="Copy a ready caption" />
            </div>
          </li>
          <li className="tag-card p-4">
            <p className="font-semibold">2. Paste it where your buyers already are</p>
            <p className="mt-1 text-sm text-muted">
              Post to Facebook opens Facebook with your link already loaded in. It pulls in your first photo, the
              title, the price, and the start of your description on its own. Add a line in your own words and
              you're posted.
            </p>
          </li>
          <li className="tag-card p-4">
            <p className="font-semibold">3. That's really it</p>
            <p className="mt-1 text-sm text-muted">
              Your followers and email subscribers already got the news, that happened by itself. Watch the claims come in on your dashboard.
            </p>
          </li>
        </ol>
        <div className="mt-6 flex gap-3">
          <a href={created.url} className="btn btn-grove">See how it looks</a>
          <button className="btn btn-outline" onClick={() => router.push("/dashboard")}>Back to my drops</button>
        </div>
      </div>
    );
  }

  if (gate?.needsSubscription) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14">
        <h1 className="text-3xl font-semibold">You've used up your three free drops.</h1>
        <p className="mt-3 text-lg">
          Pick a plan and keep going. We never take a cut of what you sell, cash or card, no matter how much
          comes through. Cancel whenever you want.
        </p>
        <div className={`mt-6 grid gap-4 ${gate.yearlyAvailable ? "sm:grid-cols-2" : ""}`}>
          <div className="tag-card p-6">
            <p className="font-display text-4xl font-semibold text-grove">$10<span className="text-lg font-normal text-muted"> / month</span></p>
            <p className="mt-1 text-sm text-muted">Month to month.</p>
            <button className="btn btn-outline mt-5 w-full" onClick={() => subscribe("month")} disabled={busy}>
              {busy ? "One second" : "Start monthly"}
            </button>
          </div>
          {gate.yearlyAvailable && (
            <div className="tag-card border-leaf p-6">
              <p className="font-display text-4xl font-semibold text-grove">$60<span className="text-lg font-normal text-muted"> / year</span></p>
              <p className="mt-1 text-sm text-muted">Two months free. Set it and forget it.</p>
              <button className="btn btn-primary mt-5 w-full" onClick={() => subscribe("year")} disabled={busy}>
                {busy ? "One second" : "Start yearly"}
              </button>
            </div>
          )}
        </div>
        <ul className="mt-6 space-y-1 text-sm text-muted">
          <li>Unlimited drops, up to 10 photos each</li>
          <li>Automatic emails to your followers and subscribers</li>
          <li>Card payments straight to your bank, if you want them</li>
          <li>Pickup day checklists, waitlists, reminders</li>
        </ul>
        <p className="mt-4 text-center text-sm text-muted">Billing runs through Stripe. Have a code? Use it on the <a href="/pricing" className="text-grove underline">pricing page</a>. Switch plans or cancel any time from Settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold">What have you got</h1>
      <p className="mt-2 text-muted">
        A few details and some photos. About a minute.
        {gate?.freeLeft !== null && gate?.freeLeft !== undefined && gate.freeLeft > 0 && ` This is one of your ${gate.freeLeft} free drop${gate.freeLeft === 1 ? "" : "s"}.`}
      </p>
      <p className="mt-1 text-sm text-muted">
        Fields marked <span className="font-semibold text-clay">*</span> are required. Everything else is
        up to you.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-8" noValidate>
        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">What are you selling</h2>
          <div className="mt-4 flex flex-col gap-5">
            <div>
              <label htmlFor="d-title" className="field-label req">Give it a name</label>
              <input id="d-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sourdough loaves" />
            </div>
            <div>
              <label htmlFor="d-cat" className="field-label req">Category</label>
              <CategorySelect id="d-cat" value={category} onChange={setCategory} />
            </div>
            <div>
              <label htmlFor="d-desc" className="field-label">Description <span className="font-normal text-muted">(optional)</span></label>
              <textarea id="d-desc" className="field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fresh sourdough, baked Friday night, limit 2 per person." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="d-qty" className="field-label req">How many you've got</label>
                <input id="d-qty" type="number" inputMode="numeric" min="1" className="field" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="12" />
              </div>
              <div>
                <label htmlFor="d-price" className="field-label req">Going rate, each</label>
                <div className="relative">
                  <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted">$</span>
                  <input id="d-price" type="text" inputMode="decimal" className="field pl-8" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ""))} onBlur={() => { const n = parsePrice(price); if (!isNaN(n)) setPrice(formatPriceInput(n)); }} placeholder="9.00" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Pickup</h2>
          <div className="mt-4">
            <PickupFields value={pickup} onChange={setPickup} prefix="d" minDate={todayLocal()} canShip={canShip} />
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Your link <span className="font-normal text-muted">(optional)</span></h2>
          <p className="mt-1 text-sm text-muted">Something easy to say out loud at the booth beats a string of random letters. Leave it blank and we'll make one.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted">groveline.io/d/</span>
            <input className="field" value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} placeholder="saturday-sourdough" />
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Show it off <span className="font-normal text-muted">(seriously, add a photo)</span></h2>
          <p className="mt-1 text-sm text-muted">Drops with a real photo sell out faster, every time. Natural light does most of the work for you.</p>
          <div className="mt-4">
            <PhotoPicker files={photos} onChange={setPhotos} />
          </div>
        </section>

        {error && <p className="field-error" role="alert">{error}</p>}

        <button className="btn btn-primary text-lg" disabled={busy || gate === null}>
          {busy ? "Posting" : "Post it"}
        </button>
      </form>
    </div>
  );
}
