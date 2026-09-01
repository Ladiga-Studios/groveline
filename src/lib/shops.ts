import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Shop } from "./types";

export const SHOP_COOKIE = "groveline_shop";

/* Every shop this user owns, oldest first. */
export async function getMyShops(supabase: SupabaseClient, userId: string): Promise<Shop[]> {
  const { data } = await supabase.from("shops").select("*").eq("owner_id", userId).order("created_at", { ascending: true });
  return (data ?? []) as Shop[];
}

/* The shop the seller is currently working in: the one in the cookie if
   it's theirs, otherwise their first. Null if they have none. */
export async function getCurrentShop(supabase: SupabaseClient, userId: string): Promise<{ shop: Shop | null; shops: Shop[] }> {
  const shops = await getMyShops(supabase, userId);
  if (shops.length === 0) return { shop: null, shops };
  const store = await cookies();
  const wanted = store.get(SHOP_COOKIE)?.value;
  const shop = shops.find((s) => s.id === wanted) ?? shops[0];
  return { shop, shops };
}
