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

-- --------------------------------------------------------------- avatars
-- Public read. Writes only under avatars/{user-id}/* (object name is {user-id}/file).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars: insert own folder" on storage.objects;
create policy "avatars: insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars: update own folder" on storage.objects;
create policy "avatars: update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars: delete own folder" on storage.objects;
create policy "avatars: delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------- escrow
alter table public.profiles add column if not exists stripe_account_id text;

create or replace function private.block_stripe_account_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stripe_account_id is distinct from old.stripe_account_id
     and coalesce(auth.role(), '') = 'authenticated' then
    raise exception 'Payout accounts are connected through Northernwork.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_stripe_account_edit on public.profiles;
create trigger profiles_block_stripe_account_edit
  before update on public.profiles
  for each row
  execute function private.block_stripe_account_edit();

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  freelancer_id uuid not null references public.profiles (id) on delete cascade,
  amount_cad numeric(10, 2) not null,
  stripe_payment_intent_id text unique,
  status text not null check (status in ('held', 'released', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "payments: parties read" on public.payments;
create policy "payments: parties read"
  on public.payments for select
  to authenticated
  using ((select auth.uid()) in (client_id, freelancer_id));

drop policy if exists "payments: client insert" on public.payments;
create policy "payments: client insert"
  on public.payments for insert
  to authenticated
  with check (client_id = (select auth.uid()));

drop policy if exists "payments: client update" on public.payments;
create policy "payments: client update"
  on public.payments for update
  to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create index if not exists payments_job_idx on public.payments (job_id);
create index if not exists payments_client_idx on public.payments (client_id);
create index if not exists payments_freelancer_idx on public.payments (freelancer_id);

grant select, insert, update on table public.payments to authenticated;

-- ---------------------------------------------------- board + portfolio
-- Extra job facts for the board. Safe to re-run.
alter table public.jobs add column if not exists budget_max_cad numeric(10, 2);
alter table public.jobs add column if not exists duration text;

-- Pitch counts for the public board. Cover letters stay behind proposals RLS.
create or replace function public.proposal_counts(job_ids uuid[])
returns table (job_id uuid, proposal_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.job_id, count(*)::bigint
  from public.proposals p
  where p.job_id = any (job_ids)
  group by p.job_id;
$$;

revoke all on function public.proposal_counts(uuid[]) from public;
grant execute on function public.proposal_counts(uuid[]) to anon, authenticated;

-- Closed projects are not public, so completed counts go through this function.
create or replace function public.completed_project_counts(profile_ids uuid[])
returns table (profile_id uuid, completed_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select x.profile_id, count(distinct x.job_id)::bigint
  from (
    select j.client_id as profile_id, j.id as job_id
    from public.jobs j
    where j.status = 'closed'
      and j.client_id = any (profile_ids)
    union
    select p.freelancer_id, p.job_id
    from public.proposals p
    join public.jobs j on j.id = p.job_id
    where j.status = 'closed'
      and p.status = 'accepted'
      and p.freelancer_id = any (profile_ids)
  ) x
  group by x.profile_id;
$$;

revoke all on function public.completed_project_counts(uuid[]) from public;
grant execute on function public.completed_project_counts(uuid[]) to anon, authenticated;

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  image_url text,
  url text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_items enable row level security;

drop policy if exists "portfolio: public read" on public.portfolio_items;
create policy "portfolio: public read"
  on public.portfolio_items for select
  to anon, authenticated
  using (true);

drop policy if exists "portfolio: insert own" on public.portfolio_items;
create policy "portfolio: insert own"
  on public.portfolio_items for insert
  to authenticated
  with check (freelancer_id = (select auth.uid()));

drop policy if exists "portfolio: update own" on public.portfolio_items;
create policy "portfolio: update own"
  on public.portfolio_items for update
  to authenticated
  using (freelancer_id = (select auth.uid()))
  with check (freelancer_id = (select auth.uid()));

drop policy if exists "portfolio: delete own" on public.portfolio_items;
create policy "portfolio: delete own"
  on public.portfolio_items for delete
  to authenticated
  using (freelancer_id = (select auth.uid()));

create index if not exists portfolio_freelancer_idx
  on public.portfolio_items (freelancer_id, created_at desc);

grant select on table public.portfolio_items to anon, authenticated;
grant insert, update, delete on table public.portfolio_items to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio',
  'portfolio',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio: public read" on storage.objects;
create policy "portfolio: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'portfolio');

drop policy if exists "portfolio: insert own folder" on storage.objects;
create policy "portfolio: insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "portfolio: update own folder" on storage.objects;
create policy "portfolio: update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "portfolio: delete own folder" on storage.objects;
create policy "portfolio: delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

