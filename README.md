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

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. In the Stripe dashboard create one product (the seller subscription) with two recurring prices, $10 monthly and $60 yearly, and put their ids (start with `price_`) in `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_YEARLY`. Yearly is optional; leave it blank to offer monthly only. Add a webhook endpoint at `https://groveline.io/api/stripe/webhook` listening for `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.updated`, `customer.subscription.deleted`, and `account.updated`. Enable Stripe Connect (Express) in your Stripe settings so sellers can onboard.

Stripe dashboard checklist for card payments to work:

1. Settings, Connect, click Get started and complete the platform profile (your business info, what you're building). Stripe won't let sellers onboard until this is done.
2. Settings, Connect, Branding: add the Groveline name, icon, and green so sellers see it during onboarding.
3. Developers, Webhooks: add `https://groveline.io/api/stripe/webhook` with the five events listed above. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Create a **second** event destination, scoped to **Connected accounts**, pointing at the same URL, listening for `checkout.session.completed` and `checkout.session.expired`. Card payments are direct charges created on the seller's account, so those events fire there rather than on the platform account, and without this destination a payment succeeds but Groveline never marks it authorized. Put its signing secret in `STRIPE_WEBHOOK_SECRET_CONNECT`. The route accepts either secret.
5. Flip the dashboard to Live mode and make sure the keys in Vercel are the live ones (`sk_live_...`), not test keys.
6. Post a real drop, turn on card payments in Settings, complete the Express onboarding yourself, and reserve it with a real card from another browser. Then mark it picked up and watch the charge land.

Free month code: set `FREE_MONTH_CODE` (for example `LADIGA`). When a first-time subscriber enters it on `/pricing`, they get a real 30-day free trial on whichever plan they pick, monthly or yearly. Stripe collects their card up front and the first charge lands after 30 days. Anyone who has ever subscribed before is told the code is for first-timers. No coupon needs to exist in Stripe for this one.

Other codes: any promotion code you create in Stripe (Product catalog, Coupons, Add promotion code) also works on `/pricing` and in Stripe's own box at checkout.

Cancelling: sellers get a "Cancel my plan" button in Settings that ends the plan at the close of the current period, with an undo. "Update card or switch plans" opens Stripe's Customer Portal. For the portal to work you must enable it once in the Stripe dashboard: Settings, Billing, Customer portal. Turn on "Cancel subscriptions" and "Switch plans" and add both prices to the switchable list.

Card payments are **direct charges** created on the seller's connected account. The charge, the statement descriptor the buyer sees, Stripe's processing fee, and any dispute all belong to the seller, exactly as if they ran the card at their own booth. Groveline takes no application fee. Connected accounts are Express by default (a short in-app signup for sellers). Stripe bills the platform about $2 per month for each Express account that gets a payout that month. Set `STRIPE_CONNECT_TYPE=standard` to switch to Standard accounts, which have no monthly fee but ask the seller to create a full Stripe login. Either way Stripe's card processing fee (about 2.9% plus 30 cents) comes out of each card payment, and Groveline takes nothing.

How it works: sellers set up payouts from Settings and money goes straight to their bank. When a buyer pays by card, a hold is placed at reservation and only captured when the seller marks the claim picked up. Removing a claim or the buyer cancelling releases the hold. Leave Stripe blank and everything runs cash-only with no subscription gate.

### 7. Scheduled jobs

`vercel.json` schedules two routes. `/api/cron/hourly` sends each seller one summary email of new reservations (unless they chose one email per reservation in Settings). `/api/cron/daily` emails pickup reminders to buyers the day before, and releases card reservations that never finished checkout. Set `CRON_SECRET` in Vercel to lock both routes.

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
- Subscription after three free drops, $10/month or $60/year, managed through Stripe
- Shipping as an option per drop, paid by card, charged when the seller marks it shipped
- Custom links per drop (groveline.io/d/whatever-you-want)
- Terms and privacy acceptance at signup and on every reservation
- Seller contact info on their page, hourly reservation digests, one-tap update emails to followers
- A following page for buyers, and sellers can follow each other
- One account can run several shops, each with its own page, photo, link, followers, and drops
- Public profile page for every account showing their shops and who they follow
- Printable pickup sheet (PDF) and spreadsheet export per drop
- Themed landing pages: /for/kitchen, /for/workshop, /for/greenhouse, /for/fundraisers
- Support page at /support with a contact form that saves to the database and emails `SUPPORT_EMAIL` (falls back to `ADMIN_EMAIL`), with reply-to set to the sender. Spam protection is a time-on-page check, Turnstile when configured, and a per-IP limit. No honeypot, because browser autofill fills honeypots and loses real messages.
- Share to Facebook buttons that hand the post over with photo, title, price, and description
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
