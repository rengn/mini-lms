-- Mini LMS schema: profiles with roles, consultations, triggers, grants and RLS.

-- Private schema for helpers and trigger functions. It is not exposed through
-- the Data API, so none of these functions can be called directly by clients.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('student', 'admin');

create type public.consultation_status as enum ('scheduled', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. Created by trigger at sign-up';

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  -- Restrict: a student with consultations cannot be deleted (deleting the
  -- auth user cascades to profiles, which this foreign key then blocks).
  student_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  first_name text not null
    constraint consultations_first_name_check
    check (first_name = btrim(first_name) and char_length(first_name) between 1 and 100),
  last_name text not null
    constraint consultations_last_name_check
    check (last_name = btrim(last_name) and char_length(last_name) between 1 and 100),
  reason text not null
    constraint consultations_reason_check
    check (reason = btrim(reason) and char_length(reason) between 1 and 1000),
  scheduled_at timestamptz not null,
  status public.consultation_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.consultations is 'Student consultations. Cancellation is a status change; rows are never deleted.';

-- Student dashboard: own consultations ordered by time (also serves RLS ownership checks).
create index consultations_student_id_scheduled_at_idx
  on public.consultations (student_id, scheduled_at);

-- Admin list: all consultations ordered by time, with id as a stable tiebreaker.
create index consultations_scheduled_at_id_idx
  on public.consultations (scheduled_at, id);

-- A student cannot hold two scheduled consultations at the exact same time.
create unique index consultations_student_id_scheduled_at_key
  on public.consultations (student_id, scheduled_at)
  where status = 'scheduled';

-- ---------------------------------------------------------------------------
-- Trigger functions
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Runs inside the Auth sign-up transaction. The role always defaults to student;
-- user-supplied metadata cannot assign a role.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

-- State rules that RLS cannot express because they compare old and new rows.
-- Violations use SQLSTATE 23514 (check_violation) so the API can map them to 422.
create function private.enforce_consultation_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'scheduled' then
      raise exception 'New consultations must be scheduled'
        using errcode = 'check_violation';
    end if;

    if new.scheduled_at <= now() then
      raise exception 'Consultations must be booked in the future'
        using errcode = 'check_violation';
    end if;

    return new;
  end if;

  if old.status = 'cancelled' then
    raise exception 'Cancelled consultations cannot be changed'
      using errcode = 'check_violation';
  end if;

  if old.status = 'completed' and new.status = 'scheduled' then
    raise exception 'Completed consultations cannot be marked incomplete'
      using errcode = 'check_violation';
  end if;

  if new.scheduled_at is distinct from old.scheduled_at
    and new.status is distinct from old.status then
    raise exception 'Change either the time or the status, not both'
      using errcode = 'check_violation';
  end if;

  -- Reschedule: only scheduled, still-upcoming consultations, to a future time.
  if new.scheduled_at is distinct from old.scheduled_at then
    if old.status <> 'scheduled' then
      raise exception 'Only scheduled consultations can be rescheduled'
        using errcode = 'check_violation';
    end if;

    if old.scheduled_at <= now() then
      raise exception 'Past consultations cannot be rescheduled'
        using errcode = 'check_violation';
    end if;

    if new.scheduled_at <= now() then
      raise exception 'Consultations must be rescheduled to the future'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Cancel: only scheduled, still-upcoming consultations.
  -- Scheduled consultations can be completed at any time; completion is final.
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    if old.status <> 'scheduled' then
      raise exception 'Only scheduled consultations can be cancelled'
        using errcode = 'check_violation';
    end if;

    if old.scheduled_at <= now() then
      raise exception 'Past consultations cannot be cancelled'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger set_updated_at
    before update on public.consultations
    for each row execute function private.set_updated_at();

create trigger enforce_consultation_rules
  before insert or update on public.consultations
  for each row execute function private.enforce_consultation_rules();

-- ---------------------------------------------------------------------------
-- Authorization helper
-- ---------------------------------------------------------------------------

-- security definer: reads profiles without re-entering its own RLS policy
-- (which calls this function). The empty search_path prevents object hijacking.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Grants: which columns each role may touch
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.consultations from anon, authenticated;

grant select on public.profiles to authenticated;

grant select on public.consultations to authenticated;

grant insert (first_name, last_name, reason, scheduled_at) on public.consultations to authenticated;
grant update (scheduled_at, status) on public.consultations to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security: which rows each user may see or change
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.consultations enable row level security;

create policy "Users read their own profile; Admins read all profiles"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy "Students read their own consultations; Admins read all consultations"
  on public.consultations
  for select
  to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()));

create policy "Only Students (not Admins) can book consultations for themselves"
  on public.consultations
  for insert
  to authenticated
  with check (student_id = (select auth.uid()) and not (select private.is_admin()));

create policy "Students update their own consultations"
  on public.consultations
  for update
  to authenticated
  using (student_id = (select auth.uid()) and not (select private.is_admin()))
  with check (student_id = (select auth.uid()) and not (select private.is_admin()));
