import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import FollowButton from "@/components/FollowButton";
import NewsletterForm from "@/components/NewsletterForm";
import type { Drop, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: seller } = await supabase
    .from("profiles")
    .select("name, farm_name, town, bio")
    .eq("slug", slug)
    .maybeSingle();
  if (!seller) return { title: "Seller not found" };
  const name = seller.farm_name || seller.name;
  return {
    title: `${name} in ${seller.town}`,
    description:
      seller.bio ||
      `Drops from ${name} in ${seller.town}. Follow to catch every batch.`,
    alternates: { canonical: `/s/${slug}` },
  };
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: seller } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<Profile>();
  if (!seller) notFound();

  const [{ data: drops }, userRes] = await Promise.all([
    supabase
      .from("drops")
      .select("*, profiles!drops_seller_id_fkey(name, farm_name, town, slug)")
      .eq("seller_id", seller.id)
      .eq("status", "active")
      .gte("pickup_end", new Date().toISOString())
      .order("pickup_start", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const user = userRes.data.user;
  let following = false;
  if (user) {
    const { data: f } = await supabase
      .from("follows")
      .select("buyer_id")
      .eq("buyer_id", user.id)
      .eq("seller_id", seller.id)
      .maybeSingle();
    following = !!f;
  }

  const name = seller.farm_name || seller.name;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{name}</h1>
          <p className="mt-1 text-muted">{seller.town}, Alabama</p>
        </div>
        <FollowButton
          sellerId={seller.id}
          initiallyFollowing={following}
          loggedIn={!!user}
        />
      </div>

      {seller.bio && <p className="mt-4 text-lg">{seller.bio}</p>}

      <section className="mt-8" aria-labelledby="active-drops">
        <h2 id="active-drops" className="text-2xl font-semibold">
          Active drops
        </h2>
        {drops && drops.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {(drops as Drop[]).map((d) => (
              <DropCard key={d.id} drop={d} />
            ))}
          </div>
        ) : (
          <p className="tag-card mt-4 p-6 text-muted">
            Nothing active right now. Follow or join the email list below to
            catch the next one.
          </p>
        )}
      </section>

      <section className="tag-card mt-8 p-6" aria-labelledby="newsletter">
        <h2 id="newsletter" className="text-xl font-semibold">
          Get an email when {name} posts a drop
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          One email per drop, nothing else. Unsubscribe any time.
        </p>
        <NewsletterForm sellerId={seller.id} />
      </section>
    </div>
  );
}
