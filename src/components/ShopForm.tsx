"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { useToast } from "./Toast";
import { STATES } from "@/lib/states";
import { resizeImageFile } from "@/lib/image";
import type { Shop } from "@/lib/types";

/* Create or edit a shop. Used by the become-a-seller flow and Settings. */
export default function ShopForm({
  shop,
  defaults,
  onDone,
}: {
  shop?: Shop;
  defaults?: { town?: string; state?: string };
  onDone?: (id: string) => void;
}) {
  const [name, setName] = useState(shop?.name ?? "");
  const [slug, setSlug] = useState(shop?.slug ?? "");
  const [town, setTown] = useState(shop?.town ?? defaults?.town ?? "");
  const [usState, setUsState] = useState(shop?.state ?? defaults?.state ?? "AL");
  const [bio, setBio] = useState(shop?.bio ?? "");
  const [phone, setPhone] = useState(shop?.contact_phone ?? "");
  const [social, setSocial] = useState(shop?.social_url ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(shop?.avatar_url ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const router = useRouter();

  async function pick(file: File) {
    const resized = await resizeImageFile(file, 512, 0.85);
    setPhoto(resized);
    setPreview(URL.createObjectURL(resized));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("The shop needs a name to go by.");
    if (town.trim().length < 2) return setError("Which town are you in?");
    setBusy(true);
    const body = new FormData();
    body.set("name", name.trim());
    body.set("slug", slug);
    body.set("town", town.trim());
    body.set("state", usState);
    body.set("bio", bio.trim());
    body.set("contact_phone", phone.trim());
    body.set("social_url", social.trim());
    if (photo) body.set("avatar", photo);
    const res = await fetch(shop ? `/api/shops/${shop.id}` : "/api/shops", { method: shop ? "PUT" : "POST", body });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "That didn't save. Give it another try.");
    toast(shop ? "Saved." : "Shop created.", "success");
    if (onDone) onDone(shop?.id ?? data.id);
    else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="tag-card flex flex-col gap-4 p-6" noValidate>
      <div className="flex items-center gap-4">
        <Avatar url={preview} name={name || "Shop"} size={64} />
        <div>
          <p className="font-semibold">A face for the shop</p>
          <p className="text-sm text-muted">Your logo, your booth, or an actual photo of you. It shows up on your page and every drop you post.</p>
          <label className="btn btn-outline mt-2 !min-h-10 cursor-pointer">
            {preview ? "Change photo" : "Add a photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          </label>
        </div>
      </div>
      <div>
        <label htmlFor="sh-name" className="field-label">What do you go by</label>
        <input id="sh-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Miller Farm, or Sarah's Sourdough" />
      </div>
      <div>
        <label htmlFor="sh-slug" className="field-label">Your page link <span className="font-normal text-muted">(optional)</span></label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-muted">groveline.io/s/</span>
          <input id="sh-slug" className="field" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="miller-farm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sh-town" className="field-label">Town</label>
          <input id="sh-town" className="field" value={town} onChange={(e) => setTown(e.target.value)} />
        </div>
        <div>
          <label htmlFor="sh-state" className="field-label">State</label>
          <select id="sh-state" className="field" value={usState} onChange={(e) => setUsState(e.target.value)}>
            {STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="sh-bio" className="field-label">Tell people a little about it <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="sh-bio" className="field min-h-24" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Small farm outside town. Bread on Saturdays, eggs most weeks." />
      </div>
      <div className="grid gap-4">
        <div>
          <label htmlFor="sh-phone" className="field-label">Phone for buyers <span className="font-normal text-muted">(optional)</span></label>
          <input id="sh-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label htmlFor="sh-social" className="field-label">Facebook page or website <span className="font-normal text-muted">(optional)</span></label>
          <input id="sh-social" type="url" className="field" value={social} onChange={(e) => setSocial(e.target.value)} placeholder="https://" />
        </div>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving" : shop ? "Save changes" : "Create my shop"}</button>
    </form>
  );
}
