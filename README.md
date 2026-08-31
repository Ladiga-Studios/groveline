# Groveline

Local drops, claimed in seconds. Sellers post what they have, share one link, and Groveline tracks who claimed what.

## Setup, start to finish

### 1. Supabase (database and auth)

1. Open your Supabase project, go to the SQL editor, and run every file in `supabase/migrations/` in numbered order, one at a time. That creates every table, policy, the atomic claim function, and the photo storage bucket. All future schema changes land in that folder as new numbered files, see `supabase/README.md` for the rules.
2. In Authentication, Sign In / Providers, make sure Email is enabled, then turn OFF "Confirm email". The app uses normal email and password login, and with confirmation off, people can sign up and use it immediately with no email step.
3. Recommended: point Supabase auth emails (password resets) at your Resend account. In Project Settings, Authentication, SMTP, enable custom SMTP with Resend's SMTP credentials. Supabase's built in mailer only sends a couple emails per hour, which is why OTP codes were unreliable.
4. Grab your Project URL, anon key, and service role key from Project Settings, API.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SITE_URL=https://groveline.io
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
RESEND_API_KEY=...
RESEND_FROM="Groveline <hello@groveline.io>"
```

The service role key stays server side only. It powers the atomic claim function and email sends.

### 3. Resend (email)

1. Verify the groveline.io domain in Resend so mail comes from your address.
2. Set `RESEND_FROM` to a verified sender.

Emails sent: buyer claim confirmations (when they leave an email) and new drop announcements to a seller's subscriber list. If `RESEND_API_KEY` is missing, the app runs fine and just skips email.

### 4. Anthropic (content moderation)

Set `ANTHROPIC_API_KEY`. Every drop, on posting or editing, gets checked in one API call that looks at all the photos and the listing text together and rejects anything with nudity, graphic content, or spammy text before it ever goes live. This costs a small fraction of a cent per drop since it's a single cheap-model call regardless of how many photos are attached. If the key is missing, drops post without a moderation check rather than sellers getting stuck, so don't skip this in production.

### 5. Cloudflare Turnstile (optional, stops bot reservations)

Free, and reuses the same Cloudflare account already handling your DNS. In the Cloudflare dashboard, add a Turnstile site for groveline.io, choose the invisible/managed widget, and you'll get a site key and a secret key. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Leave both blank and reservations still work, just without this extra bot check, the honeypot field and timing check still apply either way.

### 6. Stripe (card payments and the subscription)

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Create a recurring $10/month price in the Stripe dashboard and put its id (starts with `price_`) in `STRIPE_PRICE_ID`. Add a webhook endpoint at `https://groveline.io/api/stripe/webhook` listening for `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.updated`, `customer.subscription.deleted`, and `account.updated`. Enable Stripe Connect (Express) in your Stripe settings so sellers can onboard.

How it works: sellers set up payouts from Settings and money goes straight to their bank. When a buyer pays by card, a hold is placed at reservation and only captured when the seller marks the claim picked up. Removing a claim or the buyer cancelling releases the hold. Leave Stripe blank and everything runs cash-only with no subscription gate.

### 7. Daily jobs

`vercel.json` schedules `/api/cron/daily` once a day. It emails pickup reminders to buyers who left an email, and releases card reservations that never finished checkout. Set `CRON_SECRET` in Vercel to lock the route.

### 8. Make yourself admin

In the Supabase table editor, set `is_admin` to true on your own profile row. That unlocks `/admin` (reports, takedowns) and exempts you from the subscription.

### 9. Run it

```
npm install
npm run dev
```

### 10. Deploy to Vercel

Push to your repo, import in Vercel, add the same environment variables, deploy. Point groveline.io at the Vercel project.

## What is in v1

- Post a drop in a few fields plus up to 10 photos, drag and drop on desktop or tap to choose anywhere
- Every photo and the listing text checked automatically before a drop goes live
- Shareable drop links with auto generated preview cards for Facebook
- 15 second claim flow, no buyer account needed, cash at pickup
- Spam defenses on reservations: a honeypot field, a minimum time-on-page check, and optional Cloudflare Turnstile
- Live remaining count, per drop waitlist when sold out
- Seller dashboard: claim checklist, picked up toggles, close and reopen, remove a bad claim and it frees the inventory back up
- Buyer browse page with search, category, town, and state filters
- Seller profile pages with follow and per seller email lists
- Automatic subscriber and follower email when a seller posts a new drop
- 130 plus categories in 13 groups, browse sidebar shows counts and grays out empties
- Pickup addresses geocoded for free via OpenStreetMap, with an embedded map and a directions button
- Seller profiles with photo, stats, and share; a sellers directory
- Buyers get a reservation page they can cancel from, plus a My reservations list when logged in
- Sellers get an email on each reservation and cancellation (can be turned off)
- Card payments through Stripe Connect with a hold at reservation and capture at pickup
- $10/month subscription after the first free drop, managed through Stripe
- Pickup day reminder emails, listing reports, admin takedowns, view counts, post again

## Deliberately not in v1

- Card payments. The schema and UI are ready for it (claims have method and paid fields). Wire up Stripe Checkout later and take 5 percent via application fees.
- SMS. Claims store phone numbers, so adding Twilio later is straightforward.
- A native app. The site is mobile first and works as the everyday experience.

## Structure

- `src/app` pages and API routes
- `src/components` UI building blocks
- `src/lib` Supabase clients, types, formatters
- `supabase/migrations/` the whole database, one numbered file per change
