# Northernwork

Northernwork is a freelance marketplace for clients and freelancers in Canada. The public site is [northernwork.ca](https://northernwork.ca).

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
- `jobs` — projects in CAD. Status is `open`, `in_progress`, or `closed`. Optional `budget_max_cad` and `duration`.
- `proposals` — one pitch per freelancer per job (`pending`, `accepted`, `declined`).
- `conversations` and `messages` — one thread per accepted pitch. Messages are realtime.
- `conversation_reads` — unread counts in the inbox.
- `reviews` — one review per person per closed job, rating 1–5.
- `payments` — escrow rows (`held`, `released`, `refunded`).
- `stripe_events` — processed webhook event ids, so a replay does not apply twice. RLS is on and there are no policies, so only the database connection used by the webhook can write it.
- `portfolio_items` — work samples on a freelancer profile. Public read, owner write.
- Storage buckets `avatars` and `portfolio` — public read, writes only under `{user-id}/`.

`proposal_counts` and `completed_project_counts` are security-definer functions so the board can show pitch and completed counts without opening private rows.

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

## Google sign-in

`/login` and `/signup` keep email and password, and add Continue with Google. The button calls `signInWithOAuth({ provider: "google" })`. Supabase returns to `/auth/callback`, which exchanges the code for a session. Email confirmation is unchanged.

Google Cloud and the Supabase Google provider still need a real client id and secret before a click can finish. No credentials are stored in this repo.

## Email confirmation

Signup requires email confirmation (`mailer_autoconfirm` is false). The confirmation, magic-link, recovery, and invite templates still use Supabase's default copy. The Management API refused a restyle: email template changes need a paid plan or custom SMTP, and this project has neither. A signup attempt from this environment previously returned `email rate limit exceeded`; the project still allows only 2 confirmation emails per hour, so a full confirm-then-login walkthrough can fail until that window resets. Confirmation was left on.

## What you can do

- Browse talent and open projects. Filter projects by CAD budget, fixed or hourly, skill, province, and remote inside Canada. Sort by newest or budget.
- Sign up, confirm your email, and publish a profile with a photo and work samples.
- Post a project, pitch, and accept a pitch into a live thread.
- Close a finished project and leave one review each.
- Connect payouts and, with Stripe test keys, fund, release, or refund escrow.
