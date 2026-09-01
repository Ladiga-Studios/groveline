export function money(cents: number) {
  const d = cents / 100;
  const whole = d % 1 === 0;
  return "$" + d.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

/* 2565550100 -> 256-555-0100, as they type. Handles a leading 1. */
export function formatPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/* "1,000" or "$1,000.50" -> 1000.5. NaN if it isn't a number. */
export function parsePrice(input: string) {
  return parseFloat(input.replace(/[^0-9.]/g, ""));
}

/* 1000.5 -> "1,000.50" for showing back in a text field. */
export function formatPriceInput(value: number) {
  if (!isFinite(value)) return "";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
