import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { money, pickupWindow } from "@/lib/format";
import type { Claim, Drop } from "@/lib/types";
import ClaimList from "./ClaimList";
import CopyButton from "@/components/CopyButton";

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

  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("drop_id", id)
    .order("created_at", { ascending: true });

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io"}/d/${drop.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{drop.title}</h1>
      <p className="mt-1 text-muted">
        {money(drop.price_cents)} each. Pickup{" "}
        {pickupWindow(drop.pickup_start, drop.pickup_end)} at {drop.pickup_place}.
      </p>
      <p className="mt-3 font-display text-2xl font-semibold text-grove">
        {drop.claimed} of {drop.quantity} claimed
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <CopyButton text={url} />
        <CopyButton
          text={(claims ?? [])
            .map((c) => `${c.buyer_name} ${c.buyer_phone} x${c.quantity}`)
            .join("\n")}
          label="Copy claim list"
        />
      </div>

      <ClaimList
        dropId={drop.id}
        dropStatus={drop.status}
        initialClaims={(claims ?? []) as Claim[]}
      />
    </div>
  );
}
