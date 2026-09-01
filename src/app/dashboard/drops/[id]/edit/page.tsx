"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { parsePrice, formatPriceInput } from "@/lib/format";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import PhotoPicker from "@/components/PhotoPicker";
import CategorySelect from "@/components/CategorySelect";
import PickupFields, { type Pickup } from "@/components/PickupFields";

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
  const [pickup, setPickup] = useState<Pickup>({
    fulfillment: "pickup", shipping: "", place: "", address: "", city: "", state: "AL", zip: "", date: "", start: "08:00", end: "11:00",
  });
  const [slug, setSlug] = useState("");
  const [canShip, setCanShip] = useState(false);
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
        supabase.from("drops").select("*, shops!drops_seller_id_fkey(owner_id)").eq("id", id).maybeSingle(),
        supabase.from("claims").select("*", { count: "exact", head: true }).eq("drop_id", id),
      ]);
      const owner = Array.isArray(d?.shops) ? d?.shops[0] : d?.shops;
      if (!d || owner?.owner_id !== user.id) {
        router.replace("/dashboard");
        return;
      }
      setClaimed(d.claimed);
      setClaimCount(count ?? 0);
      setTitle(d.title);
      setCategory(d.category || "other");
      setDescription(d.description || "");
      setPrice(formatPriceInput(d.price_cents / 100));
      setQuantity(String(d.quantity));
      setExistingUrls(d.photo_urls?.length ? d.photo_urls : d.photo_url ? [d.photo_url] : []);
      const start = new Date(d.pickup_start);
      const end = new Date(d.pickup_end);
      const pad = (n: number) => String(n).padStart(2, "0");
      setSlug(d.slug);
      fetch("/api/billing/status").then((r) => r.ok && r.json()).then((b) => b && setCanShip(!!b.payoutsEnabled));
      setPickup({
        fulfillment: d.fulfillment || "pickup",
        shipping: d.shipping_cents ? String(d.shipping_cents / 100) : "",
        place: d.pickup_place || "",
        address: d.pickup_address || "",
        city: d.pickup_city || "",
        state: d.pickup_state || "AL",
        zip: d.pickup_zip || "",
        date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        end: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      });
      setLoaded(true);
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const priceCents = Math.round(parsePrice(price) * 100);
    const qty = parseInt(quantity, 10);
    if (!title.trim()) return setError("This still needs a name.");
    if (!priceCents || priceCents <= 0) return setError("What's it going for?");
    if (!qty || qty <= 0) return setError("How many total?");
    if (qty < claimed)
      return setError(
        `${claimed} of these are already claimed, so the total can't drop below that.`
      );
    const shipOnly = pickup.fulfillment === "shipping";
    if (!shipOnly && !pickup.place.trim()) return setError("Where should people get this?");
    if (!pickup.city.trim()) return setError("Which city is this in?");
    const startAt = shipOnly ? new Date(`${pickup.date}T00:00`) : new Date(`${pickup.date}T${pickup.start}`);
    const endAt = shipOnly ? new Date(`${pickup.date}T23:59`) : new Date(`${pickup.date}T${pickup.end}`);
    if (endAt <= startAt) return setError("The end time needs to land after the start time.");

    setBusy(true);
    const body = new FormData();
    body.set("title", title.trim());
    body.set("category", category);
    body.set("description", description.trim());
    body.set("price", String(parsePrice(price)));
    body.set("quantity", quantity);
    body.set("fulfillment", pickup.fulfillment);
    body.set("shipping", String(isNaN(parsePrice(pickup.shipping)) ? 0 : parsePrice(pickup.shipping)));
    body.set("slug", slug);
    body.set("pickupPlace", pickup.place.trim());
    body.set("pickupAddress", pickup.address.trim());
    body.set("pickupCity", pickup.city.trim());
    body.set("pickupState", pickup.state);
    body.set("pickupZip", pickup.zip.trim());
    body.set("pickupStart", startAt.toISOString());
    body.set("pickupEnd", endAt.toISOString());
    existingUrls.forEach((u) => body.append("keptUrls", u));
    newPhotos.forEach((p) => body.append("photos", p));

    const res = await fetch(`/api/drops/${id}`, { method: "PUT", body });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "That didn't save. Try again.");
      return;
    }
    toast("Saved. Looking good.", "success");
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
      toast("Couldn't delete that. Try again.", "error");
      return;
    }
    toast("Gone. That drop is deleted.", "success");
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
      <h1 className="text-3xl font-semibold">Touch it up</h1>
      {claimed > 0 && (
        <p className="mt-2 text-sm text-muted">
          {claimed} people have already claimed this at the price they saw, so
          go easy on raising it unless there's a real reason to.
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
              <CategorySelect id="e-cat" value={category} onChange={setCategory} />
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
                    type="text"
                    inputMode="decimal"
                    className="field pl-8"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ""))}
                    onBlur={() => {
                      const n = parsePrice(price);
                      if (!isNaN(n)) setPrice(formatPriceInput(n));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Pickup</h2>
          <div className="mt-4">
            <PickupFields value={pickup} onChange={setPickup} prefix="e" canShip={canShip} />
          </div>
        </section>

        <section className="tag-card p-6">
          <h2 className="text-lg font-semibold">Your link</h2>
          <p className="mt-1 text-sm text-muted">Changing this breaks any link you already shared.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted">groveline.io/d/</span>
            <input className="field" value={slug} onChange={(e) => setSlug(e.target.value)} />
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
          It disappears everywhere right away and the link stops working. There's no getting it back after this.
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
