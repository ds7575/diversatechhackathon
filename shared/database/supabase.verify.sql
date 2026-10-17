-- Run after shared/database/supabase.sql in the Supabase SQL editor or psql.
-- This script is read-only except for raising an exception when configuration is incomplete.

do $$
declare missing_tables text;
begin
  select string_agg(expected.name, ', ' order by expected.name)
  into missing_tables
  from unnest(array[
    'trips','members','invites','imports','import_contributors','places','import_places',
    'evidence','recommendations','member_place_evaluations','reactions','concerns',
    'day_assignments','provider_spend'
  ]) as expected(name)
  where to_regclass('public.' || expected.name) is null;
  if missing_tables is not null then raise exception 'Missing Travel Sync tables: %', missing_tables; end if;
end $$;

do $$
declare unprotected text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'trips','members','invites','imports','import_contributors','places','import_places',
      'evidence','recommendations','member_place_evaluations','reactions','concerns',
      'day_assignments','provider_spend'
    ])
    and not c.relrowsecurity;
  if unprotected is not null then raise exception 'RLS is disabled on: %', unprotected; end if;
end $$;

do $$
declare missing_realtime text;
begin
  select string_agg(expected.name, ', ' order by expected.name)
  into missing_realtime
  from unnest(array['imports','places','recommendations','reactions','concerns','day_assignments']) as expected(name)
  where not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = expected.name
  );
  if missing_realtime is not null then raise exception 'Missing Realtime tables: %', missing_realtime; end if;
end $$;

select 'Travel Sync Supabase schema verified' as result;
