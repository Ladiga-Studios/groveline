"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import PhotoPicker from "@/components/PhotoPicker";
import { CATEGORIES } from "@/lib/categories";

export default function EditDropPage() {
  const { id } = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState(false);
  const [claimed, setClaimed] = useState(0);
  const [claimCount, setClaimCount] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pickupPlace, setPickupPlace] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("11:00");
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      const [{ data: d }, { count }] = await Promise.all([
        supabase.from("drops").select("*").eq("id", id).eq("seller_id", user.id).maybeSingle(),
        supabase.from("claims").select("*", { count: "exact", head: true }).eq("drop_id", id),
      ]);
      if (!d) {
        router.replace("/dashboard");
        return;
      }
      setClaimed(d.claimed);
      setClaimCount(count ?? 0);
      setTitle(d.title);
      setCategory(d.category || "other");
      setDescription(d.description || "");
      setPrice(String(d.price_cents / 100));
      setQuantity(String(d.quantity));
      setPickupPlace(d.pickup_place);
      setExistingUrls(d.photo_urls?.length ? d.photo_urls : d.photo_url ? [d.photo_url] : []);
      const start = new Date(d.pickup_start);
      const end = new Date(d.pickup_end);
      const pad = (n: number) => String(n).padStart(2, "0");
      setPickupDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
      setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
      setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
      setLoaded(true);
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const priceCents = Math.round(parseFloat(price) * 100);
    const qty = parseInt(quantity, 10);
    if (!title.trim()) return setError("The drop needs a name.");
    if (!priceCents || priceCents <= 0) return setError("Enter a price.");
    if (!qty || qty <= 0) return setError("Enter how many.");
    if (qty < claimed)
      return setError(
        `${claimed} are already claimed, so the total cannot go below ${claimed}.`
      );
    if (!pickupPlace.trim()) return setError("Enter a pickup place.");
    const startAt = new Date(`${pickupDate}T${startTime}`);
    const endAt = new Date(`${pickupDate}T${endTime}`);
    if (endAt <= startAt) return setError("Pickup end time needs to be after the start time.");

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
    existingUrls.forEach((u) => body.append("keptUrls", u));
    newPhotos.forEach((p) => body.append("photos", p));

    const res = await fetch(`/api/drops/${id}`, { method: "PUT", body });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save. Try again.");
      return;
    }
    toast("Saved.", "success");
    router.push(`/dashboard/drops/${id}`);
    router.refresh();
  }

  async function deleteDrop() {
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error: delErr } = await supabase.from("drops").delete().eq("id", id);
    setBusy(false);
    setConfirmDelete(false);
    if (delErr) {
      toast("Could not delete the drop.", "error");
      return;
    }
    toast("Drop deleted.", "success");
    router.push("/dashboard");
    router.refresh();
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <p className="text-muted" role="status">
          Loading your drop
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Edit drop</h1>
      {claimed > 0 && (
        <p className="mt-2 text-sm text-muted">
          {claimed} already claimed. People reserved at the price they saw, so
          only raise the price for a good reason.
        </p>
      )}

      <form onSubmit={save} className="mt-8 flex flex-col gap-8" noValidate>
        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">The basics</h2>
          <div className="mt-4 flex flex-col gap-5">
            <div>
              <label htmlFor="e-title" className="field-label">
                What are you selling
              </label>
              <input id="e-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label htmlFor="e-cat" className="field-label">
                Category
              </label>
              <select id="e-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="e-desc" className="field-label">
                Description <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="e-desc"
                className="field min-h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="e-qty" className="field-label">
                  How many total
                </label>
                <input
                  id="e-qty"
                  type="number"
                  inputMode="numeric"
                  min={Math.max(1, claimed)}
                  className="field"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="e-price" className="field-label">
                  Price each
                </label>
                <div className="relative">
                  <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted">
                    $
                  </span>
                  <input
                    id="e-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className="field pl-7"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
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
              <label htmlFor="e-place" className="field-label">
                Pickup place
              </label>
              <input id="e-place" className="field" value={pickupPlace} onChange={(e) => setPickupPlace(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="e-date" className="field-label">
                  Date
                </label>
                <input id="e-date" type="date" className="field" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="e-start" className="field-label">
                  From
                </label>
                <input id="e-start" type="time" className="field" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label htmlFor="e-end" className="field-label">
                  Until
                </label>
                <input id="e-end" type="time" className="field" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Photos</h2>
          <div className="mt-4">
            <PhotoPicker
              files={newPhotos}
              onChange={setNewPhotos}
              existingUrls={existingUrls}
              onRemoveExisting={(url) => setExistingUrls((u) => u.filter((x) => x !== url))}
            />
          </div>
        </section>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary text-lg" disabled={busy}>
          {busy ? "Saving" : "Save changes"}
        </button>
      </form>

      {claimCount === 0 && (
        <div className="mt-10 text-center">
          <button className="text-sm text-muted underline" onClick={() => setConfirmDelete(true)}>
            Delete this drop
          </button>
        </div>
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this drop?">
        <p className="mb-4">
          It comes down everywhere immediately and the link stops working. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-primary grow" onClick={deleteDrop} disabled={busy}>
            Delete it
          </button>
          <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>
            Keep it
          </button>
        </div>
      </Modal>
    </div>
  );
}
