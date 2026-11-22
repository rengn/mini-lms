-- Database permission tests for profiles/consultations grants, RLS and triggers.
-- Run with: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data)
values
  ('a0000000-0000-4000-8000-00000000000a', 'a@test.local', '{"first_name": " Ann ", "last_name": "Able"}'),
  ('b0000000-0000-4000-8000-00000000000b', 'b@test.local', '{"first_name": "Ben", "last_name": "Baker"}');

-- Construct an admin fixture directly without converting a student account.
set local session_replication_role = replica;
insert into auth.users (id, email, raw_user_meta_data)
values ('c0000000-0000-4000-8000-00000000000c', 'c@test.local', '{"first_name": "Cat", "last_name": "Admin"}');
set local session_replication_role = origin;
insert into public.profiles (id, role)
values ('c0000000-0000-4000-8000-00000000000c', 'admin');

insert into public.consultations (id, student_id, first_name, last_name, reason, scheduled_at)
values
  ('b1000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-00000000000b', 'Ben', 'Baker', 'B upcoming', '2099-01-01 10:00+00'),
  -- Deliberately invalid fixture: verify that admins remain read-only even if
  -- privileged code creates an admin-owned consultation.
  ('c1000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-00000000000c', 'Cat', 'Admin', 'Admin-owned', '2099-01-02 10:00+00');

-- A past consultation for student A. Triggers are skipped to simulate time passing.
set local session_replication_role = replica;
insert into public.consultations (id, student_id, first_name, last_name, reason, scheduled_at)
values ('a1000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-00000000000a', 'Ann', 'Able', 'A past', '2000-01-01 10:00+00');
set local session_replication_role = origin;

-- ---------------------------------------------------------------------------
-- Sign-up (as postgres)
-- ---------------------------------------------------------------------------

select ok(
  exists (
    select 1 from public.profiles
    where id = 'a0000000-0000-4000-8000-00000000000a'
      and role = 'student'
  ),
  'sign-up creates a student profile'
);

select lives_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data)
     values ('d0000000-0000-4000-8000-00000000000d', 'd@test.local', '{}') $$,
  'sign-up without names creates a profile'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('e0000000-0000-4000-8000-00000000000e', 'e@test.local',
        '{"first_name": "Eve", "last_name": "Evil", "role": "admin", "provisioned_role": "admin"}');

select is(
  (select role from public.profiles where id = 'e0000000-0000-4000-8000-00000000000e'),
  'student'::public.app_role,
  'sign-up metadata cannot set the role'
);

-- ---------------------------------------------------------------------------
-- Student A
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
     values ('Ann', 'Able', 'A upcoming', '2099-01-01 10:00+00') $$,
  'student can book a future consultation'
);

select is(
  (select first_name || ' ' || last_name from public.consultations where reason = 'A upcoming'),
  'Ann Able',
  'consultation stores the supplied name'
);

select is(
  (select student_id from public.consultations where reason = 'A upcoming'),
  'a0000000-0000-4000-8000-00000000000a'::uuid,
  'student_id defaults to the signed-in user'
);

select throws_ok(
  $$ insert into public.consultations (student_id, first_name, last_name, reason, scheduled_at)
     values ('b0000000-0000-4000-8000-00000000000b', 'No', 'Access', 'Spoofed', '2099-03-01 10:00+00') $$,
  '42501',
  null,
  'student cannot book for another student'
);

select throws_ok(
  $$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
     values ('Ann', 'Able', 'Duplicate', '2099-01-01 10:00+00') $$,
  '23505',
  null,
  'student cannot hold two scheduled consultations at the same time'
);

select throws_ok(
  $$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
     values ('Ann', 'Able', 'Past', '2000-06-01 10:00+00') $$,
  '23514',
  null,
  'student cannot book in the past'
);

select throws_ok(
  $$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
     values ('Ann', 'Able', '   ', '2099-04-01 10:00+00') $$,
  '23514',
  null,
  'reason must not be blank'
);

select is(
  (select count(*) from public.consultations),
  2::bigint,
  'student sees only their own consultations'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'student sees only their own profile'
);

select is_empty(
  $$ update public.consultations set status = 'completed'
     where id = 'b1000000-0000-4000-8000-0000000000b1' returning id $$,
  'student cannot update another student''s consultation'
);

select throws_ok(
  $$ insert into public.consultations (reason, scheduled_at)
     values ('Missing name', '2099-04-02 10:00+00') $$,
  '23502',
  null,
  'consultation names are required'
);

