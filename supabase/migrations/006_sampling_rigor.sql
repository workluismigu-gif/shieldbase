-- Phase 6: Sampling rigor + test procedure documentation
-- Adds AICPA-aligned sampling defensibility: procedure type per control, sample IDs
-- actually tested, rationale memo, and a deterministic RNG seed per engagement so
-- sample selection is reproducible.

alter table controls
  add column if not exists test_procedure text
    check (test_procedure in ('inspection','observation','inquiry','reperformance','caat','other')),
  add column if not exists sample_ids text,
  add column if not exists sample_rationale text,
  add column if not exists tested_by_email text,
  add column if not exists tested_at timestamptz;

alter table organizations
  add column if not exists sample_seed text;
