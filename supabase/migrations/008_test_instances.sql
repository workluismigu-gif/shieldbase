-- Phase 8: test_instances — evidence-grade test iteration records.
-- Each run of a control test is its own row so Type II period coverage becomes
-- provable. Evidence may bind to a specific iteration via test_instance_id.

create table if not exists test_instances (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  control_id text not null,
  period_start date,
  period_end date,
  tested_by uuid references auth.users(id) on delete set null,
  tested_by_email text,
  tested_at timestamptz not null default now(),
  test_procedure text check (test_procedure in ('inspection','observation','inquiry','reperformance','caat','other')),
  sample_ids text,
  sample_rationale text,
  test_attributes jsonb,
  conclusion text,
  status text not null default 'draft' check (status in ('draft','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists test_instances_org_control_idx on test_instances(org_id, control_id, tested_at desc);
create index if not exists test_instances_org_period_idx on test_instances(org_id, period_start, period_end);

alter table test_instances enable row level security;

create policy "Org members read test instances" on test_instances
  for select using (public.is_org_member(org_id));

create policy "Org writers mutate test instances" on test_instances
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create or replace function touch_test_instances_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists test_instances_touch_updated_at on test_instances;
create trigger test_instances_touch_updated_at
  before update on test_instances
  for each row execute function touch_test_instances_updated_at();

-- Bind evidence records to a specific test iteration (nullable for back-compat).
alter table control_evidence
  add column if not exists test_instance_id uuid references test_instances(id) on delete set null;

create index if not exists control_evidence_test_instance_idx on control_evidence(test_instance_id);
