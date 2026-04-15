-- Phase 7: auditor_staff role + per-control assignments
-- Lead auditors (auditor_readonly) can invite staff associates (auditor_staff)
-- and scope their visibility to specific controls. Staff cannot sign off.

alter table org_members drop constraint org_members_role_check;
alter table org_members add constraint org_members_role_check
  check (role = any (array['owner'::text, 'admin'::text, 'auditor_readonly'::text, 'auditor_staff'::text]));

create table if not exists control_assignments (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  control_id text not null,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (org_id, control_id, assigned_to)
);

create index if not exists control_assignments_user_idx on control_assignments(assigned_to, org_id);
create index if not exists control_assignments_control_idx on control_assignments(org_id, control_id);

alter table control_assignments enable row level security;

create policy "Org members read assignments" on control_assignments
  for select using (public.is_org_member(org_id));

create policy "Leads mutate assignments" on control_assignments
  for all using (
    exists (select 1 from org_members m where m.org_id = control_assignments.org_id
      and m.user_id = auth.uid() and m.role in ('owner','admin','auditor_readonly'))
    or exists (select 1 from organizations o where o.id = control_assignments.org_id and o.owner_id = auth.uid())
  ) with check (
    exists (select 1 from org_members m where m.org_id = control_assignments.org_id
      and m.user_id = auth.uid() and m.role in ('owner','admin','auditor_readonly'))
    or exists (select 1 from organizations o where o.id = control_assignments.org_id and o.owner_id = auth.uid())
  );

create or replace function public.user_can_see_control(p_org uuid, p_control text)
returns boolean
language sql security definer stable set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when exists (select 1 from organizations o where o.id = p_org and o.owner_id = auth.uid()) then true
    when exists (select 1 from org_members m where m.org_id = p_org and m.user_id = auth.uid()
      and m.role in ('owner','admin','auditor_readonly')) then true
    when exists (select 1 from org_members m where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'auditor_staff')
      then exists (select 1 from control_assignments ca where ca.org_id = p_org
        and ca.control_id = p_control and ca.assigned_to = auth.uid())
    else false
  end;
$$;

grant execute on function public.user_can_see_control(uuid, text) to authenticated;
