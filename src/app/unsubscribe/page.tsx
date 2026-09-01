import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; e?: string }>;
}) {
  const { s, e } = await searchParams;
  let ok = false;
  if (s && e) {
    try {
      const admin = supabaseAdmin();
      const { error } = await admin
        .from("newsletter_subscribers")
        .delete()
        .eq("seller_id", s)
        .eq("email", e.toLowerCase());
      ok = !error;
    } catch {
      ok = false;
    }
  }
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold">
        {ok ? "You're unsubscribed." : "That didn't quite work."}
      </h1>
      <p className="mt-3 text-muted">
        {ok
          ? "No more emails from this seller. If you're also following them with an account, unfollow on their page and that'll stop too."
          : "That unsubscribe link isn't working right now. Try the link from the email one more time."}
      </p>
      <Link href="/browse" className="btn btn-primary mt-6">
        Browse drops
      </Link>
    </div>
  );
}
