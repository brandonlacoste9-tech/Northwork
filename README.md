# Northernwork

Northernwork is a freelance marketplace for clients and freelancers in Canada. The public site is [northernwork.com](https://northernwork.com).

Rates are in CAD. Profiles name a Canadian city and province. Remote work means remote inside Canada.

Without Supabase credentials the same UI runs a sample-data preview in the browser. With credentials it uses the shared database.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev -- --hostname 0.0.0.0 --port 43127
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127). Leave `.env.local` empty to stay on the sample preview.

## Environment

Copy `.env.example` to `.env.local`. Never commit real values.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Required for the live backend. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key for Auth and the Data API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy fallback used only when the publishable key is empty. |
| `DATABASE_URL` | Session-pooler Postgres URI. The Stripe webhook uses it to record payment status. |
| `STRIPE_SECRET_KEY` | Stripe secret key. Use a test key. Escrow stays off until this is set. |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key, passed to the card form from the server. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `POST /api/webhooks/stripe`. |

Apply `supabase/schema.sql` in the Supabase SQL editor (or with the pooler). It is safe to re-run.

## Tables

- `profiles` — public freelancer profiles, including `avatar_url` and `stripe_account_id`.
- `jobs` — projects in CAD. Status is `open`, `in_progress`, or `closed`.
- `proposals` — one pitch per freelancer per job (`pending`, `accepted`, `declined`).
- `conversations` and `messages` — one thread per accepted pitch. Messages are realtime.
- `conversation_reads` — unread counts in the inbox.
- `reviews` — one review per person per closed job, rating 1–5.
- `payments` — escrow rows (`held`, `released`, `refunded`).
- `stripe_events` — processed webhook event ids, so a replay does not apply twice.
- Storage bucket `avatars` — public read, writes only under `{user-id}/`.

## Messaging

Accepting a pitch sets the project to `in_progress`, declines the other pending pitches, creates the conversation, and opens `/messages/{id}`. The hired freelancer sees a hired state on the project with a link back to that thread. Signed-out visitors cannot read threads. In the sample preview, Messages explains that threads are unavailable.

## Escrow

Escrow is Stripe Connect in test mode. Nothing is charged until `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are set.

1. A freelancer connects an Express account at `/settings/payouts`.
2. On an in-progress project the client funds escrow. Stripe creates a manual-capture PaymentIntent in CAD. The card form authorizes a hold.
3. Release captures the payment and sends it to the freelancer minus a 5% platform fee.
4. While the payment is still held, the client can refund it (the uncaptured PaymentIntent is cancelled).
5. `POST /api/webhooks/stripe` checks the signature and updates `payments` from `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and `charge.refunded`.

A full test-mode charge was not run here because no Stripe secret key was provided.

## Email confirmation

Signup requires email confirmation (`mailer_autoconfirm` is false). A signup attempt from this environment returned `email rate limit exceeded`, so the confirm-then-login walkthrough could not be finished. Confirmation was left on. Email templates were not restyled; this environment has no Supabase Management API token.

## What you can do

- Browse talent and open projects. Filter by province, skill, and CAD rate.
- Sign up, confirm your email, and publish a profile with a photo.
- Post a project, pitch, and accept a pitch into a live thread.
- Close a finished project and leave one review each.
- Connect payouts and, with Stripe test keys, fund, release, or refund escrow.
