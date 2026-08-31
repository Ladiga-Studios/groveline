export function money(cents: number) {
  const d = cents / 100;
  return d % 1 === 0 ? `$${d}` : `$${d.toFixed(2)}`;
}

export function pickupWindow(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const t = (x: Date) =>
    x
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      .replace(":00", "");
  return `${day}, ${t(start)} to ${t(end)}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/* One line that says when and how, for any drop type. */
export function whenLabel(d: { fulfillment?: string | null; pickup_start: string; pickup_end: string; pickup_place?: string | null }) {
  if (d.fulfillment === "shipping") return `Order by ${shortDate(d.pickup_end)}, ships to you`;
  const base = `Pickup ${pickupWindow(d.pickup_start, d.pickup_end)}`;
  return d.fulfillment === "both" ? `${base}, or shipped` : base;
}

export function cleanSlug(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}
