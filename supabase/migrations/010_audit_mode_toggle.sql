-- Phase 10: audit mode toggle for the founder-first experience
-- When an owner signs up to become SOC 2 compliant, they don't need
-- auditor-workbench pages cluttering the sidebar. This toggle unlocks
-- the auditor-side surface area once they're actually mid-engagement.

alter table organizations
  add column if not exists audit_mode_enabled boolean not null default false;

comment on column organizations.audit_mode_enabled is
  'When true, owners see auditor-only pages (Findings, IPE, Sampling, Crosswalk, Engagements). When false, self-service founder mode hides them.';
