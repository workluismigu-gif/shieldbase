-- Phase 2: Evidence collection tables

-- Evidence table: stores raw API responses and config snapshots per control
create table if not exists control_evidence (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  control_id text not null,
  scan_id uuid references scan_results(id) on delete cascade,
  evidence_type text not null, -- 'api_response', 'config_snapshot', 'screenshot_ref', 'log_excerpt'
  evidence_data jsonb not null, -- raw API response or config data
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for fast evidence lookups per control
create index if not exists idx_control_evidence_control on control_evidence(org_id, control_id, collected_at desc);

-- RLS: users can only see their own org's evidence
alter table control_evidence enable row level security;
create policy "Users can view their org's evidence" on control_evidence
  for select using (org_id in (select id from organizations where owner_id = auth.uid()));
create policy "Service role can insert evidence" on control_evidence
  for insert with check (true); -- service role bypasses RLS

-- Add evidence_url column to controls for quick reference to latest evidence
alter table controls add column if not exists latest_evidence_id uuid references control_evidence(id);
