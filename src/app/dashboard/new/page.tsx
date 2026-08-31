"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify, shortId } from "@/lib/format";
import { useToast } from "@/components/Toast";
import CopyButton from "@/components/CopyButton";
import { CATEGORIES } from "@/lib/categories";

export default function NewDropPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pickupPlace, setPickupPlace] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("11:00");
  const [photo, setPhoto] = useState<File | null>(null);
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ url: string; caption: string } | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function writeForMe() {
    if (!notes.trim() && !title.trim()) {
      setError("Give the writer a few words to work with first.");
      return;
    }
    setError("");
    setWriting(true);
    try {
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || title }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.title && !title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      toast("Draft written. Edit anything you want.", "success");
    } catch {
      toast("The writer is unavailable right now. Type it yourself for now.", "error");
    } finally {
      setWriting(false);
    }
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
    if (!pickupPlace.trim()) return setError("Enter a pickup place.");
    if (!pickupDate) return setError("Pick a pickup date.");

    setBusy(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    let photoUrl: string | null = null;
    if (photo) {
      const path = `${user.id}/${Date.now()}-${photo.name.replace(/[^a-z0-9.]/gi, "-")}`;
      const { error: upErr } = await supabase.storage
        .from("drop-photos")
        .upload(path, photo, { cacheControl: "31536000" });
      if (upErr) {
        setBusy(false);
        setError("Photo upload failed. Try a smaller photo or skip it for now.");
        return;
      }
      photoUrl = supabase.storage.from("drop-photos").getPublicUrl(path).data.publicUrl;
    }

    const slug = `${slugify(title)}-${shortId()}`;
    const { error: insErr } = await supabase.from("drops").insert({
      seller_id: user.id,
      slug,
      title: title.trim(),
      category,
      description: description.trim() || null,
      photo_url: photoUrl,
      price_cents: priceCents,
      quantity: qty,
      pickup_place: pickupPlace.trim(),
      pickup_start: new Date(`${pickupDate}T${startTime}`).toISOString(),
      pickup_end: new Date(`${pickupDate}T${endTime}`).toISOString(),
      status: "active",
    });
    setBusy(false);
    if (insErr) {
      setError("Could not create the drop. Try again.");
      return;
    }

    const url = `${window.location.origin}/d/${slug}`;
    const caption = `${title.trim()}, $${price} each. Pickup ${new Date(
      `${pickupDate}T${startTime}`
    ).toLocaleDateString("en-US", { weekday: "long" })} at ${pickupPlace.trim()}. Tap to reserve yours: ${url}`;
    setCreated({ url, caption });

    fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});

    toast("Drop created.", "success");
  }

  if (created) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-3xl font-semibold text-grove">Your drop is live.</h1>
        <p className="mt-2">
          Share this link anywhere you already post. It shows your photo,
          price, and pickup details automatically.
        </p>
        <div className="tag-card mt-6 p-5">
          <p className="break-all font-mono text-sm">{created.url}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyButton text={created.url} />
            <CopyButton text={created.caption} label="Copy a ready caption" />
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          Tip: on Facebook, post the link and give it a second. The preview
          card builds itself. Your email subscribers were notified
          automatically.
        </p>
        <div className="mt-6 flex gap-3">
          <a href={created.url} className="btn btn-primary">
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
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-semibold">Post a drop</h1>
      <p className="mt-2 text-muted">
        Four things and a photo. About a minute.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-5" noValidate>
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

        <div className="tag-card p-4">
          <label htmlFor="d-notes" className="field-label">
            Not sure what to write? Jot a few words and let the writer draft it
          </label>
          <textarea
            id="d-notes"
            className="field min-h-20"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="fresh sourdough, baked friday night, same recipe as always, limit 2"
          />
          <button
            type="button"
            onClick={writeForMe}
            className="btn btn-grove mt-3 !min-h-11"
            disabled={writing}
          >
            {writing ? "Writing" : "Write it for me"}
          </button>
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
            <input
              id="d-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="field"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="9"
            />
          </div>
        </div>

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

        <div>
          <label htmlFor="d-photo" className="field-label">
            Photo <span className="font-normal text-muted">(strongly recommended)</span>
          </label>
          <input
            id="d-photo"
            type="file"
            accept="image/*"
            className="field pt-2.5"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          <p className="field-hint">
            Drops with a photo sell out faster. Natural light works best.
          </p>
        </div>

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
