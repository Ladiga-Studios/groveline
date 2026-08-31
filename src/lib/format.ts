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