select throws_ok(
  $$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
     values ('   ', 'Able', 'Blank name', '2099-04-03 10:00+00') $$,
  '23514',
  null,
  'consultation name must not be blank'
);

select throws_ok(
  $$ update public.consultations set student_id = 'b0000000-0000-4000-8000-00000000000b'
     where reason = 'A upcoming' $$,
  '42501',
  null,
  'student cannot reassign a consultation'
);

select throws_ok(
  $$ delete from public.consultations where reason = 'A upcoming' $$,
  '42501',
  null,
  'consultations cannot be deleted'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-00000000000a' $$,
  '42501',
  null,
  'student cannot change their role'
);

select throws_ok(
  $$ update public.consultations set scheduled_at = '2000-06-01 10:00+00' where reason = 'A upcoming' $$,
  '23514',
  null,
  'cannot reschedule to the past'
);

select throws_ok(
  $$ update public.consultations set scheduled_at = '2099-05-01 10:00+00', status = 'completed'
     where reason = 'A upcoming' $$,
  '23514',
  null,
  'cannot change time and status together'
);

select lives_ok(
  $$ update public.consultations set scheduled_at = '2099-02-01 10:00+00' where reason = 'A upcoming' $$,
  'student can reschedule an upcoming consultation'
);

select lives_ok(
  $$ update public.consultations set status = 'completed' where reason = 'A past' $$,
  'student can mark a consultation complete'
);

select throws_ok(
  $$ update public.consultations set status = 'scheduled' where reason = 'A past' $$,
  '23514',
  null,
  'completed consultations cannot be marked incomplete'
);

select throws_ok(
  $$ update public.consultations set status = 'cancelled' where reason = 'A past' $$,
  '23514',
  null,
  'cannot cancel a past consultation'
);

select throws_ok(
  $$ update public.consultations set scheduled_at = '2099-06-01 10:00+00' where reason = 'A past' $$,
  '23514',
  null,
  'cannot reschedule a past consultation'
);

select lives_ok(
  $$ update public.consultations set status = 'cancelled' where reason = 'A upcoming' $$,
  'student can cancel an upcoming consultation'
);

select throws_ok(
  $$ update public.consultations set status = 'scheduled' where reason = 'A upcoming' $$,
  '23514',
  null,
  'cancelled consultations cannot be changed'
);

select lives_ok(
  $$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
     values ('Ann', 'Able', 'A rebooked', '2099-02-01 10:00+00') $$,
  'a cancelled slot can be booked again'
);

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.consultations $$,
  '42501',
  null,
  'anonymous users cannot read consultations'
);

select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'anonymous users cannot read profiles'
);

-- ---------------------------------------------------------------------------
-- Admin C
-- ---------------------------------------------------------------------------

reset role;
-- Totals as seen by postgres (RLS bypassed), including any seed data.
select set_config('test.consultation_count', (select count(*) from public.consultations)::text, true);
select set_config('test.profile_count', (select count(*) from public.profiles)::text, true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-00000000000c", "role": "authenticated"}', true);

select is(
  (select count(*) from public.consultations),
  current_setting('test.consultation_count')::bigint,
  'admin sees all consultations'
);

select is(
  (select count(*) from public.profiles),
  current_setting('test.profile_count')::bigint,
  'admin sees all profiles'
);

select throws_ok(
  $$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
     values ('Admin', 'User', 'Admin booking', '2099-07-01 10:00+00') $$,
  '42501',
  null,
  'admin cannot book consultations'
);

select is_empty(
  $$ update public.consultations set status = 'completed'
     where id = 'b1000000-0000-4000-8000-0000000000b1' returning id $$,
  'admin cannot update consultations'
);

select is_empty(
  $$ update public.consultations set status = 'completed'
     where id = 'c1000000-0000-4000-8000-0000000000c1' returning id $$,
  'admin cannot update even an admin-owned consultation'
);

-- ---------------------------------------------------------------------------
-- Account deletion (as postgres)
-- ---------------------------------------------------------------------------

reset role;

select throws_ok(
  $$ delete from auth.users where id = 'b0000000-0000-4000-8000-00000000000b' $$,
  '23503',
  null,
  'users with consultations cannot be deleted'
);

select lives_ok(
  $$ delete from auth.users where id = 'e0000000-0000-4000-8000-00000000000e' $$,
  'users without consultations can be deleted'
);

select * from finish();
rollback;
