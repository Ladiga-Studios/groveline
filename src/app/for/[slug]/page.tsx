import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import DropCard from "@/components/DropCard";
import Reveal from "@/components/Reveal";
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

/* A short landing page per kind of seller. It shows what Groveline looks
   like for their goods, then hands off to /sell for the full walkthrough. */
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
    .limit(4);
  const others = FOR_PAGES.filter((x) => x.slug !== slug);
  const browseHref = `/browse?group=${p.groups[0]}`;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="rise text-sm font-medium text-leaf">{p.heading}</p>
            <h1 className="rise mt-1 text-4xl font-semibold">{p.title}</h1>
            <p className="rise rise-1 mt-4 max-w-xl text-lg">{p.intro}</p>
            <div className="rise rise-2 mt-6 flex flex-wrap gap-3">
              <Link href="/sell" className="btn btn-primary">See how selling works</Link>
              <Link href={browseHref} className="btn btn-outline">{p.browseLabel}</Link>
            </div>
          </div>
          <Image
            src={p.image}
            alt={p.imageAlt}
            width={p.imageWidth}
            height={p.imageHeight}
            className="rise rise-2 mx-auto w-full max-w-md rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 448px"
            priority
          />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {p.points.map((pt, i) => (
            <Reveal key={pt.t} delay={i * 70}>
              <div className="tag-card h-full p-5">
                <h2 className="font-semibold">{pt.t}</h2>
                <p className="mt-1 text-muted">{pt.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {drops && drops.length > 0 && (
        <section className="bg-cream-dark/50 px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold">Available right now</h2>
              <Link href={browseHref} className="font-medium text-grove underline underline-offset-2">See all</Link>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">{(drops as Drop[]).map((d) => <DropCard key={d.id} drop={d} />)}</div>
          </div>
        </section>
      )}

      {/* Everything else lives on the selling page. Send them there. */}
      <section className="bg-grove text-cream">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h2 className="text-3xl font-semibold">Ready to post your first batch?</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-cream/90">
            Pricing, payments, shipping, and the full walkthrough are all on the selling page. Your first three
            drops are free.
          </p>
          <Link href="/sell" className="btn btn-primary mt-6 text-lg">Go to the selling page</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-semibold text-muted">Also on Groveline</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {others.map((o) => (
            <Link key={o.slug} href={`/for/${o.slug}`} className="btn btn-outline !min-h-11 !px-4">{o.heading}</Link>
          ))}
        </div>
      </section>
    </>
  );
}
