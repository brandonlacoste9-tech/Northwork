# Northernwork

Northernwork is a freelance marketplace for clients and freelancers in Canada. The public site is [northernwork.com](https://northernwork.com).

Rates are in CAD. Profiles name a Canadian city and province. Remote work on the job board means remote inside Canada.

This repository is a working preview. Talent, profiles, and open projects use sample data in the browser. Posting a project adds it to the job list on this device. There is no account system, database, payment flow, or messaging.

Connect a Supabase project (see "Real backend" below) to switch the same UI to a shared database with accounts: the talent directory, job board, project posting, freelancer profiles, and pitches all read and write real rows, and the sample data steps aside.

## Real backend (Supabase)

The app detects Supabase credentials at runtime. Without them it runs the
sample-data preview above; with them it uses the real backend — no code
changes needed.

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In the Supabase SQL editor, run the full `supabase/schema.sql` file in
   this repo (safe to re-run — it is idempotent).
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase → Project Settings → API.
4. `npm run dev` and sign up from the site header.

What unlocks: accounts (log in / sign up in the header), a "My profile" page
that publishes your freelancer profile to the talent directory, project
posting to the shared job board, and pitches on projects — freelancers pitch
from the project page, clients accept or decline and can close or reopen
their listings. Accepting a pitch opens a private message thread at
`/messages`. Payments and escrow are Phase 2 (see `src/lib/stripe.ts`).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To choose a host and port:

```bash
npm run dev -- --hostname 0.0.0.0 --port 43127
```

## What you can do

- Read how Northernwork works for clients and for freelancers.
- Browse talent and filter by province, skill, and CAD hourly rate. Search by name or skill.
- Open a freelancer profile and send an invite. The confirmation stays on your device.
- Browse open projects and open a project.
- Post a project. Empty fields are rejected. A valid project shows up on the job board immediately.

The talent and job directories pause briefly while they load. If a search matches nothing, the page shows an empty state. Add `?error=1` to `/talent` or `/jobs` to see the error state, then use Retry.

## Email confirmation

Signup on the linked Supabase project requires email confirmation. Auth settings report `mailer_autoconfirm: false` and email signups enabled. A fresh signup from this environment returned `email rate limit exceeded`, and there is no inbox here to open a confirmation link, so the full confirm-then-login walkthrough could not be finished. Confirmation was left on.

Supabase email templates still use the dashboard defaults. This environment has no Management API token, so the templates were not restyled to the Northwork name.
