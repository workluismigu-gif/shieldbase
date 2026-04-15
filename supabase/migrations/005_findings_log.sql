-- Phase 5: Findings / Exceptions Log
-- Auditor's formal record of deficiencies and exceptions found during fieldwork.
-- Distinct from "failing controls" — a failing control may or may not become a
-- finding depending on auditor judgment (materiality, compensating controls).

create table if not exists findings (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  control_id text,                                          -- soft reference; may be null for narrative findings
  scan_result_id uuid references scan_results(id) on delete set null,
  title text not null,
  description text,
  severity text not null default 'medium'
    check (severity in ('critical','high','medium','low','informational')),
  disposition text not null default 'observation'
    check (disposition in ('observation','deficiency','significant_deficiency','material_weakness','not_a_deficiency')),
  status text not null default 'open'
    check (status in ('open','remediating','resolved','accepted','deferred')),
  management_response text,
  remediation_owner_email text,
  remediation_target_date date,
  auditor_conclusion text,                                  -- workpaper language
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists findings_org_status_idx on findings(org_id, status);
create index if not exists findings_org_control_idx on findings(org_id, control_id);
create index if not exists findings_org_created_idx on findings(org_id, created_at desc);

-- Activity thread per finding: status changes, disposition changes, comments, responses.
create table if not exists finding_events (
  id uuid default gen_random_uuid() primary key,
  finding_id uuid not null references findings(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  event_type text not null
    check (event_type in ('comment','status_change','disposition_change','management_response','auditor_note')),
  author_id uuid references auth.users(id) on delete set null,
  author_email text,
  body text,
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index if not exists finding_events_finding_idx on finding_events(finding_id, created_at desc);

-- Keep updated_at fresh
create or replace function touch_findings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists findings_touch_updated_at on findings;
create trigger findings_touch_updated_at
  before update on findings
  for each row execute function touch_findings_updated_at();

alter table findings enable row level security;
alter table finding_events enable row level security;

-- Readers: any org member (owner, admin, auditor_readonly) via is_org_member helper
-- Writers: owners, admins, and auditors can mutate. (Auditors need to create/update
-- findings — that's their whole job.)
create policy "Org members read findings" on findings
  for select using (
    public.is_org_member(org_id)
  );

create policy "Org writers mutate findings" on findings
  for all using (
    public.is_org_member(org_id)
  ) with check (
    public.is_org_member(org_id)
  );

create policy "Org members read finding events" on finding_events
  for select using (
    public.is_org_member(org_id)
  );

create policy "Org writers add finding events" on finding_events
  for insert with check (
    public.is_org_member(org_id)
  );
