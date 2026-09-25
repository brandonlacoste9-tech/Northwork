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
- `conversations` and `messages` — one thread per project and freelancer. A client can open it with an invite before any pitch. Messages are realtime.
- `conversation_reads` — unread counts in the inbox.
- `reviews` — one review per person per closed job, rating 1–5.
- `payments` — escrow rows (`held`, `released`, `refunded`).
- `stripe_events` — processed webhook event ids, so a replay does not apply twice. RLS is on and there are no policies, so only the database connection used by the webhook can write it.
- `portfolio_items` — work samples on a freelancer profile. Public read, owner write.
- Storage buckets `avatars` and `portfolio` — public read, writes only under `{user-id}/`.
- `notifications` — in-app alerts for an invite, pitch, hire, decline, message, payment, or a featured project. A person can read and mark their own. Inserts go through `add_notification`, except featured-project alerts, which the pooler writes for active Pro freelancers.
- `subscriptions` — Pro billing for one user. The owner can read the row. Stripe fields are written by the webhook. A signed-in user cannot set their own tier to Pro.
- `token_ledger` — pitch grants, top-ups, and spends. The owner can read. Writes go through the pooler.

`proposal_counts`, `completed_project_counts`, and `paid_project_counts` are security-definer functions so the board can show counts without opening private rows. `party_email` returns an address only to someone who already shares a thread or a pitch with that person.

## Messaging

Accepting a pitch sets the project to `in_progress`, declines the other pending pitches, creates the conversation, and opens `/messages/{id}`. The hired freelancer sees a hired state on the project with a link back to that thread. Signed-out visitors cannot read threads. In the sample preview, Messages explains that threads are unavailable.

## Escrow

Escrow is Stripe Connect in test mode. Nothing is charged until `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are set.

1. A freelancer connects an Express account at `/settings/payouts`.
2. On an in-progress project the client funds escrow. Stripe creates a manual-capture PaymentIntent in CAD. The card form authorizes a hold.
3. Release captures the payment and sends it to the freelancer minus a 5% platform fee. The client authorizes the project amount plus GST, HST, or GST+QST on that fee only (Ontario and the Atlantic provinces use HST, Quebec uses GST+QST, everyone else GST). The place of supply is the project province, or the client's province when the work is remote. It is an estimate, not tax advice.
4. While the payment is still held, the client can refund it (the uncaptured PaymentIntent is cancelled).
5. `POST /api/webhooks/stripe` checks the signature, records the event id in `stripe_events`, and ignores a duplicate. Escrow updates come from `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and `charge.refunded`. The same route also handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed` for Pro and pitch tokens.

A full test-mode charge was not run here because no Stripe secret key was provided, and `DATABASE_URL` has no database password.

## Invites and alerts

From a freelancer profile, a signed-in client picks one of their open projects and sends a note. That creates the thread (a pitch is not required first) and an in-app alert. Sample profiles cannot be invited. The same alerts fire for a pitch, a hire, a decline, a message, and escrow. Email is sent only when both `RESEND_API_KEY` and `NOTIFICATION_FROM` are set. Otherwise the alert stays on `/notifications`.

## Trust

Verified means the email is confirmed and at least one payment has been released. A city and province on the profile are not enough. Profiles whose names match the sample set are marked Sample. They stay visible only while the directory has no real profiles, and they cannot be hired. Terms are at `/terms` (disputes at `/terms#disputes`) and privacy at `/privacy`.

## French

The header switch stores a `locale` cookie (`en` or `fr`) and translates the navigation, home page, invites, escrow, alerts, and pricing. Signup confirmation mail is still the English Supabase template.

## Pro and pitch tokens

Free freelancers get 8 pitches a month, reset on the 1st (America/Toronto). Pro is $19 CAD a month: 50 pitches, a higher place in the talent directory and on pitch lists, a Pro badge, and an alert when a featured project is posted. A featured project is one posted by a confirmed client who is not a sample profile. Sample profiles never show Pro. A one-time top-up is 15 pitches for $12 CAD.

Checkout uses the existing Stripe prices. Nothing in this repo creates a new product. Cancel Pro in the Customer Portal from `/pricing`. The balance sits in the account menu and next to Send a pitch. At zero pitches the form is replaced by the top-up and Pro options. With no Supabase credentials, `/pricing` explains the plans and does not start Checkout.

## Saved job alerts

On the job filters, a signed-in freelancer can name the current search and save it. A matching open project creates one in-site alert per search. Instant alerts go out when the project is posted. Daily alerts are one note per person for the last 24 hours, from `POST /api/job-alerts/digest`. The same project is not alerted twice for the same search. Each email includes an unsubscribe link, which turns that person's alerts off, and a link to `/settings/alerts`. If `RESEND_API_KEY` or `NOTIFICATION_FROM` is blank, the in-site alert still appears. The sample preview does not save searches.

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
