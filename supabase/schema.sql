-- NorthernWork backend schema (Phase 1: auth + profiles + jobs + proposals)
-- Run this in the Supabase SQL editor (or `psql`) on your project.
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS guards),
-- so it also upgrades projects that ran the earlier Phase-1 schema.
-- Requires the pgcrypto extension for gen_random_uuid() (enabled by default on Supabase).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  title text,
  bio text,
  skills text[] not null default '{}',
  hourly_rate_cad numeric(10, 2),
  avatar_url text,
  languages text[] not null default '{English}',
  created_at timestamptz not null default now()
);

-- Columns added after the first schema revision (talent directory needs them).
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists availability text;

alter table public.profiles enable row level security;

-- Everyone can read profiles (public marketplace directory).
drop policy if exists "profiles: public read" on public.profiles;
create policy "profiles: public read"
  on public.profiles for select
  using (true);

-- Users can create only their own profile row.
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update only their own profile row.
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create index if not exists profiles_skills_idx on public.profiles using gin (skills);

-- -------------------------------------------------------------------- jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  budget_cad numeric(10, 2),
  budget_type text not null default 'fixed'
    check (budget_type in ('fixed', 'hourly')),
  skills text[] not null default '{}',
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

-- Column added after the first schema revision (job board filters by it).
alter table public.jobs add column if not exists location text;

alter table public.jobs enable row level security;

-- Hired freelancers need to read in-progress and closed jobs (hire state, reviews).
-- Security definer avoids RLS recursion between jobs and proposals.
create schema if not exists private;

create or replace function private.viewer_accepted_on_job(target_job uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.proposals p
    where p.job_id = target_job
      and p.freelancer_id = (select auth.uid())
      and p.status = 'accepted'
  );
$$;

revoke all on function private.viewer_accepted_on_job(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.viewer_accepted_on_job(uuid) to anon, authenticated;

-- Open jobs are visible to everyone (job board). Clients see their own jobs.
-- The accepted freelancer can read the job after it leaves the open board.
drop policy if exists "jobs: public read open + own" on public.jobs;
create policy "jobs: public read open + own"
  on public.jobs for select
  to anon, authenticated
  using (
    status = 'open'
    or client_id = (select auth.uid())
    or private.viewer_accepted_on_job(id)
  );

-- Logged-in users can post jobs; the row must belong to them.
drop policy if exists "jobs: insert own" on public.jobs;
create policy "jobs: insert own"
  on public.jobs for insert
  with check (auth.uid() is not null and auth.uid() = client_id);

-- Clients can update their own jobs (edit, close, reopen).
drop policy if exists "jobs: update own" on public.jobs;
create policy "jobs: update own"
  on public.jobs for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

-- Clients can delete their own jobs.
drop policy if exists "jobs: delete own" on public.jobs;
create policy "jobs: delete own"
  on public.jobs for delete
  using (auth.uid() = client_id);

create index if not exists jobs_status_created_idx on public.jobs (status, created_at desc);
create index if not exists jobs_client_idx on public.jobs (client_id);
create index if not exists jobs_skills_idx on public.jobs using gin (skills);

-- ---------------------------------------------------------------- proposals
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  freelancer_id uuid not null references auth.users (id) on delete cascade,
  cover_letter text not null,
  bid_cad numeric(10, 2),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (job_id, freelancer_id)
);

alter table public.proposals enable row level security;

-- Freelancers see their own proposals; job owners see proposals on their jobs.
drop policy if exists "proposals: read own or job owner" on public.proposals;
create policy "proposals: read own or job owner"
  on public.proposals for select
  using (
    auth.uid() = freelancer_id
    or exists (
      select 1 from public.jobs j
      where j.id = proposals.job_id and j.client_id = auth.uid()
    )
  );

-- Logged-in freelancers can submit proposals as themselves.
drop policy if exists "proposals: insert own" on public.proposals;
create policy "proposals: insert own"
  on public.proposals for insert
  with check (auth.uid() is not null and auth.uid() = freelancer_id);

