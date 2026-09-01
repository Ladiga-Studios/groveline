import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { money, whenLabel } from "@/lib/format";
import type { Claim, Drop } from "@/lib/types";
import Link from "next/link";
import ClaimList, { InventoryControl } from "./ClaimList";
import CopyButton from "@/components/CopyButton";
import FacebookShareButton from "@/components/FacebookShareButton";
import NotifyFollowersButton from "./NotifyFollowersButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Drop claims" };

export default async function DropAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dropRow } = await supabase
    .from("drops")
    .select("*, shops!drops_seller_id_fkey(owner_id, name)")
    .eq("id", id)
    .maybeSingle();
  const shopRow = Array.isArray(dropRow?.shops) ? dropRow?.shops[0] : dropRow?.shops;
  if (!dropRow || shopRow?.owner_id !== user.id) notFound();
  const drop = dropRow as Drop;

  const [{ data: claims }, { data: waitlist }] = await Promise.all([
    supabase
      .from("claims")
      .select("*")
      .eq("drop_id", id)
      .is("cancelled_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("waitlist_entries")
      .select("*")
      .eq("drop_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io"}/d/${drop.slug}`;

  const list = (claims ?? []) as Claim[];

  /* Phone: one column, in the order you need it on pickup day. Desktop: the
     checklist takes the wide column and everything else (numbers, share,
     tools, inventory) sits in a rail beside it. */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold">{drop.title}</h1>
            {drop.status === "closed" && (
              <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-cream">Closed</span>
            )}
          </div>
          <p className="mt-1 text-muted">
            {money(drop.price_cents)} each, {whenLabel(drop)}{drop.pickup_place ? ` at ${drop.pickup_place}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/d/${drop.slug}`} className="btn btn-outline !min-h-11 !px-4 text-sm">View as a buyer</Link>
          <Link href={`/dashboard/drops/${drop.id}/edit`} className="btn btn-outline !min-h-11 !px-4 text-sm">Edit drop</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
        <div className="lg:order-1">
          <ClaimList
            dropId={drop.id}
            dropStatus={drop.status}
            initialClaims={list}
          />

          {waitlist && waitlist.length > 0 && (
            <section className="mt-8" aria-labelledby="waitlist">
              <h2 id="waitlist" className="text-2xl font-semibold">
                Waitlist
              </h2>
              <p className="mt-1 text-sm text-muted">
                These folks wanted in after you sold out. If more opens up, text or
                call them first. They are also a good sign you can make a bigger
                batch next time.
              </p>
              <div className="tag-card mt-3 p-4">
                <ul className="space-y-1">
                  {waitlist.map((w, i) => (
                    <li key={w.id}>
                      {i + 1}.{" "}
                      <a href={`tel:${w.phone}`} className="text-grove underline">
                        {w.phone}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <CopyButton
                    text={waitlist.map((w) => w.phone).join("\n")}
                    label="Copy waitlist numbers"
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Reserved", `${drop.claimed} of ${drop.quantity}`],
              ["Left", String(Math.max(0, drop.quantity - drop.claimed))],
              ["Views", String(drop.views)],
            ].map(([l, v]) => (
              <div key={l} className="tag-card p-3 text-center sm:p-4">
                <p className="font-display text-2xl font-semibold text-grove">{v}</p>
                <p className="text-xs text-muted">{l}</p>
              </div>
            ))}
          </div>

          <div className="tag-card p-4">
            <p className="font-semibold">Get the link out</p>
            <p className="mt-0.5 text-sm text-muted">Facebook groups are where most reservations come from.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <FacebookShareButton url={url} label="Post to Facebook" />
              <CopyButton text={url} />
            </div>
            <div className="mt-3">
              <NotifyFollowersButton slug={drop.slug} className="btn btn-outline !min-h-11 w-full text-sm" />
            </div>
          </div>

          <div className="toolbar" style={{ "--toolbar-cols": 2 } as React.CSSProperties}>
            <a href={`/api/drops/${drop.id}/report?format=pdf`} className="toolbar-item">Print pickup sheet</a>
            <a href={`/api/drops/${drop.id}/report?format=xlsx`} className="toolbar-item">Download spreadsheet</a>
            <CopyButton
              text={list.map((c) => `${c.buyer_name} ${c.buyer_phone} x${c.quantity}`).join("\n")}
              label="Copy the list as text"
              className="toolbar-item"
            />
            <Link href={`/dashboard/new?from=${drop.id}`} className="toolbar-item">Post again</Link>
          </div>

          <InventoryControl
            dropId={drop.id}
            initialQuantity={drop.quantity}
            claimed={drop.claimed}
          />
        </aside>
      </div>
    </div>
  );
}
