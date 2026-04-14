-- GRC auditor workflow expansion
-- Adds: team/auditor memberships, policy acknowledgements, remediation ownership,
-- control testing/approval fields, audit scope config, and RLS helpers.

CREATE TABLE IF NOT EXISTS public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','admin','auditor_readonly')),
  invited_by uuid REFERENCES auth.users(id),
  invite_token text UNIQUE,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, email)
);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.org_members(user_id);

CREATE TABLE IF NOT EXISTS public.policy_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  policy_version text DEFAULT 'v1',
  acknowledged_at timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id, policy_key, policy_version)
);
CREATE INDEX IF NOT EXISTS idx_policy_ack_org ON public.policy_acknowledgements(org_id);

ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open'
    CHECK (status IN ('open','in_progress','done','blocked'));

ALTER TABLE public.controls
  ADD COLUMN IF NOT EXISTS tested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS test_notes text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS scope_config jsonb DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = target_org AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = target_org AND user_id = auth.uid() AND accepted_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = target_org AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = target_org AND user_id = auth.uid()
      AND role IN ('owner','admin') AND accepted_at IS NOT NULL
  );
$$;

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_members_select ON public.org_members;
CREATE POLICY org_members_select ON public.org_members FOR SELECT
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS org_members_insert ON public.org_members;
CREATE POLICY org_members_insert ON public.org_members FOR INSERT
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS org_members_update ON public.org_members;
CREATE POLICY org_members_update ON public.org_members FOR UPDATE
  USING (public.is_org_admin(org_id) OR user_id = auth.uid())
  WITH CHECK (public.is_org_admin(org_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS org_members_delete ON public.org_members;
CREATE POLICY org_members_delete ON public.org_members FOR DELETE
  USING (public.is_org_admin(org_id));

DROP POLICY IF EXISTS policy_ack_select ON public.policy_acknowledgements;
CREATE POLICY policy_ack_select ON public.policy_acknowledgements FOR SELECT
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS policy_ack_insert ON public.policy_acknowledgements;
CREATE POLICY policy_ack_insert ON public.policy_acknowledgements FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(org_id));
