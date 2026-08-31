import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { money, pickupWindow } from "@/lib/format";
import type { Drop } from "@/lib/types";
import BecomeSeller from "./BecomeSeller";

export const dynamic = "force-dynamic";

export const metadata = { title: "My drops" };

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/welcome");
  if (!profile.is_seller) {
    return <BecomeSeller firstName={profile.name.split(" ")[0]} />;
  }

  const [{ data: drops }, { count: subCount }] = await Promise.all([
    supabase
      .from("drops")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">My drops</h1>
          <p className="mt-1 text-muted">
            {profile.farm_name || profile.name}, {profile.town}.{" "}
            {subCount ?? 0} email subscriber{(subCount ?? 0) === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/settings" className="btn btn-outline">
            Settings
          </Link>
          <Link href="/dashboard/new" className="btn btn-primary">
            Post a drop
          </Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted">
        Every drop gets one link. Paste it in your Facebook groups, text it to
        regulars, pin it to your page. That link is your storefront.
      </p>
      <p className="mt-2 text-sm">
        Your public page:{" "}
        <Link href={`/s/${profile.slug}`} className="text-grove underline underline-offset-2">
          groveline.io/s/{profile.slug}
        </Link>
      </p>

      {!drops || drops.length === 0 ? (
        <div className="tag-card mt-8 p-8 text-center">
          <p className="font-display text-xl font-semibold">
            Nothing posted yet.
          </p>
          <p className="mt-2 text-muted">
            Your first drop takes about a minute. Post it tonight, share the
            link, and see what happens Saturday.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary mt-4">
            Post your first drop
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {(drops as Drop[]).map((d) => {
            const left = d.quantity - d.claimed;
            const ended = new Date(d.pickup_end) < new Date();
            return (
              <Link
                key={d.id}
                href={`/dashboard/drops/${d.id}`}
                className="tag-card flex flex-wrap items-center justify-between gap-3 p-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{d.title}</p>
                  <p className="text-sm text-muted">
                    {money(d.price_cents)} each. Pickup{" "}
                    {pickupWindow(d.pickup_start, d.pickup_end)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-display text-xl font-semibold ${
                      d.status === "closed" || left <= 0 || ended
                        ? "text-muted"
                        : "text-grove"
                    }`}
                  >
                    {d.status === "closed"
                      ? "Closed"
                      : `${d.claimed} of ${d.quantity} claimed`}
                  </p>
                  {ended && d.status === "active" && (
                    <p className="text-xs text-muted">
                      Pickup passed, no longer shown in browse
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
