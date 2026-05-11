-- ============================================================
-- Tene Yoga Tkoa — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ---- Tables ----------------------------------------------------

create table if not exists public.classes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default 'שיעור יוגה',
  date_iso        date not null,                         -- 2026-05-08
  date_display    text not null,                         -- "8.5"
  hebrew_date     text,                                  -- "כ״א באייר"
  time_start      text not null,                         -- "08:30"
  time_end        text,                                  -- "09:45"
  location_line1  text default 'סטודיו של איתן',
  location_line2  text default 'תכלת מרדכי 529, תקוע',
  notes           text,
  capacity        integer default 20,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references public.classes(id) on delete set null,
  name        text not null,
  phone       text not null,
  email       text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists enrollments_class_id_idx on public.enrollments(class_id);
create index if not exists enrollments_created_at_idx on public.enrollments(created_at desc);
create index if not exists classes_active_date_idx on public.classes(is_active, date_iso);

-- ---- Row Level Security ----------------------------------------

alter table public.classes     enable row level security;
alter table public.enrollments enable row level security;

-- Helper: is current user the admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (select email = 'itael8@gmail.com' from auth.users where id = auth.uid()),
    false
  );
$$;

-- classes policies
drop policy if exists "classes_public_read"  on public.classes;
drop policy if exists "classes_admin_write"  on public.classes;

create policy "classes_public_read"
  on public.classes for select
  to anon, authenticated
  using (true);

create policy "classes_admin_write"
  on public.classes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- enrollments policies
drop policy if exists "enrollments_public_insert" on public.enrollments;
drop policy if exists "enrollments_admin_read"    on public.enrollments;
drop policy if exists "enrollments_admin_write"   on public.enrollments;

create policy "enrollments_public_insert"
  on public.enrollments for insert
  to anon, authenticated
  with check (true);

create policy "enrollments_admin_read"
  on public.enrollments for select
  to authenticated
  using (public.is_admin());

create policy "enrollments_admin_write"
  on public.enrollments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "enrollments_admin_delete"
  on public.enrollments for delete
  to authenticated
  using (public.is_admin());

-- ---- Seed the first class --------------------------------------

insert into public.classes
  (title, date_iso, date_display, hebrew_date, time_start, time_end, location_line1, location_line2, is_active)
values
  ('שיעור ניסיון', '2026-05-08', '8.5', 'כ״א באייר', '08:30', '09:45',
   'סטודיו של איתן', 'תכלת מרדכי 529, תקוע', true)
on conflict do nothing;
