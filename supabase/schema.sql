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

-- Open jobs are visible to everyone (job board). Clients can also see their
-- own non-open jobs.
drop policy if exists "jobs: public read open + own" on public.jobs;
create policy "jobs: public read open + own"
  on public.jobs for select
  using (status = 'open' or auth.uid() = client_id);

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
