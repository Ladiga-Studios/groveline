import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ShopForm from "@/components/ShopForm";
import DeleteShop from "./DeleteShop";
import type { Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: shop } = await supabase.from("shops").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle<Shop>();
  if (!shop) notFound();

  // How many drops are still taking reservations, so the delete warning
  // can say what's actually at stake rather than a generic caution.
  const { count: openDrops } = await supabase
    .from("drops")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", shop.id)
    .eq("status", "active");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-semibold">Touch up this shop</h1>
      <div className="mt-6"><ShopForm shop={shop} /></div>
      <DeleteShop shopId={shop.id} shopName={shop.name} openDrops={openDrops ?? 0} />
    </div>
  );
}
