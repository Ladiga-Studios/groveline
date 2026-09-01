import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentShop } from "@/lib/shops";
import { money, whenLabel } from "@/lib/format";
import type { Drop } from "@/lib/types";
import BecomeSeller from "./BecomeSeller";
import Avatar from "@/components/Avatar";
import ShopSwitch from "./shops/ShopSwitch";

export const dynamic = "force-dynamic";
export const metadata = { title: "My drops" };

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/welcome");

  const { shop, shops } = await getCurrentShop(supabase, user.id);
  if (!shop) return <BecomeSeller firstName={profile.name.split(" ")[0]} town={profile.town} state={profile.state} />;

  const stripeOn = !!process.env.STRIPE_SECRET_KEY && !!(process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID);
  const shopIds = shops.map((s) => s.id);
  const [{ data: drops }, { count: subCount }, { data: billing }, { count: totalDrops }] = await Promise.all([
    supabase.from("drops").select("*").eq("seller_id", shop.id).neq("status", "removed").order("created_at", { ascending: false }),
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("seller_id", shop.id),
    stripeOn ? supabase.from("billing").select("subscription_status").eq("profile_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("drops").select("*", { count: "exact", head: true }).in("seller_id", shopIds),
  ]);
  const subscribed = ["active", "trialing", "past_due"].includes(billing?.subscription_status ?? "none");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {shops.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Working in:</span>
          {shops.map((s) => (
            s.id === shop.id ? (
              <span key={s.id} className="inline-flex items-center gap-2 rounded-full bg-grove py-1 pl-1 pr-3 text-sm font-medium text-cream">
                <Avatar url={s.avatar_url} name={s.name} size={24} /> {s.name}
              </span>
            ) : (
              <ShopSwitch key={s.id} shopId={s.id} label={s.name} />
            )
          ))}
          <Link href="/dashboard/shops" className="text-sm text-grove underline">Manage shops</Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar url={shop.avatar_url} name={shop.name} size={48} />
          <div>
            <h1 className="text-3xl font-semibold">{shop.name}</h1>
            <p className="text-muted">{shop.town}. {subCount ?? 0} email subscriber{(subCount ?? 0) === 1 ? "" : "s"}.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/shops/${shop.id}`} className="btn btn-outline">Edit shop</Link>
          <Link href="/dashboard/new" className="btn btn-primary">Post a drop</Link>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        Every drop gets one link. Paste it in your Facebook groups, text it to regulars, pin it to your page. That link is your storefront.
      </p>
      {stripeOn && !subscribed && !profile.is_admin && (
        <p className="mt-2 text-sm">
          <span className="font-medium">{Math.min(3, totalDrops ?? 0)} of 3 free drops used.</span>{" "}
          {(totalDrops ?? 0) >= 3 ? "Subscribe to keep posting." : "After that it is $10 a month or $60 a year."}{" "}
          <Link href="/dashboard/settings" className="text-grove underline">Plans</Link>
        </p>
      )}
      <p className="mt-2 text-sm">
        Your public page: <Link href={`/s/${shop.slug}`} className="text-grove underline underline-offset-2">groveline.io/s/{shop.slug}</Link>
        {shops.length === 1 && <> · <Link href="/dashboard/shops/new" className="text-grove underline underline-offset-2">Add another shop</Link></>}
      </p>

      {!drops || drops.length === 0 ? (
        <div className="tag-card mt-8 p-8 text-center">
          <Image src="/illustrations/sprout.jpg" alt="" width={1254} height={1254} className="mx-auto h-32 w-auto" />
          <p className="mt-4 font-display text-xl font-semibold">Nothing posted yet.</p>
          <p className="mt-2 text-muted">Your first drop takes about a minute. Post it tonight, share the link, and see what happens Saturday.</p>
          <Link href="/dashboard/new" className="btn btn-primary mt-4">Post your first drop</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {(drops as Drop[]).map((d) => {
            const left = d.quantity - d.claimed;
            const ended = new Date(d.pickup_end) < new Date();
            return (
              <Link key={d.id} href={`/dashboard/drops/${d.id}`} className="tag-card flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{d.title}</p>
                  <p className="text-sm text-muted">{money(d.price_cents)} each. {whenLabel(d)}. {d.views} views</p>
                </div>
                <div className="text-right">
                  <p className={`font-display text-xl font-semibold ${d.status === "closed" || left <= 0 || ended ? "text-muted" : "text-grove"}`}>
                    {d.status === "closed" ? "Closed" : `${d.claimed} of ${d.quantity} claimed`}
                  </p>
                  {ended && d.status === "active" && <p className="text-xs text-muted">Pickup passed, no longer shown in browse</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
