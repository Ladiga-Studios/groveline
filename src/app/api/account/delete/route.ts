import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";
import { cancelSubscriptionNow, settleBuyerClaims, settleShopBeforeDelete } from "@/lib/deletion";

export const runtime = "nodejs";

/* Close an account for good.

   Everything that involves other people or money is settled first, and any
   failure stops the whole thing rather than leaving a half-deleted account
   with live card holds attached to it:

     1. Cancel the Groveline subscription outright, so Stripe stops billing
        a customer whose account is about to stop existing.
     2. For every shop they own, cancel open reservations, release or
        refund the money, and email those buyers.
     3. For their own reservations as a buyer, cancel the live ones, tell
        those sellers, and strip their details off the rest.
     4. Delete the auth user, which cascades the profile, shops, drops,
        claims on those drops, follows, newsletter rows, and billing.

   Their Stripe connected account is deliberately left alone. It belongs to
   them, not to Groveline, and it holds their payout history and tax
   records. We just stop pointing at it. */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if ((confirm ?? "").trim().toUpperCase() !== "DELETE") {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, email")
    .eq("id", user.id)
    .maybeSingle();
  const name = profile?.name || "Someone";
  const email = profile?.email || user.email || null;

  // 1. Money first. If Stripe is unreachable, stop here.
  const subCancelled = await cancelSubscriptionNow(user.id);
  if (!subCancelled.ok) return NextResponse.json({ error: subCancelled.error }, { status: 502 });

  // 2. Their shops, and everyone holding a reservation on one.
  const { data: shops } = await admin.from("shops").select("id, name").eq("owner_id", user.id);
  for (const shop of shops ?? []) {
    const settled = await settleShopBeforeDelete(
      shop.id,
      shop.name,
      "The seller closed their Groveline account."
    );
    if (!settled.ok) return NextResponse.json({ error: settled.error }, { status: 502 });
  }

  // 3. Their own reservations, and the sellers counting on them.
  const buyerSettled = await settleBuyerClaims(user.id, name);
  if (!buyerSettled.ok) return NextResponse.json({ error: buyerSettled.error }, { status: 502 });

  const { count } = await admin
    .from("claims")
    .select("id", { count: "exact", head: true })
    .not("anonymized_at", "is", null);

  // 4. The account itself. Deleting the auth user cascades everything
  //    below it through the foreign keys.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account delete failed:", error.message);
    return NextResponse.json(
      { error: "Something went wrong closing the account. Nothing else was changed. Email hello@groveline.io and we'll do it by hand." },
      { status: 500 }
    );
  }

  await admin.from("deletion_log").insert({
    kind: "account",
    subject_id: user.id,
    subject_name: name,
    contact_email: email,
    claims_anonymized: count ?? 0,
  });

  if (email) {
    sendEmail(
      email,
      "Your Groveline account is closed",
      `Your account has been deleted, along with your shops, drops, and reservations. Any plan you were on has been cancelled and you won't be charged again.\n\nIf you sold with cards, your Stripe account is still yours and still holds your payout and tax records. Groveline just no longer points at it.\n\nIf you didn't do this, email hello@groveline.io right away.\n\nYou're welcome back any time: ${siteUrl()}`
    );
  }

  return NextResponse.json({ ok: true });
}
