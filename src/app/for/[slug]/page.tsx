import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { forPage, FOR_PAGES } from "@/lib/for";
import type { Drop } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = forPage(slug);
  if (!p) return { title: "Not found" };
  return { title: p.title, description: p.intro, alternates: { canonical: `/for/${slug}` } };
}

export default async function ForPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = forPage(slug);
  if (!p) notFound();

  const values = CATEGORY_GROUPS.filter((g) => p.groups.includes(g.id)).flatMap((g) => g.items.map((i) => i.value));
  const supabase = await supabaseServer();
  const { data: drops } = await supabase
    .from("drops")
    .select("*, shops!drops_seller_id_fkey(name, town, state, slug, avatar_url)")
    .eq("status", "active")
    .gte("pickup_end", new Date().toISOString())
    .in("category", values)
    .order("pickup_start", { ascending: true })
    .limit(6);
  const others = FOR_PAGES.filter((x) => x.slug !== slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-leaf">{p.heading}</p>
          <h1 className="mt-1 text-4xl font-semibold">{p.title}</h1>
          <p className="mt-4 text-lg">{p.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?mode=register" className="btn btn-primary">{p.ctaSell}</Link>
            <Link href={`/browse?group=${p.groups[0]}`} className="btn btn-outline">See what is for sale</Link>
          </div>
        </div>
        <Image src={p.image} alt={p.imageAlt} width={1254} height={1254} className="mx-auto w-full max-w-md rounded-2xl" sizes="(max-width: 1024px) 100vw, 448px" priority />
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {p.points.map((pt) => (
          <div key={pt.t} className="tag-card p-5">
            <h2 className="font-semibold">{pt.t}</h2>
            <p className="mt-1 text-muted">{pt.d}</p>
          </div>
        ))}
      </div>

      {drops && drops.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold">Claimable right now</h2>
            <Link href={`/browse?group=${p.groups[0]}`} className="text-grove underline">See all</Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">{(drops as Drop[]).map((d) => <DropCard key={d.id} drop={d} />)}</div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-muted">Also on Groveline</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {others.map((o) => (
            <Link key={o.slug} href={`/for/${o.slug}`} className="btn btn-outline !min-h-11 !px-4">{o.heading}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
