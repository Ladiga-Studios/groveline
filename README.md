# Groveline

Local drops, claimed in seconds. Sellers post what they have, share one link, and Groveline tracks who claimed what.

## Setup, start to finish

### 1. Supabase (database and auth)

1. Open your Supabase project, go to the SQL editor, paste the contents of `supabase/schema.sql`, and run it once. That creates every table, policy, the atomic claim function, and the photo storage bucket.
2. In Authentication settings, make sure Email provider is on. The login flow uses email one time codes, which work out of the box. Optional but recommended: in the Email Templates section, edit the OTP template so the code is front and center.
3. Grab your Project URL, anon key, and service role key from Project Settings, API.

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

### 4. Anthropic (the drop writer)

Set `ANTHROPIC_API_KEY`. The "Write it for me" button on the create drop screen sends the seller's rough notes to Claude and fills in a clean title and description. Cheap model, capped output, logged in sellers only. If the key is missing the button politely fails and sellers type it themselves.

### 5. Run it

```
npm install
npm run dev
```

### 6. Deploy to Vercel

Push to your repo, import in Vercel, add the same environment variables, deploy. Point groveline.io at the Vercel project.

## What is in v1

- Post a drop in four fields plus a photo, from a phone
- Shareable drop links with auto generated preview cards for Facebook
- 15 second claim flow, no buyer account needed, cash at pickup
- Live remaining count, per drop waitlist when sold out
- Seller dashboard: claim checklist, picked up toggles, close and reopen
- Buyer browse page with town filter
- Seller profile pages with follow and per seller email lists
- Automatic subscriber email when a seller posts a new drop
- AI drop writer

## Deliberately not in v1

- Card payments. The schema and UI are ready for it (claims have method and paid fields). Wire up Stripe Checkout later and take 5 percent via application fees.
- SMS. Claims store phone numbers, so adding Twilio later is straightforward.
- A native app. The site is mobile first and works as the everyday experience.

## Structure

- `src/app` pages and API routes
- `src/components` UI building blocks
- `src/lib` Supabase clients, types, formatters
- `supabase/schema.sql` the whole database
