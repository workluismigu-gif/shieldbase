-- Phase 3: Webhook event tracking

-- Store raw webhook events for audit trail
create table if not exists webhook_events (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade,
  provider text not null, -- 'github', 'aws', etc.
  event_type text not null, -- 'repository', 'push', 'pull_request', etc.
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_events_org on webhook_events(org_id, created_at desc);
create index if not exists idx_webhook_events_processed on webhook_events(processed) where processed = false;

-- RLS
alter table webhook_events enable row level security;
create policy "Users can view their org's webhook events" on webhook_events
  for select using (org_id in (select id from organizations where owner_id = auth.uid()));
create policy "Service role can insert webhook events" on webhook_events
  for insert with check (true);
