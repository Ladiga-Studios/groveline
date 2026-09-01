import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { money } from "@/lib/format";
import { siteUrl } from "@/lib/stripe";

/* Hourly seller digest. One email per seller listing every new reservation
   since the last one, so a busy Friday night doesn't mean forty emails. */
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const { data: claims } = await admin
    .from("claims")
    .select("id, buyer_name, buyer_phone, quantity, method, delivery, payment_status, drops!inner(id, title, price_cents, seller_id, shops!drops_seller_id_fkey(owner_id, owner:profiles!shops_owner_id_fkey(email, notify_on_claim, notify_digest, name)))")
    .is("seller_notified_at", null)
    .is("cancelled_at", null)
    .neq("payment_status", "pending")
    .limit(1000);

  type Row = NonNullable<typeof claims>[number];
  const bySeller = new Map<string, { email: string; name: string; rows: Row[] }>();
  const skipIds: string[] = [];
  for (const c of claims ?? []) {
    type Owner = { email: string | null; notify_on_claim: boolean; notify_digest: boolean; name: string };
    const d = (Array.isArray(c.drops) ? c.drops[0] : c.drops) as unknown as { id: string; title: string; price_cents: number; seller_id: string; shops: { owner_id: string; owner: Owner | Owner[] | null } | { owner_id: string; owner: Owner | Owner[] | null }[] };
    const shopRow = Array.isArray(d.shops) ? d.shops[0] : d.shops;
    const p = Array.isArray(shopRow?.owner) ? shopRow?.owner[0] : shopRow?.owner;
    const ownerKey = shopRow?.owner_id ?? d.seller_id;
    if (!p?.notify_on_claim || !p.email) {
      skipIds.push(c.id);
      continue;
    }
    const e = bySeller.get(ownerKey) ?? { email: p.email, name: p.name, rows: [] };
    e.rows.push(c);
    bySeller.set(ownerKey, e);
  }

  let sent = 0;
  const site = siteUrl();
  for (const [sellerId, { email, name, rows }] of bySeller) {
    const lines = rows.map((c) => {
      const d = (Array.isArray(c.drops) ? c.drops[0] : c.drops) as { id: string; title: string; price_cents: number };
      const pay = c.method === "card" ? (c.payment_status === "captured" ? "paid by card" : "card on hold") : "cash at pickup";
      return `${c.buyer_name} reserved ${c.quantity} of ${d.title} (${money(d.price_cents * c.quantity)}, ${pay}${c.delivery === "shipping" ? ", shipping" : ""}). ${c.buyer_phone}`;
    });
    await sendEmail(
      email,
      `${rows.length} new reservation${rows.length === 1 ? "" : "s"} on Groveline`,
      `Hi ${name.split(" ")[0]}, since your last update:\n\n${lines.join("\n")}\n\nYour drops: ${site}/dashboard\n\nYou can switch to one email per reservation, or turn these off, in Settings.`
    );
    sent++;
    void sellerId;
  }

  const ids = [...skipIds, ...Array.from(bySeller.values()).flatMap((v) => v.rows.map((r) => r.id))];
  if (ids.length) await admin.from("claims").update({ seller_notified_at: new Date().toISOString() }).in("id", ids);

  return NextResponse.json({ sellers: sent, claims: ids.length });
}
