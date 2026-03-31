-- ShieldBase Database Schema
-- Run this in Supabase SQL editor: supabase.com/dashboard → SQL Editor → Paste → Run

-- Leads from landing page email capture
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_page',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organizations (clients)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tech_stack JSONB DEFAULT '{}',
  readiness_score INTEGER DEFAULT 0,
  industry TEXT,
  employee_count INTEGER,
  cloud_provider TEXT,
  frameworks TEXT[] DEFAULT ARRAY['soc2']
);

-- Controls tracking
CREATE TABLE IF NOT EXISTS controls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  control_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_assessed' CHECK (status IN ('compliant', 'partial', 'non_compliant', 'not_assessed')),
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  remediation_notes TEXT,
  evidence_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documents (policies, gap analysis, etc.)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('gap_analysis', 'policy', 'evidence_runbook', 'remediation_plan')),
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Remediation checklist
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  task TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  "order" INTEGER DEFAULT 0
);

-- Scan results (from Prowler/Steampipe)
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scanner TEXT NOT NULL,
  scan_type TEXT,
  findings JSONB NOT NULL DEFAULT '[]',
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
-- Leads: public insert (anyone can submit email), only service role can read
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own org" ON organizations
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can manage own controls" ON controls
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage own checklist" ON checklist_items
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage own scans" ON scan_results
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

-- Anyone can submit their email (lead capture)
CREATE POLICY "Anyone can insert leads" ON leads
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_controls_org ON controls(org_id);
CREATE INDEX IF NOT EXISTS idx_controls_status ON controls(status);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_checklist_org ON checklist_items(org_id);
CREATE INDEX IF NOT EXISTS idx_scans_org ON scan_results(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
