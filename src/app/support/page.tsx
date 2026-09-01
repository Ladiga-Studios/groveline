import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import SupportForm from "./SupportForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Support",
  description: "Get in touch with the people who run Groveline. We read everything and reply by email.",
  alternates: { canonical: "/support" },
};

const quick = [
  ["I reserved something and need to cancel", "Open the reservation page from your confirmation email, or from My reservations if you have an account. There's a cancel button right there."],
  ["Something was wrong with what I bought", "The seller is the one who can make it right. Their contact info is on their shop page, and if you have an account, on your reservation."],
  ["I'm a seller and card payments aren't working", "Check Settings to see if payouts say they're on. If Stripe is still reviewing you, it can take a day. If it's been longer, message us below."],
  ["I want to cancel my plan", "Settings, then Cancel my plan. You keep everything through the end of what you paid for."],
];

export default async function SupportPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let prefill: { name?: string; email?: string } | undefined;
  if (user) {
    const { data: p } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    prefill = { name: p?.name, email: user.email ?? undefined };
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Need a hand?</h1>
      <p className="mt-3 max-w-2xl text-lg">
        Groveline is a small operation and a real person reads every message. Tell us what&apos;s going on and
        we&apos;ll get back to you by email, usually within a day.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-xl font-semibold">Quick answers</h2>
          <div className="mt-3 space-y-3">
            {quick.map(([q, a]) => (
              <div key={q} className="tag-card p-4">
                <p className="font-semibold">{q}</p>
                <p className="mt-1 text-sm text-muted">{a}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Or just email <a href="mailto:hello@groveline.io" className="text-grove underline">hello@groveline.io</a>.
            More in the <Link href="/sell" className="text-grove underline">seller FAQ</Link> and <Link href="/pricing" className="text-grove underline">pricing</Link>.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Send us a message</h2>
          <div className="mt-3"><SupportForm prefill={prefill} /></div>
        </div>
      </div>
    </div>
  );
}
