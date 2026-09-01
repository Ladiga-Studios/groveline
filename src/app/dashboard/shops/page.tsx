import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentShop } from "@/lib/shops";
import Avatar from "@/components/Avatar";
import ShopSwitch from "./ShopSwitch";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My shops" };

export default async function ShopsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { shop: current, shops } = await getCurrentShop(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">My shops</h1>
        <Link href="/dashboard/shops/new" className="btn btn-primary">Add a shop</Link>
      </div>
      <p className="mt-2 text-muted">Each shop has its own page, link, followers, and drops. Pick the one you are working in.</p>
      <div className="mt-6 grid gap-3">
        {shops.map((s) => (
          <div key={s.id} className={`tag-card flex flex-wrap items-center gap-4 p-4 ${current?.id === s.id ? "border-leaf" : ""}`}>
            <Avatar url={s.avatar_url} name={s.name} size={48} />
            <div className="min-w-0 grow">
              <p className="truncate font-semibold">{s.name}{current?.id === s.id && <span className="ml-2 rounded-full bg-cream-dark px-2 py-0.5 text-xs font-medium">Working in</span>}</p>
              <p className="text-sm text-muted">groveline.io/s/{s.slug}</p>
            </div>
            <div className="flex gap-2">
              {current?.id !== s.id && <ShopSwitch shopId={s.id} />}
              <Link href={`/dashboard/shops/${s.id}`} className="btn btn-outline !min-h-10 !px-4 text-sm">Edit</Link>
              <Link href={`/s/${s.slug}`} className="btn btn-outline !min-h-10 !px-4 text-sm">View</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