-- Freelancers can edit/withdraw their own proposals; job owners can
-- accept/decline proposals on their jobs.
drop policy if exists "proposals: update own" on public.proposals;
create policy "proposals: update own"
  on public.proposals for update
  using (auth.uid() = freelancer_id)
  with check (auth.uid() = freelancer_id);

drop policy if exists "proposals: job owner update status" on public.proposals;
create policy "proposals: job owner update status"
  on public.proposals for update
  using (
    exists (
      select 1 from public.jobs j
      where j.id = proposals.job_id and j.client_id = auth.uid()
    )
  );

create index if not exists proposals_job_idx on public.proposals (job_id);
create index if not exists proposals_freelancer_idx on public.proposals (freelancer_id);

-- ------------------------------------------------------------- conversations
-- One thread per pitch. client_id and freelancer_id point at profiles so
-- the inbox can show names. A profile row is created when someone posts or pitches.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  freelancer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, freelancer_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(body) between 1 and 5000)
);

-- Per-person read cursor so the inbox can show an unread count.
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;

drop policy if exists "conversations: participants read" on public.conversations;
create policy "conversations: participants read"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) in (client_id, freelancer_id));

drop policy if exists "conversations: participants insert" on public.conversations;
create policy "conversations: participants insert"
  on public.conversations for insert
  to authenticated
  with check (
    (select auth.uid()) in (client_id, freelancer_id)
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.client_id = client_id
    )
    and exists (
      select 1 from public.proposals p
      where p.job_id = conversations.job_id
        and p.freelancer_id = conversations.freelancer_id
        and p.status in ('pending', 'accepted')
    )
  );

drop policy if exists "messages: participants read" on public.messages;
create policy "messages: participants read"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (select auth.uid()) in (c.client_id, c.freelancer_id)
    )
  );

drop policy if exists "messages: sender insert" on public.messages;
create policy "messages: sender insert"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.client_id, c.freelancer_id)
    )
  );

drop policy if exists "reads: own read" on public.conversation_reads;
create policy "reads: own read"
  on public.conversation_reads for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "reads: own insert" on public.conversation_reads;
create policy "reads: own insert"
  on public.conversation_reads for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.client_id, c.freelancer_id)
    )
  );

drop policy if exists "reads: own update" on public.conversation_reads;
create policy "reads: own update"
  on public.conversation_reads for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists conversations_client_idx on public.conversations (client_id);
create index if not exists conversations_freelancer_idx on public.conversations (freelancer_id);
create index if not exists conversations_job_idx on public.conversations (job_id);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists conversation_reads_user_idx on public.conversation_reads (user_id);

grant select, insert on table public.conversations to authenticated;
grant select, insert on table public.messages to authenticated;
grant select, insert, update on table public.conversation_reads to authenticated;

alter table public.messages replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------------------------------------------------------------- reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (job_id, reviewer_id)
);

alter table public.reviews enable row level security;

drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read"
  on public.reviews for select
  to anon, authenticated
  using (true);

drop policy if exists "reviews: party insert on closed job" on public.reviews;
create policy "reviews: party insert on closed job"
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.status = 'closed'
        and (
          (
            j.client_id = (select auth.uid())
            and exists (
              select 1 from public.proposals p
              where p.job_id = j.id
                and p.freelancer_id = reviewee_id
                and p.status = 'accepted'
            )
          )
          or (
            reviewee_id = j.client_id
            and exists (
              select 1 from public.proposals p
              where p.job_id = j.id
                and p.freelancer_id = (select auth.uid())
                and p.status = 'accepted'
            )
          )
        )
    )
  );

create index if not exists reviews_job_idx on public.reviews (job_id);
create index if not exists reviews_reviewer_idx on public.reviews (reviewer_id);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);

grant select on table public.reviews to anon, authenticated;
grant insert on table public.reviews to authenticated;
