import Stripe from "stripe";

/* Returns a Stripe client, or null when Stripe isn't configured. Every
   caller treats null as "card payments and billing are off". */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";
}
