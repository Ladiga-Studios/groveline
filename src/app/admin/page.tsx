import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import TakeDownButton from "./TakeDownButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = supabaseAdmin();
  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) redirect("/");

  const { data: messages } = await admin.from("support_messages").select("id, name, email, topic, message, created_at, handled").order("created_at", { ascending: false }).limit(30);
  const [{ data: reports }, { data: drops }, { count: sellers }, { count: buyers }, { count: claims }] = await Promise.all([
    admin.from("reports").select("*, drops(title, slug, status)").eq("resolved", false).order("created_at", { ascending: false }).limit(50),
    admin.from("drops").select("id, title, slug, status, created_at, views, claimed, quantity, shops!drops_seller_id_fkey(name)").order("created_at", { ascending: false }).limit(40),
    admin.from("shops").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("claims").select("*", { count: "exact", head: true }).is("cancelled_at", null),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Admin</h1>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {[["Shops", sellers ?? 0], ["Accounts", buyers ?? 0], ["Reservations", claims ?? 0]].map(([l, v]) => (
          <div key={String(l)} className="tag-card p-4 text-center">
            <dd className="font-display text-2xl font-semibold text-grove">{v}</dd>
            <dt className="text-xs text-muted">{l}</dt>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-xl font-semibold">Support messages</h2>
      {!messages?.length ? (
        <p className="tag-card mt-3 p-4 text-muted">Nothing in the inbox.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {messages.map((m) => (
            <div key={m.id} className="tag-card p-4">
              <p className="text-sm text-muted">{new Date(m.created_at).toLocaleString("en-US")} · {m.topic}</p>
              <p className="mt-1 font-semibold">{m.name} <a href={`mailto:${m.email}`} className="font-normal text-grove underline">{m.email}</a></p>
              <p className="mt-1 whitespace-pre-line text-sm">{m.message}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-xl font-semibold">Reports that need a look</h2>
      {!reports?.length ? (
        <p className="tag-card mt-3 p-4 text-muted">Nothing reported. Quiet day.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {reports.map((r) => {
            const d = Array.isArray(r.drops) ? r.drops[0] : r.drops;
            return (
              <div key={r.id} className="tag-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{r.reason} on <Link href={`/d/${d?.slug}`} className="text-grove underline">{d?.title}</Link></p>
                  {r.details && <p className="text-sm text-muted">{r.details}</p>}
                  {r.reporter_email && <p className="text-xs text-muted">{r.reporter_email}</p>}
                </div>
                {d?.status !== "removed" && <TakeDownButton dropId={r.drop_id} />}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-10 text-xl font-semibold">What's been posted lately</h2>
      <div className="mt-3 grid gap-2">
        {(drops ?? []).map((d) => {
          const s = Array.isArray(d.shops) ? d.shops[0] : d.shops;
          return (
            <div key={d.id} className="tag-card flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <Link href={`/d/${d.slug}`} className="font-semibold text-grove underline">{d.title}</Link>
                <span className="text-muted"> by {s?.name}. {d.claimed}/{d.quantity} claimed, {d.views} views, {d.status}</span>
              </div>
              {d.status !== "removed" && <TakeDownButton dropId={d.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
