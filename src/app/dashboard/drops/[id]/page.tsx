import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { money, whenLabel } from "@/lib/format";
import type { Claim, Drop } from "@/lib/types";
import Link from "next/link";
import ClaimList, { InventoryControl } from "./ClaimList";
import CopyButton from "@/components/CopyButton";
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

  const { data: drop } = await supabase
    .from("drops")
    .select("*")
    .eq("id", id)
    .eq("seller_id", user.id)
    .maybeSingle<Drop>();
  if (!drop) notFound();

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{drop.title}</h1>
      <p className="mt-1 text-muted">
        {money(drop.price_cents)} each. {whenLabel(drop)}{drop.pickup_place ? ` at ${drop.pickup_place}` : ""}.
      </p>
      <p className="mt-3 font-display text-2xl font-semibold text-grove">
        {drop.claimed} of {drop.quantity} claimed
        <span className="ml-3 text-base font-normal text-muted">{drop.views} views</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/dashboard/drops/${drop.id}/edit`} className="btn btn-outline">
          Edit drop
        </Link>
        <Link href={`/dashboard/new?from=${drop.id}`} className="btn btn-outline">
          Post again
        </Link>
        <NotifyFollowersButton slug={drop.slug} />
        <CopyButton text={url} />
        <CopyButton
          text={(claims ?? [])
            .map((c) => `${c.buyer_name} ${c.buyer_phone} x${c.quantity}`)
            .join("\n")}
          label="Copy claim list"
        />
      </div>

      <InventoryControl
        dropId={drop.id}
        initialQuantity={drop.quantity}
        claimed={drop.claimed}
      />

      <ClaimList
        dropId={drop.id}
        dropStatus={drop.status}
        initialClaims={(claims ?? []) as Claim[]}
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
  );
}
