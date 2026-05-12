-- ============================================================
-- Migration: turn the single-event site into a class-registration system
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1) Add is_trial + waze_url to classes
alter table public.classes
  add column if not exists is_trial  boolean not null default false,
  add column if not exists waze_url  text;

-- 2) Add is_trial to enrollments
alter table public.enrollments
  add column if not exists is_trial  boolean not null default false;

-- 3) Public-safe view of classes + spots_left, no exposure of enrollment details
create or replace function public.classes_for_landing()
returns table (
  id              uuid,
  title           text,
  date_iso        date,
  date_display    text,
  hebrew_date     text,
  time_start      text,
  time_end        text,
  location_line1  text,
  location_line2  text,
  notes           text,
  capacity        integer,
  is_active       boolean,
  is_trial        boolean,
  waze_url        text,
  enrolled_count  integer,
  spots_left      integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id, c.title, c.date_iso, c.date_display, c.hebrew_date,
    c.time_start, c.time_end, c.location_line1, c.location_line2,
    c.notes, c.capacity, c.is_active, c.is_trial, c.waze_url,
    coalesce(e.cnt, 0)::int                                                 as enrolled_count,
    greatest(coalesce(c.capacity, 0) - coalesce(e.cnt, 0), 0)::int          as spots_left
  from public.classes c
  left join (
    select class_id, count(*)::int as cnt
    from public.enrollments
    where class_id is not null
    group by class_id
  ) e on e.class_id = c.id
  where c.is_active = true
  order by c.date_iso asc, c.time_start asc;
$$;

grant execute on function public.classes_for_landing() to anon, authenticated;
