"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import CopyButton from "@/components/CopyButton";
import ShareButton from "@/components/ShareButton";
import PhotoPicker from "@/components/PhotoPicker";
import CategorySelect from "@/components/CategorySelect";
import PickupFields, { type Pickup } from "@/components/PickupFields";
import { supabaseBrowser } from "@/lib/supabase/client";

const todayLocal = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function NewDropPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pickup, setPickup] = useState<Pickup>({
    place: "", address: "", city: "", state: "AL", zip: "", date: "", start: "08:00", end: "11:00",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [gate, setGate] = useState<null | { needsSubscription: boolean; yearlyAvailable: boolean }>(null);
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
        const { data: d } = await supabase.from("drops").select("*").eq("id", from).eq("seller_id", user.id).maybeSingle();
        if (d) {
          setTitle(d.title);
          setCategory(d.category);
          setDescription(d.description || "");
          setPrice(String(d.price_cents / 100));
          setQuantity(String(d.quantity));
          setPickup((v) => ({
            ...v,
            place: d.pickup_place,
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
        setGate({ needsSubscription: !!b.needsSubscription, yearlyAvailable: !!b.yearlyAvailable });
      } else {
        setGate({ needsSubscription: false, yearlyAvailable: false });
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
    const priceCents = Math.round(parseFloat(price) * 100);
    const qty = parseInt(quantity, 10);
    if (!title.trim()) return setError("Give it a name, like Sourdough loaves.");
    if (!category) return setError("Pick a category so buyers can find it.");
    if (!priceCents || priceCents <= 0) return setError("Enter a price.");
    if (!qty || qty <= 0) return setError("Enter how many you have.");
    if (!pickup.place.trim()) return setError("Enter a pickup place.");
    if (!pickup.city.trim()) return setError("Enter the pickup city.");
    if (!pickup.date) return setError("Pick a pickup date.");
    const startAt = new Date(`${pickup.date}T${pickup.start}`);
    const endAt = new Date(`${pickup.date}T${pickup.end}`);
    if (endAt <= startAt) return setError("Pickup end time needs to be after the start time.");
    if (endAt < new Date()) return setError("That pickup time has already passed. Pick a future date or time.");

    setBusy(true);
    const body = new FormData();
    body.set("title", title.trim());
    body.set("category", category);
    body.set("description", description.trim());
    body.set("price", price);
    body.set("quantity", quantity);
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
      setGate((g) => ({ needsSubscription: true, yearlyAvailable: g?.yearlyAvailable ?? false }));
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create the drop. Try again.");
      return;
    }
    const data = await res.json();
    const url = `${window.location.origin}/d/${data.slug}`;
    const caption = `${title.trim()}, $${price} each. Pickup ${startAt.toLocaleDateString("en-US", { weekday: "long" })} at ${pickup.place.trim()}. Tap to reserve yours: ${url}`;
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
        <h1 className="text-3xl font-semibold text-grove">Your drop is live.</h1>
        <p className="mt-2">Nobody can buy what they never see. Here is what to do right now, it takes about a minute.</p>
        <ol className="mt-5 list-none space-y-4">
          <li className="tag-card p-4">
            <p className="font-semibold">1. Grab your link</p>
            <p className="mt-1 break-all font-mono text-sm text-muted">{created.url}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ShareButton url={created.url} title={title || "My new drop on Groveline"} text="Reserve yours before it is gone." primary />
              <CopyButton text={created.url} />
              <CopyButton text={created.caption} label="Copy a ready caption" />
            </div>
          </li>
          <li className="tag-card p-4">
            <p className="font-semibold">2. Paste it where your buyers already are</p>
            <p className="mt-1 text-sm text-muted">
              The Facebook groups you always post in, your page, your story, a text to your regulars. The link turns into a card with your photo and price by itself.
            </p>
          </li>
          <li className="tag-card p-4">
            <p className="font-semibold">3. That is it</p>
            <p className="mt-1 text-sm text-muted">
              Your followers and email subscribers were notified automatically. Claims show up on your dashboard as they come in.
            </p>
          </li>
        </ol>
        <div className="mt-6 flex gap-3">
          <a href={created.url} className="btn btn-grove">See your drop</a>
          <button className="btn btn-outline" onClick={() => router.push("/dashboard")}>Go to my drops</button>
        </div>
      </div>
    );
  }

  if (gate?.needsSubscription) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14">
        <h1 className="text-3xl font-semibold">Your first drop was on us.</h1>
        <p className="mt-3 text-lg">
          To keep posting, pick a plan. No cut of your sales, cash or card, no matter how much you sell. Cancel any time.
        </p>
        <div className={`mt-6 grid gap-4 ${gate.yearlyAvailable ? "sm:grid-cols-2" : ""}`}>
          <div className="tag-card p-6">
            <p className="font-display text-4xl font-semibold text-grove">$10<span className="text-lg font-normal text-muted"> / month</span></p>
            <p className="mt-1 text-sm text-muted">Month to month.</p>
            <button className="btn btn-outline mt-5 w-full" onClick={() => subscribe("month")} disabled={busy}>
              {busy ? "One second" : "Go monthly"}
            </button>
          </div>
          {gate.yearlyAvailable && (
            <div className="tag-card border-leaf p-6">
              <p className="font-display text-4xl font-semibold text-grove">$60<span className="text-lg font-normal text-muted"> / year</span></p>
              <p className="mt-1 text-sm text-muted">Two months free. Set it and forget it.</p>
              <button className="btn btn-primary mt-5 w-full" onClick={() => subscribe("year")} disabled={busy}>
                {busy ? "One second" : "Go yearly"}
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
        <p className="mt-4 text-center text-sm text-muted">Billing is handled by Stripe. You can switch plans or cancel from Settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Post a drop</h1>
      <p className="mt-2 text-muted">A few details and some photos. About a minute.</p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-8" noValidate>
        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">The basics</h2>
          <div className="mt-4 flex flex-col gap-5">
            <div>
              <label htmlFor="d-title" className="field-label">What are you selling</label>
              <input id="d-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sourdough loaves" />
            </div>
            <div>
              <label htmlFor="d-cat" className="field-label">Category</label>
              <CategorySelect id="d-cat" value={category} onChange={setCategory} />
            </div>
            <div>
              <label htmlFor="d-desc" className="field-label">Description <span className="font-normal text-muted">(optional)</span></label>
              <textarea id="d-desc" className="field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fresh sourdough, baked Friday night. Limit 2 per person." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="d-qty" className="field-label">How many</label>
                <input id="d-qty" type="number" inputMode="numeric" min="1" className="field" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="12" />
              </div>
              <div>
                <label htmlFor="d-price" className="field-label">Price each</label>
                <div className="relative">
                  <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted">$</span>
                  <input id="d-price" type="number" inputMode="decimal" min="0" step="0.01" className="field pl-8" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="9" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Pickup</h2>
          <div className="mt-4">
            <PickupFields value={pickup} onChange={setPickup} prefix="d" minDate={todayLocal()} />
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Photos <span className="font-normal text-muted">(strongly recommended)</span></h2>
          <p className="mt-1 text-sm text-muted">Drops with a photo sell out faster. Natural light works best.</p>
          <div className="mt-4">
            <PhotoPicker files={photos} onChange={setPhotos} />
          </div>
        </section>

        {error && <p className="field-error" role="alert">{error}</p>}

        <button className="btn btn-primary text-lg" disabled={busy || gate === null}>
          {busy ? "Creating" : "Create drop"}
        </button>
      </form>
    </div>
  );
}
