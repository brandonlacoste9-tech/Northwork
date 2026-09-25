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
    (select auth.uid()) in (conversations.client_id, conversations.freelancer_id)
    and exists (
      select 1 from public.jobs j
      where j.id = conversations.job_id
        and j.client_id = conversations.client_id
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

-- ------------------------------------------------ invites, alerts, trust, tax
alter table public.profiles add column if not exists email_confirmed boolean not null default false;
alter table public.profiles add column if not exists is_sample boolean not null default false;

alter table public.payments add column if not exists subtotal_cad numeric(10, 2);
alter table public.payments add column if not exists tax_cad numeric(10, 2);
alter table public.payments add column if not exists tax_label text;

-- A client may open a thread to invite a freelancer before any pitch exists.
drop policy if exists "conversations: participants insert" on public.conversations;
create policy "conversations: participants insert"
  on public.conversations for insert
  to authenticated
  with check (
    (select auth.uid()) in (conversations.client_id, conversations.freelancer_id)
    and exists (
      select 1 from public.jobs j
      where j.id = conversations.job_id
        and j.client_id = conversations.client_id
    )
    and (
      (select auth.uid()) = conversations.client_id
      or exists (
        select 1 from public.proposals p
        where p.job_id = conversations.job_id
          and p.freelancer_id = conversations.freelancer_id
          and p.status in ('pending', 'accepted')
      )
    )
  );

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  body text not null,
  href text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

drop policy if exists "notifications: own read" on public.notifications;
create policy "notifications: own read"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "notifications: own update" on public.notifications;
create policy "notifications: own update"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

grant select, update on table public.notifications to authenticated;

create or replace function public.add_notification(
  target uuid,
  kind text,
  body text,
  href text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  allowed boolean;
begin
  if caller is null or target is null or caller = target then
    return;
  end if;
  if kind not in (
    'invite', 'pitch', 'hire', 'decline', 'message',
    'payment_held', 'payment_released', 'payment_refunded'
  ) then
    raise exception 'Unknown alert';
  end if;
  select exists (
    select 1 from public.conversations c
    where caller in (c.client_id, c.freelancer_id)
      and target in (c.client_id, c.freelancer_id)
  ) or exists (
    select 1
    from public.proposals p
    join public.jobs j on j.id = p.job_id
    where (j.client_id = caller and p.freelancer_id = target)
       or (p.freelancer_id = caller and j.client_id = target)
  ) into allowed;
  if not allowed then
    raise exception 'Not allowed';
  end if;
  insert into public.notifications (user_id, kind, body, href)
  values (target, kind, left(coalesce(body, ''), 500), href);
end;
$$;

revoke all on function public.add_notification(uuid, text, text, text) from public;
grant execute on function public.add_notification(uuid, text, text, text) to authenticated;

create or replace function public.party_email(target uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  allowed boolean;
  result text;
begin
  if caller is null or target is null or caller = target then
    return null;
  end if;
  select exists (
    select 1 from public.conversations c
    where caller in (c.client_id, c.freelancer_id)
      and target in (c.client_id, c.freelancer_id)
  ) or exists (
    select 1
    from public.proposals p
    join public.jobs j on j.id = p.job_id
    where (j.client_id = caller and p.freelancer_id = target)
       or (p.freelancer_id = caller and j.client_id = target)
  ) into allowed;
  if not allowed then
    return null;
  end if;
  select u.email into result from auth.users u where u.id = target;
  return result;
end;
$$;

revoke all on function public.party_email(uuid) from public;
grant execute on function public.party_email(uuid) to authenticated;

create or replace function public.paid_project_counts(profile_ids uuid[])
returns table (profile_id uuid, paid_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select x.profile_id, count(distinct x.payment_id)::bigint
  from (
    select p.client_id as profile_id, p.id as payment_id
    from public.payments p
    where p.status = 'released'
      and p.client_id = any (profile_ids)
    union
    select p.freelancer_id, p.id
    from public.payments p
    where p.status = 'released'
      and p.freelancer_id = any (profile_ids)
  ) x
  group by x.profile_id;
$$;

revoke all on function public.paid_project_counts(uuid[]) from public;
grant execute on function public.paid_project_counts(uuid[]) to anon, authenticated;

create or replace function public.sync_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email_confirmed = new.email_confirmed_at is not null
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row
  execute function public.sync_email_confirmed();

update public.profiles p
   set email_confirmed = true
  from auth.users u
 where u.id = p.id
   and u.email_confirmed_at is not null;

update public.profiles
   set is_sample = true
 where display_name in (
   'Amélie Gagnon',
   'Jordan Okonkwo',
   'Priya Sandhu',
   'Noah MacLeod',
   'Camille Bergeron',
   'Ethan Chen',
   'Sofia Alvarez',
   'Malik Hassan',
   'Hannah Reid',
   'Luca Moretti',
   'Owen Fraser',
   'Nadia Bélanger',
   'Théo Nguyen',
   'Grace Kim',
   'Samuel Tremblay',
   'Leah Nitsiza',
   'Aisha Rahman'
 );

-- -------------------------------- Pro subscriptions and pitch tokens
-- Safe to re-run in the SQL editor. Billing rows are written by the
-- session-pooler webhook, not by the signed-in user.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  check (
    reason in ('launch_grant', 'monthly_grant', 'monthly_reset', 'pitch')
    or reason like 'topup:%'
  )
);

alter table public.subscriptions enable row level security;
alter table public.token_ledger enable row level security;

drop policy if exists "subscriptions: own read" on public.subscriptions;
create policy "subscriptions: own read"
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "subscriptions: own insert" on public.subscriptions;
create policy "subscriptions: own insert"
  on public.subscriptions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "subscriptions: own update" on public.subscriptions;
create policy "subscriptions: own update"
  on public.subscriptions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "token_ledger: own read" on public.token_ledger;
create policy "token_ledger: own read"
  on public.token_ledger for select
  to authenticated
  using (user_id = (select auth.uid()));

create index if not exists token_ledger_user_idx
  on public.token_ledger (user_id, created_at desc);

create unique index if not exists token_ledger_topup_reason_idx
  on public.token_ledger (user_id, reason)
  where reason like 'topup:%';

revoke all on table public.subscriptions from anon, authenticated;
grant select, insert, update on table public.subscriptions to authenticated;
revoke all on table public.token_ledger from anon, authenticated;
grant select on table public.token_ledger to authenticated;

-- A signed-in user can touch their subscription row, but cannot grant Pro.
create or replace function private.block_subscription_self_upgrade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if tg_op = 'INSERT' then
      new.tier := 'free';
      new.status := 'inactive';
      new.stripe_customer_id := null;
      new.stripe_subscription_id := null;
      new.current_period_end := null;
    else
      new.tier := old.tier;
      new.status := old.status;
      new.stripe_customer_id := old.stripe_customer_id;
      new.stripe_subscription_id := old.stripe_subscription_id;
      new.current_period_end := old.current_period_end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_block_self_upgrade on public.subscriptions;
create trigger subscriptions_block_self_upgrade
  before insert or update on public.subscriptions
  for each row
  execute function private.block_subscription_self_upgrade();

alter table public.jobs add column if not exists featured boolean not null default false;

create or replace function private.keep_job_featured()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if tg_op = 'INSERT' then
      new.featured := false;
    else
      new.featured := old.featured;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_keep_featured on public.jobs;
create trigger jobs_keep_featured
  before insert or update on public.jobs
  for each row
  execute function private.keep_job_featured();

-- Monthly allowance resets on the 1st, America/Toronto. Top-ups stay.
-- Pro is 50, Free is 8. Called from the pooler before a balance read or a pitch.
create or replace function private.ensure_pitch_allowance(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  month_start timestamptz := date_trunc(
    'month', now() at time zone 'America/Toronto'
  ) at time zone 'America/Toronto';
  is_pro boolean;
  allowance integer;
  last_grant integer;
  last_at timestamptz;
  spent_since integer;
  leftover integer;
begin
  if target is null then
    return;
  end if;
  perform pg_advisory_xact_lock(hashtext('pitch:' || target::text));

  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = target
      and s.tier = 'pro'
      and s.status = 'active'
      and (s.current_period_end is null or s.current_period_end > now())
  ) into is_pro;
  allowance := case when is_pro then 50 else 8 end;

  if exists (
    select 1
    from public.token_ledger t
    where t.user_id = target
      and t.reason in ('launch_grant', 'monthly_grant')
      and t.created_at >= month_start
  ) then
    return;
  end if;

  -- Drop only the unused part of the previous month's allowance.
  -- Pitches take the allowance first, then top-ups. Top-ups carry over.
  select t.delta, t.created_at
    into last_grant, last_at
  from public.token_ledger t
  where t.user_id = target
    and t.reason in ('launch_grant', 'monthly_grant')
  order by t.created_at desc, t.id desc
  limit 1;

  if last_grant is not null then
    select coalesce(sum(t.delta), 0)
      into spent_since
    from public.token_ledger t
    where t.user_id = target
      and t.reason = 'pitch'
      and t.created_at >= last_at;
    leftover := last_grant + spent_since;
    if leftover > 0 then
      insert into public.token_ledger (user_id, delta, reason)
      values (target, -leftover, 'monthly_reset');
    end if;
  end if;
  insert into public.token_ledger (user_id, delta, reason)
  values (target, allowance, 'monthly_grant');
end;
$$;

create or replace function private.pitch_state(target uuid)
returns table (pro boolean, balance integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target is null then
    pro := false;
    balance := 0;
    return next;
    return;
  end if;
  perform private.ensure_pitch_allowance(target);
  pro := exists (
    select 1
    from public.subscriptions s
    where s.user_id = target
      and s.tier = 'pro'
      and s.status = 'active'
      and (s.current_period_end is null or s.current_period_end > now())
  );
  select coalesce(sum(t.delta), 0)::integer into balance
  from public.token_ledger t
  where t.user_id = target;
  return next;
end;
$$;

-- Decrements one pitch when the balance is above zero. Pro does not spend.
-- Raises pitch_tokens_required at zero so the app can show the upsell.
create or replace function private.spend_pitch(target uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  state_pro boolean;
  state_balance integer;
begin
  if target is null then
    raise exception 'pitch_tokens_required';
  end if;
  if auth.uid() is not null and auth.uid() <> target
     and coalesce(auth.role(), '') = 'authenticated' then
    raise exception 'pitch_tokens_required';
  end if;
  perform private.ensure_pitch_allowance(target);
  select s.pro, s.balance into state_pro, state_balance
  from private.pitch_state(target) s;
  if state_pro then
    return state_balance;
  end if;
  if coalesce(state_balance, 0) <= 0 then
    raise exception 'pitch_tokens_required';
  end if;
  insert into public.token_ledger (user_id, delta, reason)
  values (target, -1, 'pitch');
  return state_balance - 1;
end;
$$;

revoke all on function private.ensure_pitch_allowance(uuid) from public, anon, authenticated;
revoke all on function private.pitch_state(uuid) from public, anon, authenticated;
revoke all on function private.spend_pitch(uuid) from public, anon, authenticated;

-- Public ids only. Sample profiles are never Pro, even with a subscription row.
create or replace function public.active_pro_ids(profile_ids uuid[])
returns table (profile_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id
  from public.subscriptions s
  join public.profiles p on p.id = s.user_id
  where s.user_id = any (profile_ids)
    and s.tier = 'pro'
    and s.status = 'active'
    and (s.current_period_end is null or s.current_period_end > now())
    and coalesce(p.is_sample, false) = false;
$$;

revoke all on function public.active_pro_ids(uuid[]) from public;
grant execute on function public.active_pro_ids(uuid[]) to anon, authenticated;

-- Mark a confirmed client's project featured and tell active Pro freelancers.
create or replace function private.feature_job_and_alert(target_job uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  label text;
begin
  select j.client_id, left(j.title, 200)
    into owner, label
  from public.jobs j
  where j.id = target_job;
  if owner is null then
    return;
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = owner
      and p.email_confirmed
      and coalesce(p.is_sample, false) = false
  ) then
    return;
  end if;
  update public.jobs set featured = true where id = target_job;
  insert into public.notifications (user_id, kind, body, href)
  select s.user_id, 'featured_job', coalesce(label, 'Featured project'), '/jobs/' || target_job::text
  from public.subscriptions s
  join public.profiles p on p.id = s.user_id
  where s.tier = 'pro'
    and s.status = 'active'
    and (s.current_period_end is null or s.current_period_end > now())
    and s.user_id <> owner
    and coalesce(p.is_sample, false) = false;
end;
$$;

revoke all on function private.feature_job_and_alert(uuid) from public, anon, authenticated;

insert into public.token_ledger (user_id, delta, reason)
select p.id, 8, 'launch_grant'
from public.profiles p
where not exists (
  select 1
  from public.token_ledger t
  where t.user_id = p.id
    and t.reason = 'launch_grant'
);

-- -------------------------------- saved-search job alerts
-- Safe to re-run in the SQL editor. The pooler writes alert rows.

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  skills text[] not null default '{}',
  min_budget_cad numeric(10, 2),
  budget_type text check (budget_type is null or budget_type in ('fixed', 'hourly')),
  province text,
  remote_only boolean not null default false,
  alert_frequency text not null default 'instant'
    check (alert_frequency in ('instant', 'daily', 'off')),
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (unsubscribe_token)
);

create table if not exists public.job_alerts_sent (
  id uuid primary key default gen_random_uuid(),
  saved_search_id uuid not null references public.saved_searches (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (saved_search_id, job_id)
);

alter table public.saved_searches enable row level security;
alter table public.job_alerts_sent enable row level security;

drop policy if exists "saved_searches: own read" on public.saved_searches;
create policy "saved_searches: own read"
  on public.saved_searches for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "saved_searches: own insert" on public.saved_searches;
create policy "saved_searches: own insert"
  on public.saved_searches for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "saved_searches: own update" on public.saved_searches;
create policy "saved_searches: own update"
  on public.saved_searches for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "saved_searches: own delete" on public.saved_searches;
create policy "saved_searches: own delete"
  on public.saved_searches for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "job_alerts_sent: own read" on public.job_alerts_sent;
create policy "job_alerts_sent: own read"
  on public.job_alerts_sent for select
  to authenticated
  using (
    exists (
      select 1 from public.saved_searches s
      where s.id = saved_search_id
        and s.user_id = (select auth.uid())
    )
  );

create index if not exists saved_searches_user_idx
  on public.saved_searches (user_id, created_at desc);
create index if not exists job_alerts_sent_job_idx
  on public.job_alerts_sent (job_id);

revoke all on table public.saved_searches from anon, authenticated;
grant select, insert, update, delete on table public.saved_searches to authenticated;
revoke all on table public.job_alerts_sent from anon, authenticated;
grant select on table public.job_alerts_sent to authenticated;

create or replace function private.job_matches_search(
  job_skills text[],
  job_budget numeric,
  job_budget_type text,
  job_location text,
  search_skills text[],
  search_min numeric,
  search_budget_type text,
  search_province text,
  search_remote boolean
) returns boolean
language sql
immutable
as $$
  select
    (
      coalesce(array_length(search_skills, 1), 0) = 0
      or coalesce(job_skills, '{}') && search_skills
    )
    and (search_min is null or coalesce(job_budget, 0) >= search_min)
    and (
      search_budget_type is null
      or coalesce(job_budget_type, 'fixed') = search_budget_type
    )
    and (
      case
        when search_remote then job_location = 'Remote in Canada'
        when search_province is not null and btrim(search_province) <> ''
          then job_location = search_province
        else true
      end
    );
$$;

-- Record one instant alert per search. A second call for the same pair does nothing.
create or replace function private.dispatch_instant_alerts(target_job uuid)
returns table (
  user_id uuid,
  email text,
  title text,
  budget_cad numeric,
  budget_max_cad numeric,
  budget_type text,
  href text,
  unsubscribe_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs%rowtype;
  s public.saved_searches%rowtype;
  addr text;
begin
  select * into j from public.jobs where id = target_job;
  if j.id is null or j.status is distinct from 'open' then
    return;
  end if;

  for s in
    select ss.*
    from public.saved_searches ss
    where ss.alert_frequency = 'instant'
      and ss.user_id is distinct from j.client_id
      and private.job_matches_search(
        j.skills,
        coalesce(j.budget_max_cad, j.budget_cad),
        j.budget_type,
        j.location,
        ss.skills,
        ss.min_budget_cad,
        ss.budget_type,
        ss.province,
        ss.remote_only
      )
  loop
    insert into public.job_alerts_sent (saved_search_id, job_id)
    values (s.id, j.id)
    on conflict (saved_search_id, job_id) do nothing;
    if not found then
      continue;
    end if;

    if exists (select 1 from public.profiles p where p.id = s.user_id) then
      insert into public.notifications (user_id, kind, body, href)
      values (s.user_id, 'job_alert', left(j.title, 200), '/jobs/' || j.id::text);
    end if;

    select u.email into addr from auth.users u where u.id = s.user_id;

    user_id := s.user_id;
    email := addr;
    title := j.title;
    budget_cad := j.budget_cad;
    budget_max_cad := j.budget_max_cad;
    budget_type := j.budget_type;
    href := '/jobs/' || j.id::text;
    unsubscribe_token := s.unsubscribe_token;
    return next;
  end loop;
end;
$$;

-- One in-site note per freelancer for every daily match in the last 24 hours.
create or replace function private.dispatch_daily_digests()
returns table (
  user_id uuid,
  email text,
  job_count integer,
  title text,
  budget_cad numeric,
  budget_max_cad numeric,
  budget_type text,
  href text,
  unsubscribe_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
  owner uuid;
  note text;
  n integer;
  token uuid;
  addr text;
begin
  create temporary table if not exists _digest_boot (x int) on commit drop;
  drop table if exists pg_temp._digest_matches;
  create temporary table pg_temp._digest_matches (
    user_id uuid,
    search_id uuid,
    job_id uuid,
    title text,
    budget_cad numeric,
    budget_max_cad numeric,
    budget_type text
  ) on commit drop;
  drop table if exists pg_temp._digest_boot;

  insert into pg_temp._digest_matches (user_id, search_id, job_id, title, budget_cad, budget_max_cad, budget_type)
  select ss.user_id, ss.id, j.id, j.title, j.budget_cad, j.budget_max_cad, j.budget_type
  from public.saved_searches ss
  join public.jobs j
    on j.status = 'open'
   and j.created_at >= now() - interval '24 hours'
   and j.client_id is distinct from ss.user_id
  where ss.alert_frequency = 'daily'
    and private.job_matches_search(
      j.skills,
      coalesce(j.budget_max_cad, j.budget_cad),
      j.budget_type,
      j.location,
      ss.skills,
      ss.min_budget_cad,
      ss.budget_type,
      ss.province,
      ss.remote_only
    )
    and not exists (
      select 1 from public.job_alerts_sent a
      where a.saved_search_id = ss.id and a.job_id = j.id
    );

  insert into public.job_alerts_sent (saved_search_id, job_id)
  select search_id, job_id from pg_temp._digest_matches
  on conflict (saved_search_id, job_id) do nothing;

  for owner in select distinct m.user_id from pg_temp._digest_matches m
  loop
    select count(distinct m.job_id) into n from pg_temp._digest_matches m where m.user_id = owner;
    select string_agg(x.title, E'\n' order by x.title)
      into note
    from (
      select distinct left(m.title, 120) as title
      from pg_temp._digest_matches m
      where m.user_id = owner
    ) x;
    select ss.unsubscribe_token into token
    from public.saved_searches ss
    where ss.user_id = owner
    order by ss.created_at
    limit 1;
    select u.email into addr from auth.users u where u.id = owner;

    if exists (select 1 from public.profiles p where p.id = owner) then
      insert into public.notifications (user_id, kind, body, href)
      values (
        owner,
        'job_digest',
        left(n::text || E'\n' || coalesce(note, ''), 500),
        '/jobs'
      );
    end if;

    return query
      select
        owner,
        addr,
        n,
        m.title,
        m.budget_cad,
        m.budget_max_cad,
        m.budget_type,
        '/jobs/' || m.job_id::text,
        token
      from (
        select distinct on (d.job_id)
          d.job_id, d.title, d.budget_cad, d.budget_max_cad, d.budget_type
        from pg_temp._digest_matches d
        where d.user_id = owner
        order by d.job_id, d.title
      ) m;
  end loop;
end;
$$;

create or replace function private.unsubscribe_alerts(token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select s.user_id into owner
  from public.saved_searches s
  where s.unsubscribe_token = token;
  if owner is null then
    return false;
  end if;
  update public.saved_searches
    set alert_frequency = 'off'
    where user_id = owner;
  return true;
end;
$$;

revoke all on function private.job_matches_search(text[], numeric, text, text, text[], numeric, text, text, boolean) from public, anon, authenticated;
revoke all on function private.dispatch_instant_alerts(uuid) from public, anon, authenticated;
revoke all on function private.dispatch_daily_digests() from public, anon, authenticated;
revoke all on function private.unsubscribe_alerts(uuid) from public, anon, authenticated;

-- The app calls these public functions. They match "Montreal, QC" to Quebec
-- and do not need the database password. Instant alerts can be recorded by
-- the client who posted the project. Only the service role receives email rows.

create or replace function public.location_province(location text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  token text;
  folded text;
begin
  if location is null or btrim(location) = '' then
    return null;
  end if;
  if location ~* 'remote' or location ~* 'distance' then
    return null;
  end if;
  token := btrim(split_part(location, ',', array_length(string_to_array(location, ','), 1)));
  folded := translate(lower(token), 'éèêëàâäîïôöùûüç', 'eeeeaaaiioouuuc');
  return case folded
    when 'ab' then 'Alberta'
    when 'alberta' then 'Alberta'
    when 'bc' then 'British Columbia'
    when 'british columbia' then 'British Columbia'
    when 'colombie-britannique' then 'British Columbia'
    when 'mb' then 'Manitoba'
    when 'manitoba' then 'Manitoba'
    when 'nb' then 'New Brunswick'
    when 'new brunswick' then 'New Brunswick'
    when 'nouveau-brunswick' then 'New Brunswick'
    when 'nl' then 'Newfoundland and Labrador'
    when 'newfoundland and labrador' then 'Newfoundland and Labrador'
    when 'terre-neuve-et-labrador' then 'Newfoundland and Labrador'
    when 'nt' then 'Northwest Territories'
    when 'northwest territories' then 'Northwest Territories'
    when 'territoires du nord-ouest' then 'Northwest Territories'
    when 'ns' then 'Nova Scotia'
    when 'nova scotia' then 'Nova Scotia'
    when 'nouvelle-ecosse' then 'Nova Scotia'
    when 'nu' then 'Nunavut'
    when 'nunavut' then 'Nunavut'
    when 'on' then 'Ontario'
    when 'ontario' then 'Ontario'
    when 'pe' then 'Prince Edward Island'
    when 'pei' then 'Prince Edward Island'
    when 'prince edward island' then 'Prince Edward Island'
    when 'ile-du-prince-edouard' then 'Prince Edward Island'
    when 'qc' then 'Quebec'
    when 'quebec' then 'Quebec'
    when 'sk' then 'Saskatchewan'
    when 'saskatchewan' then 'Saskatchewan'
    when 'yt' then 'Yukon'
    when 'yukon' then 'Yukon'
    else null
  end;
end;
$$;

create or replace function public.saved_search_matches(
  search_skills text[],
  min_budget numeric,
  search_type text,
  search_province text,
  search_remote boolean,
  job_skills text[],
  job_budget numeric,
  job_budget_max numeric,
  job_type text,
  job_location text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (coalesce(array_length(search_skills, 1), 0) = 0 or search_skills && coalesce(job_skills, '{}'))
    and (min_budget is null or coalesce(job_budget_max, job_budget, 0) >= min_budget)
    and (search_type is null or search_type = job_type)
    and (
      case
        when coalesce(search_remote, false) then
          coalesce(job_location, '') ~* 'remote' or coalesce(job_location, '') ~* 'distance'
        when search_province is not null then
          public.location_province(job_location) = search_province
        else true
      end
    ),
    false
  );
$$;

-- Records instant matches for one open project. The job's client or the
-- service role may call it. Only the service role receives recipient rows,
-- so a client cannot list who saved a search.
create or replace function public.dispatch_saved_search_alerts(target_job uuid)
returns table (recipient uuid, search_id uuid, token uuid, search_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.jobs%rowtype;
  hits uuid[];
begin
  select * into found
  from public.jobs j
  where j.id = target_job
    and j.status = 'open';
  if found.id is null then
    return;
  end if;
  if coalesce(auth.role(), '') <> 'service_role'
     and (auth.uid() is null or auth.uid() <> found.client_id) then
    return;
  end if;

  with ins as (
    insert into public.job_alerts_sent (saved_search_id, job_id)
    select s.id, found.id
    from public.saved_searches s
    join public.profiles p on p.id = s.user_id
    where s.alert_frequency = 'instant'
      and s.user_id <> found.client_id
      and coalesce(p.is_sample, false) = false
      and public.saved_search_matches(
        s.skills, s.min_budget_cad, s.budget_type, s.province, s.remote_only,
        found.skills, found.budget_cad, found.budget_max_cad, found.budget_type, found.location
      )
    on conflict (saved_search_id, job_id) do nothing
    returning saved_search_id
  )
  select coalesce(array_agg(ins.saved_search_id), '{}') into hits from ins;

  insert into public.notifications (user_id, kind, body, href)
  select distinct s.user_id, 'job_alert', left(coalesce(found.title, 'Project'), 200), '/jobs/' || found.id::text
  from public.saved_searches s
  where s.id = any (hits);

  if coalesce(auth.role(), '') = 'service_role' then
    return query
    select s.user_id, s.id, s.unsubscribe_token, s.name
    from public.saved_searches s
    where s.id = any (hits);
  end if;
end;
$$;

-- One row per new daily match from the last 24 hours. Service role only.
create or replace function public.dispatch_daily_job_alerts()
returns table (
  recipient uuid,
  token uuid,
  search_name text,
  job_id uuid,
  job_title text,
  job_budget numeric,
  job_budget_type text,
  job_location text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    return;
  end if;

  return query
  with ins as (
    insert into public.job_alerts_sent (saved_search_id, job_id)
    select s.id, j.id
    from public.saved_searches s
    join public.profiles p on p.id = s.user_id
    join public.jobs j
      on j.status = 'open'
     and j.created_at >= now() - interval '24 hours'
    where s.alert_frequency = 'daily'
      and s.user_id <> j.client_id
      and coalesce(p.is_sample, false) = false
      and public.saved_search_matches(
        s.skills, s.min_budget_cad, s.budget_type, s.province, s.remote_only,
        j.skills, j.budget_cad, j.budget_max_cad, j.budget_type, j.location
      )
    on conflict (saved_search_id, job_id) do nothing
    returning saved_search_id, job_id
  ),
  noted as (
    insert into public.notifications (user_id, kind, body, href)
    select s.user_id,
      'job_digest',
      left(count(distinct ins.job_id)::text, 20),
      '/jobs'
    from ins
    join public.saved_searches s on s.id = ins.saved_search_id
    group by s.user_id
    returning user_id
  )
  select s.user_id,
    s.unsubscribe_token,
    s.name,
    j.id,
    j.title,
    j.budget_cad,
    j.budget_type,
    j.location
  from ins
  join public.saved_searches s on s.id = ins.saved_search_id
  join public.jobs j on j.id = ins.job_id
  where (select count(*) from noted) >= 0;
end;
$$;

create or replace function public.unsubscribe_job_alert(token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated integer;
begin
  if token is null then
    return false;
  end if;
  update public.saved_searches
     set alert_frequency = 'off'
   where unsubscribe_token = token
     and alert_frequency <> 'off';
  get diagnostics updated = row_count;
  if updated > 0 then
    return true;
  end if;
  return exists (
    select 1 from public.saved_searches s where s.unsubscribe_token = token
  );
end;
$$;

revoke all on function public.location_province(text) from public;
grant execute on function public.location_province(text) to anon, authenticated, service_role;

revoke all on function public.saved_search_matches(text[], numeric, text, text, boolean, text[], numeric, numeric, text, text) from public;
grant execute on function public.saved_search_matches(text[], numeric, text, text, boolean, text[], numeric, numeric, text, text) to anon, authenticated, service_role;

revoke all on function public.dispatch_saved_search_alerts(uuid) from public;
grant execute on function public.dispatch_saved_search_alerts(uuid) to authenticated, service_role;

revoke all on function public.dispatch_daily_job_alerts() from public, anon, authenticated;
grant execute on function public.dispatch_daily_job_alerts() to service_role;

revoke all on function public.unsubscribe_job_alert(uuid) from public;
grant execute on function public.unsubscribe_job_alert(uuid) to anon, authenticated, service_role;

-- -------------------------------- portfolio, profile links, intro messages
-- Safe to re-run. Sample profiles are not messageable.

alter table public.portfolio_items add column if not exists description text;
alter table public.portfolio_items add column if not exists position integer not null default 0;
alter table public.portfolio_items add column if not exists image_urls text[] not null default '{}';

update public.portfolio_items
set image_urls = array[image_url]
where image_url is not null
  and coalesce(cardinality(image_urls), 0) = 0;

create index if not exists portfolio_order_idx
  on public.portfolio_items (freelancer_id, position, created_at);

alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists behance text;
alter table public.profiles add column if not exists github text;
alter table public.profiles add column if not exists linkedin text;
alter table public.profiles add column if not exists instagram text;

alter table public.conversations alter column job_id drop not null;

create unique index if not exists conversations_intro_idx
  on public.conversations (client_id, freelancer_id)
  where job_id is null;

drop policy if exists "conversations: participants insert" on public.conversations;
create policy "conversations: participants insert"
  on public.conversations for insert
  to authenticated
  with check (
    (select auth.uid()) in (conversations.client_id, conversations.freelancer_id)
    and (
      (
        conversations.job_id is not null
        and exists (
          select 1 from public.jobs j
          where j.id = conversations.job_id
            and j.client_id = conversations.client_id
        )
        and (
          (select auth.uid()) = conversations.client_id
          or exists (
            select 1 from public.proposals p
            where p.job_id = conversations.job_id
              and p.freelancer_id = conversations.freelancer_id
              and p.status in ('pending', 'accepted')
          )
        )
      )
      or (
        conversations.job_id is null
        and (select auth.uid()) = conversations.client_id
        and conversations.client_id <> conversations.freelancer_id
        and exists (
          select 1 from public.profiles p
          where p.id = conversations.freelancer_id
            and coalesce(p.is_sample, false) = false
        )
      )
    )
  );




