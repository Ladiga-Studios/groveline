import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ShopForm from "@/components/ShopForm";
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
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-semibold">Edit shop</h1>
      <div className="mt-6"><ShopForm shop={shop} /></div>
    </div>
  );
}
