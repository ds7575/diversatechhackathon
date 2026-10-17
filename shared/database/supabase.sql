-- Person 3 Supabase proposal. Apply through a reviewed migration, not from the browser.
-- The backend/service role owns writes; authenticated trip members receive read access
-- so the frontend can safely subscribe to Postgres Changes.

create table if not exists public.trips (
  id text primary key,
  name text not null,
  destination text not null,
  start_date date,
  end_date date,
  base_area text,
  transport text,
  budget text,
  preferences jsonb not null default '{}'::jsonb,
  plan_revision integer not null default 0 check (plan_revision >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check ((start_date is null and end_date is null) or
    (start_date is not null and end_date is not null and end_date >= start_date))
);

create table if not exists public.members (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  subject_id uuid not null references auth.users(id),
  display_name text not null,
  preferences jsonb not null default '{}'::jsonb,
  firm_limits jsonb not null default '{}'::jsonb,
  unique (trip_id, subject_id),
  unique (trip_id, id)
);

create table if not exists public.invites (
  token_hash text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table if not exists public.imports (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  normalized_url text not null,
  status text not null check (status in ('queued','processing','ready','partially_ready','needs_confirmation','failed')),
  thumbnail_url text,
  error_code text,
  created_at timestamptz not null default now(),
  unique (trip_id, normalized_url),
  unique (trip_id, id)
);

create table if not exists public.import_contributors (
  trip_id text not null,
  import_id text not null,
  member_id text not null,
  primary key (import_id, member_id),
  foreign key (trip_id, import_id) references public.imports(trip_id, id) on delete cascade,
  foreign key (trip_id, member_id) references public.members(trip_id, id) on delete cascade
);

create table if not exists public.places (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  name text not null,
  identity_key text not null,
  match_status text not null check (match_status in ('confirmed','uncertain')),
  area text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  brief text,
  practical jsonb not null default '{}'::jsonb,
  unique (trip_id, identity_key),
  unique (trip_id, id),
  check ((latitude is null) = (longitude is null))
);

create table if not exists public.import_places (
  trip_id text not null,
  import_id text not null,
  place_id text not null,
  primary key (import_id, place_id),
  foreign key (trip_id, import_id) references public.imports(trip_id, id) on delete cascade,
  foreign key (trip_id, place_id) references public.places(trip_id, id) on delete cascade
);

create table if not exists public.evidence (
  id text primary key,
  trip_id text not null,
  place_id text not null,
  source_url text not null,
  retrieved_at timestamptz not null,
  facts jsonb not null default '[]'::jsonb,
  source_kind text,
  source_path text,
  timestamp_seconds double precision check (timestamp_seconds is null or timestamp_seconds >= 0),
  foreign key (trip_id, place_id) references public.places(trip_id, id) on delete cascade
);

create table if not exists public.recommendations (
  trip_id text not null,
  place_id text primary key,
  verdict text not null check (verdict in ('strong_match','recommended','mixed_fit','not_recommended','needs_more_information')),
  score integer not null check (score between 0 and 100),
  headline text not null,
  text text not null,
  evidence_status text not null check (evidence_status in ('confirmed','partial','uncertain')),
  generated_at timestamptz not null default now(),
  foreign key (trip_id, place_id) references public.places(trip_id, id) on delete cascade
);

create table if not exists public.member_place_evaluations (
  trip_id text not null,
  place_id text not null,
  member_id text not null,
  fit text not null check (fit in ('strong','good','mixed','poor','blocked','insufficient_information')),
  matched_criteria jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  primary key (place_id, member_id),
  foreign key (trip_id, place_id) references public.places(trip_id, id) on delete cascade,
  foreign key (trip_id, member_id) references public.members(trip_id, id) on delete cascade
);

create table if not exists public.reactions (
  trip_id text not null,
  place_id text not null,
  member_id text not null,
  value text not null check (value in ('interested','pass')),
  primary key (place_id, member_id),
  foreign key (trip_id, place_id) references public.places(trip_id, id) on delete cascade,
  foreign key (trip_id, member_id) references public.members(trip_id, id) on delete cascade
);

create table if not exists public.concerns (
  id text primary key,
  trip_id text not null,
  place_id text not null,
  member_id text not null,
  kind text not null check (kind in ('price','distance','effort')),
  note text,
  foreign key (trip_id, place_id) references public.places(trip_id, id) on delete cascade,
  foreign key (trip_id, member_id) references public.members(trip_id, id) on delete cascade
);

create table if not exists public.day_assignments (
  trip_id text not null,
  place_id text primary key,
  date date,
  position integer not null check (position >= 0),
  manual boolean not null default false,
  reason text not null,
  foreign key (trip_id, place_id) references public.places(trip_id, id) on delete cascade
);

create table if not exists public.provider_spend (
  id text primary key,
  provider text not null,
  endpoint text not null,
  cost_usd numeric(12,6) not null check (cost_usd >= 0),
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);

create unique index if not exists assignment_slot
  on public.day_assignments (trip_id, coalesce(date, '-infinity'::date), position);
create index if not exists members_subject on public.members(subject_id, trip_id);
create index if not exists places_trip on public.places(trip_id);
create index if not exists imports_trip on public.imports(trip_id);
create index if not exists provider_spend_created on public.provider_spend(created_at);

-- SECURITY DEFINER avoids recursive members policies. Its fixed search_path is intentional.
create or replace function public.is_trip_member(target_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where trip_id = target_trip_id and subject_id = (select auth.uid())
  );
$$;

revoke all on function public.is_trip_member(text) from public;
grant execute on function public.is_trip_member(text) to authenticated;

alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.imports enable row level security;
alter table public.import_contributors enable row level security;
alter table public.places enable row level security;
alter table public.import_places enable row level security;
alter table public.evidence enable row level security;
alter table public.recommendations enable row level security;
alter table public.member_place_evaluations enable row level security;
alter table public.reactions enable row level security;
alter table public.concerns enable row level security;
alter table public.day_assignments enable row level security;
alter table public.provider_spend enable row level security;

revoke all on public.trips, public.members, public.invites, public.imports,
  public.import_contributors, public.places, public.import_places, public.evidence,
  public.recommendations, public.member_place_evaluations, public.reactions,
  public.concerns, public.day_assignments, public.provider_spend from anon, authenticated;
grant select on public.trips, public.members, public.imports,
  public.import_contributors, public.places, public.import_places, public.evidence,
  public.recommendations, public.member_place_evaluations, public.reactions,
  public.concerns, public.day_assignments to authenticated;

create policy "members read trips" on public.trips for select to authenticated
  using ((select public.is_trip_member(id)));

create policy "members read members" on public.members for select to authenticated
  using ((select public.is_trip_member(trip_id)));

create policy "members read imports" on public.imports for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read import contributors" on public.import_contributors for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read places" on public.places for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read import places" on public.import_places for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read evidence" on public.evidence for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read recommendations" on public.recommendations for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read evaluations" on public.member_place_evaluations for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read reactions" on public.reactions for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read concerns" on public.concerns for select to authenticated
  using ((select public.is_trip_member(trip_id)));
create policy "members read assignments" on public.day_assignments for select to authenticated
  using ((select public.is_trip_member(trip_id)));

-- Postgres Changes only emits rows a subscriber is allowed to select.
do $$
declare table_name text;
begin
  foreach table_name in array array['imports','places','recommendations','reactions','concerns','day_assignments']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
