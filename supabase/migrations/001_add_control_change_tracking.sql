-- Add previous_status column to controls table for change detection
alter table controls add column if not exists previous_status text check (previous_status in ('compliant', 'non_compliant', 'partial', 'not_assessed'));

-- Add activity_events table for scan initiation and control change logs
create table if not exists activity_events (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  type text not null check (type in ('scan', 'integration', 'control_change', 'org_created')),
  title text not null,
  detail text,
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for fast activity feed queries
create index if not exists idx_activity_events_org_timestamp on activity_events(org_id, timestamp desc);

-- RLS: users can only see their own org's activity events
alter table activity_events enable row level security;
create policy "Users can view their org's activity events" on activity_events
  for select using (org_id in (select id from organizations where owner_id = auth.uid()));
