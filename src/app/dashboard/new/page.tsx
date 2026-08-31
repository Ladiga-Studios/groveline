"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import CopyButton from "@/components/CopyButton";
import ShareButton from "@/components/ShareButton";
import PhotoPicker from "@/components/PhotoPicker";
import { CATEGORIES } from "@/lib/categories";

export default function NewDropPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pickupPlace, setPickupPlace] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("11:00");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ url: string; caption: string } | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const priceCents = Math.round(parseFloat(price) * 100);
    const qty = parseInt(quantity, 10);
    if (!title.trim()) return setError("Give it a name, like Sourdough loaves.");
    if (!category) return setError("Pick a category so buyers can find it.");
    if (!priceCents || priceCents <= 0) return setError("Enter a price.");
    if (!qty || qty <= 0) return setError("Enter how many you have.");
    if (!pickupPlace.trim()) return setError("Enter a pickup place.");
    if (!pickupDate) return setError("Pick a pickup date.");
    const startAt = new Date(`${pickupDate}T${startTime}`);
    const endAt = new Date(`${pickupDate}T${endTime}`);
    if (endAt <= startAt)
      return setError("Pickup end time needs to be after the start time.");
    if (endAt < new Date())
      return setError(
        "That pickup time has already passed. Pick a future date or time so buyers can find it."
      );

    setBusy(true);
    const body = new FormData();
    body.set("title", title.trim());
    body.set("category", category);
    body.set("description", description.trim());
    body.set("price", price);
    body.set("quantity", quantity);
    body.set("pickupPlace", pickupPlace.trim());
    body.set("pickupStart", startAt.toISOString());
    body.set("pickupEnd", endAt.toISOString());
    photos.forEach((p) => body.append("photos", p));

    const res = await fetch("/api/drops", { method: "POST", body });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create the drop. Try again.");
      return;
    }
    const data = await res.json();
    const url = `${window.location.origin}/d/${data.slug}`;
    const caption = `${title.trim()}, $${price} each. Pickup ${startAt.toLocaleDateString("en-US", { weekday: "long" })} at ${pickupPlace.trim()}. Tap to reserve yours: ${url}`;
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
        <p className="mt-2">
          Nobody can buy what they never see. Here is what to do right now, it
          takes about a minute.
        </p>
        <ol className="mt-5 list-none space-y-4">
          <li className="tag-card p-4">
            <p className="font-semibold">1. Grab your link</p>
            <p className="mt-1 break-all font-mono text-sm text-muted">{created.url}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ShareButton
                url={created.url}
                title={title || "My new drop on Groveline"}
                text="Reserve yours before it is gone."
                primary
              />
              <CopyButton text={created.url} />
              <CopyButton text={created.caption} label="Copy a ready caption" />
            </div>
          </li>
          <li className="tag-card p-4">
            <p className="font-semibold">2. Paste it where your buyers already are</p>
            <p className="mt-1 text-sm text-muted">
              The Facebook groups you always post in, your page, your story, a
              text to your regulars. The link turns into a card with your photo
              and price by itself, just give it a second to load after pasting.
            </p>
          </li>
          <li className="tag-card p-4">
            <p className="font-semibold">3. That is it</p>
            <p className="mt-1 text-sm text-muted">
              Your email subscribers were already notified automatically.
              Claims show up on your dashboard as they come in, and pickup day
              your list is your checklist.
            </p>
          </li>
        </ol>
        <div className="mt-6 flex gap-3">
          <a href={created.url} className="btn btn-grove">
            See your drop
          </a>
          <button className="btn btn-outline" onClick={() => router.push("/dashboard")}>
            Go to my drops
          </button>
        </div>
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
              <label htmlFor="d-title" className="field-label">
                What are you selling
              </label>
              <input
                id="d-title"
                className="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sourdough loaves"
              />
            </div>

            <div>
              <label htmlFor="d-cat" className="field-label">
                Category
              </label>
              <select
                id="d-cat"
                className="field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" disabled>
                  Pick one
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="d-desc" className="field-label">
                Description <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="d-desc"
                className="field min-h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fresh sourdough, baked Friday night. Limit 2 per person."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="d-qty" className="field-label">
                  How many
                </label>
                <input
                  id="d-qty"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  className="field"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="12"
                />
              </div>
              <div>
                <label htmlFor="d-price" className="field-label">
                  Price each
                </label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted"
                  >
                    $
                  </span>
                  <input
                    id="d-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className="field pl-7"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="9"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Pickup</h2>
          <div className="mt-4 flex flex-col gap-5">
            <div>
              <label htmlFor="d-place" className="field-label">
                Pickup place
              </label>
              <input
                id="d-place"
                className="field"
                value={pickupPlace}
                onChange={(e) => setPickupPlace(e.target.value)}
                placeholder="Piedmont Farmers Market"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="d-date" className="field-label">
                  Date
                </label>
                <input
                  id="d-date"
                  type="date"
                  className="field"
                  value={pickupDate}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 10)}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="d-start" className="field-label">
                  From
                </label>
                <input
                  id="d-start"
                  type="time"
                  className="field"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="d-end" className="field-label">
                  Until
                </label>
                <input
                  id="d-end"
                  type="time"
                  className="field"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">
            Photos <span className="font-normal text-muted">(strongly recommended)</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Drops with a photo sell out faster. Natural light works best.
          </p>
          <div className="mt-4">
            <PhotoPicker files={photos} onChange={setPhotos} />
          </div>
        </section>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary text-lg" disabled={busy}>
          {busy ? "Creating" : "Create drop"}
        </button>
      </form>
    </div>
  );
}
