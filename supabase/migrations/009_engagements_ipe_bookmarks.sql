-- Phase 9: engagements + IPE walkthroughs + auditor bookmarks
-- Engagements: first-class audit cycles with prior-year linkage.
-- IPE walkthroughs: completeness/accuracy testing records for IPE reports.
-- Auditor bookmarks: per-user "where did I leave off" state.

create table if not exists engagements (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  period_start date,
  period_end date,
  framework text not null default 'soc2_type2',
  status text not null default 'planning' check (status in ('planning','fieldwork','review','issued','closed')),
  prior_engagement_id uuid references engagements(id) on delete set null,
  lead_auditor_email text,
  sample_seed text,
  report_issued_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists engagements_org_idx on engagements(org_id, created_at desc);
alter table engagements enable row level security;
create policy "Org members read engagements" on engagements
  for select using (public.is_org_member(org_id));
create policy "Org writers mutate engagements" on engagements
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create or replace function touch_engagements_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists engagements_touch_updated_at on engagements;
create trigger engagements_touch_updated_at
  before update on engagements
  for each row execute function touch_engagements_updated_at();

create table if not exists ipe_walkthroughs (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  report_name text not null,
  source_system text,
  query_or_source text,
  completeness_tested boolean not null default false,
  completeness_method text,
  accuracy_tested boolean not null default false,
  accuracy_method text,
  tested_by_email text,
  tested_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ipe_org_idx on ipe_walkthroughs(org_id, created_at desc);
alter table ipe_walkthroughs enable row level security;
create policy "Org members read ipe" on ipe_walkthroughs
  for select using (public.is_org_member(org_id));
create policy "Org writers mutate ipe" on ipe_walkthroughs
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create table if not exists auditor_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  last_path text,
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, org_id)
);
alter table auditor_bookmarks enable row level security;
create policy "User reads own bookmark" on auditor_bookmarks
  for select using (user_id = auth.uid());
create policy "User mutates own bookmark" on auditor_bookmarks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
