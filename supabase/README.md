# Database migrations

Every schema change lives here as a numbered file. Nothing gets edited after
it ships, new changes get a new file.

## Rules

1. One file per change, numbered in order: 0003_whatever_it_does.sql next.
2. Run them in order in the Supabase SQL editor. Each file runs once.
3. Never edit a migration that has already been run in production. Write a
   new one that alters what you need.
4. Keep migrations safe to re-run where possible (if not exists, drop
   constraint if exists, on conflict do nothing).

## Already run in production

- 0001_initial_schema.sql (applied via the one time reset script)
- 0002_add_drop_categories.sql

## Needs to be run

- 0003_add_profile_state.sql
- 0004_claim_removal_and_follower_emails.sql

## History

- 0001: profiles, drops, claims, waitlist, follows, newsletter subscribers,
  the atomic claim_drop function, all RLS policies, drop-photos bucket
- 0002: category column on drops for browse filtering
- 0003: state column on profiles for browse filtering
- 0004: profile emails for follower notifications, atomic remove_claim function
