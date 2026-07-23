-- BrightPath QSBS & Business Strategy Lab
-- Supabase Database Schema
-- Version 1.0 | June 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

-- ─── COMPANIES ───────────────────────────────────────────────────────────────
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dba TEXT,
  state TEXT,
  formation_date DATE,
  legal_entity TEXT, -- LLC, Corporation, Sole Proprietor, Partnership
  federal_tax_class TEXT, -- Disregarded, Partnership, S-Corp, C-Corp
  tax_year TEXT DEFAULT 'Calendar',
  ein_placeholder TEXT,
  is_preloaded BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their companies" ON companies
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_companies_user ON companies(user_id);

-- ─── OWNERS ──────────────────────────────────────────────────────────────────
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  ownership_pct NUMERIC(8,4),
  entity_type TEXT DEFAULT 'individual', -- individual, trust, entity
  state_residency TEXT,
  filing_status TEXT DEFAULT 'mfj',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their owners" ON owners
  FOR ALL USING (auth.uid() = user_id);

-- ─── ENTITY EVENTS ───────────────────────────────────────────────────────────
CREATE TABLE entity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- formation, election, conversion, issuance, financing, etc.
  event_date DATE,
  description TEXT,
  legal_entity_before TEXT,
  tax_class_before TEXT,
  legal_entity_after TEXT,
  tax_class_after TEXT,
  valuation_at_event NUMERIC(15,2),
  notes TEXT,
  professional_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE entity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their entity events" ON entity_events
  FOR ALL USING (auth.uid() = user_id);

-- ─── STOCK ISSUANCES ─────────────────────────────────────────────────────────
CREATE TABLE stock_issuances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  shareholder_name TEXT NOT NULL,
  stock_class TEXT DEFAULT 'Common',
  shares NUMERIC(15,4),
  issue_date DATE,
  acquisition_date DATE,
  money_paid NUMERIC(15,2) DEFAULT 0,
  property_fmv NUMERIC(15,2) DEFAULT 0,
  services_value NUMERIC(15,2) DEFAULT 0,
  normal_tax_basis NUMERIC(15,2),
  sec1202_basis NUMERIC(15,2), -- special basis per 1202(e)(3)
  contributed_property_fmv NUMERIC(15,2),
  gross_assets_before NUMERIC(15,2),
  cash_received NUMERIC(15,2),
  gross_assets_after NUMERIC(15,2),
  original_issue BOOLEAN DEFAULT TRUE,
  redemptions_exist BOOLEAN DEFAULT FALSE,
  repurchases_exist BOOLEAN DEFAULT FALSE,
  law_version TEXT DEFAULT 'post_july4_2025',
  qualification_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stock_issuances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their stock issuances" ON stock_issuances
  FOR ALL USING (auth.uid() = user_id);

-- ─── VALUATION RECORDS ───────────────────────────────────────────────────────
CREATE TABLE valuation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  record_date DATE,
  period_label TEXT,
  arr NUMERIC(15,2),
  mrr NUMERIC(15,2),
  revenue_ltm NUMERIC(15,2),
  gross_margin_pct NUMERIC(6,3),
  ebitda NUMERIC(15,2),
  customer_count INTEGER,
  churn_pct NUMERIC(6,3),
  growth_pct NUMERIC(6,3),
  -- Valuation methods
  arr_multiple NUMERIC(8,2),
  revenue_multiple NUMERIC(8,2),
  ebitda_multiple NUMERIC(8,2),
  dcf_value NUMERIC(15,2),
  comp_value NUMERIC(15,2),
  precedent_value NUMERIC(15,2),
  cost_approach_value NUMERIC(15,2),
  nav_value NUMERIC(15,2),
  ip_value NUMERIC(15,2),
  custom_value NUMERIC(15,2),
  weighted_ev_low NUMERIC(15,2),
  weighted_ev_base NUMERIC(15,2),
  weighted_ev_high NUMERIC(15,2),
  equity_value_base NUMERIC(15,2),
  aggregate_gross_assets NUMERIC(15,2),
  notes TEXT,
  source TEXT,
  confidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE valuation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their valuations" ON valuation_records
  FOR ALL USING (auth.uid() = user_id);

-- ─── ASSET RECORDS ───────────────────────────────────────────────────────────
CREATE TABLE asset_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  record_date DATE,
  cash NUMERIC(15,2) DEFAULT 0,
  receivables NUMERIC(15,2) DEFAULT 0,
  prepaid NUMERIC(15,2) DEFAULT 0,
  equipment_book NUMERIC(15,2) DEFAULT 0,
  equipment_basis NUMERIC(15,2) DEFAULT 0,
  equipment_fmv NUMERIC(15,2) DEFAULT 0,
  software_book NUMERIC(15,2) DEFAULT 0,
  software_basis NUMERIC(15,2) DEFAULT 0,
  software_fmv NUMERIC(15,2) DEFAULT 0,
  cap_dev_book NUMERIC(15,2) DEFAULT 0,
  cap_dev_basis NUMERIC(15,2) DEFAULT 0,
  acquired_ip_book NUMERIC(15,2) DEFAULT 0,
  acquired_ip_basis NUMERIC(15,2) DEFAULT 0,
  acquired_ip_fmv NUMERIC(15,2) DEFAULT 0,
  internal_ip_fmv NUMERIC(15,2) DEFAULT 0,
  goodwill_book NUMERIC(15,2) DEFAULT 0,
  goodwill_fmv NUMERIC(15,2) DEFAULT 0,
  investments NUMERIC(15,2) DEFAULT 0,
  other_assets NUMERIC(15,2) DEFAULT 0,
  accounts_payable NUMERIC(15,2) DEFAULT 0,
  debt NUMERIC(15,2) DEFAULT 0,
  shareholder_loans NUMERIC(15,2) DEFAULT 0,
  deferred_revenue NUMERIC(15,2) DEFAULT 0,
  taxes_payable NUMERIC(15,2) DEFAULT 0,
  other_liabilities NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE asset_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their assets" ON asset_records
  FOR ALL USING (auth.uid() = user_id);

-- ─── REVENUE MIX ─────────────────────────────────────────────────────────────
CREATE TABLE revenue_mix_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  record_date DATE,
  software_subscription_pct NUMERIC(6,3) DEFAULT 0,
  licensing_pct NUMERIC(6,3) DEFAULT 0,
  automated_digital_pct NUMERIC(6,3) DEFAULT 0,
  human_tutoring_pct NUMERIC(6,3) DEFAULT 0,
  consulting_pct NUMERIC(6,3) DEFAULT 0,
  curriculum_sales_pct NUMERIC(6,3) DEFAULT 0,
  implementation_pct NUMERIC(6,3) DEFAULT 0,
  school_contracts_pct NUMERIC(6,3) DEFAULT 0,
  marketplace_pct NUMERIC(6,3) DEFAULT 0,
  advertising_pct NUMERIC(6,3) DEFAULT 0,
  founder_appearances_pct NUMERIC(6,3) DEFAULT 0,
  other_pct NUMERIC(6,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE revenue_mix_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their revenue mix" ON revenue_mix_records
  FOR ALL USING (auth.uid() = user_id);

-- ─── SCENARIOS ───────────────────────────────────────────────────────────────
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, active, archived
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  -- Entity path
  entity_path TEXT,
  conversion_date DATE,
  issuance_date DATE,
  -- Law version
  law_version TEXT DEFAULT 'post_july4_2025',
  acquisition_date DATE,
  -- Valuation inputs
  fmv_at_conversion NUMERIC(15,2),
  aggregate_gross_assets NUMERIC(15,2),
  -- Stock inputs
  shares_issued NUMERIC(15,4),
  stock_basis NUMERIC(15,2),
  sec1202_basis NUMERIC(15,2),
  -- Exit inputs
  exit_date DATE,
  exit_year INTEGER,
  gross_proceeds NUMERIC(15,2),
  sale_type TEXT DEFAULT 'stock', -- stock, asset, mixed
  qualifying_pct NUMERIC(6,3) DEFAULT 100,
  prior_exclusions_used NUMERIC(15,2) DEFAULT 0,
  -- Tax inputs
  federal_rate NUMERIC(6,3) DEFAULT 0.20,
  niit_rate NUMERIC(6,3) DEFAULT 0.038,
  state_rate NUMERIC(6,3) DEFAULT 0.05,
  state_code TEXT,
  amt_applies BOOLEAN DEFAULT FALSE,
  -- Results (cached)
  results JSONB,
  -- Business qualification
  business_qual_result JSONB,
  -- Notes
  notes TEXT,
  professional_review_status TEXT DEFAULT 'pending',
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their scenarios" ON scenarios
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_scenarios_user ON scenarios(user_id);
CREATE INDEX idx_scenarios_company ON scenarios(company_id);
CREATE INDEX idx_scenarios_status ON scenarios(user_id, status);

-- ─── SCENARIO VERSIONS ───────────────────────────────────────────────────────
CREATE TABLE scenario_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scenario_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their versions" ON scenario_versions
  FOR ALL USING (auth.uid() = user_id);

-- ─── QSBS ASSESSMENTS ────────────────────────────────────────────────────────
CREATE TABLE qsbs_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE NOT NULL,
  status TEXT, -- likely_qualifies, potentially_qualifies, uncertain, likely_does_not, does_not, insufficient
  confidence TEXT,
  reasons_for JSONB,
  reasons_against JSONB,
  missing_inputs JSONB,
  rules_applied JSONB,
  calculation_trace JSONB,
  professional_questions JSONB,
  -- Individual test results
  c_corp_test TEXT,
  original_issue_test TEXT,
  threshold_test TEXT,
  active_business_test TEXT,
  excluded_business_risk TEXT,
  holding_period_test TEXT,
  redemption_risk TEXT,
  -- Calculated amounts
  eligible_gain NUMERIC(15,2),
  fixed_dollar_limit NUMERIC(15,2),
  ten_times_limit NUMERIC(15,2),
  applicable_limit NUMERIC(15,2),
  exclusion_pct NUMERIC(6,3),
  excluded_gain NUMERIC(15,2),
  taxable_gain NUMERIC(15,2),
  total_tax NUMERIC(15,2),
  after_tax_proceeds NUMERIC(15,2),
  tax_savings_vs_baseline NUMERIC(15,2),
  effective_rate NUMERIC(6,3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE qsbs_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their assessments" ON qsbs_assessments
  FOR ALL USING (auth.uid() = user_id);

-- ─── EVIDENCE CHECKLISTS ─────────────────────────────────────────────────────
CREATE TABLE evidence_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_label TEXT NOT NULL,
  status TEXT DEFAULT 'missing', -- missing, planned, draft, uploaded_externally, complete, reviewed
  external_link TEXT,
  notes TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE evidence_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their evidence" ON evidence_checklists
  FOR ALL USING (auth.uid() = user_id);

-- ─── LAW VERSIONS ────────────────────────────────────────────────────────────
CREATE TABLE law_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version_name TEXT NOT NULL,
  effective_date DATE,
  gross_assets_threshold NUMERIC(15,2),
  fixed_dollar_limit NUMERIC(15,2),
  exclusion_3yr NUMERIC(6,3),
  exclusion_4yr NUMERIC(6,3),
  exclusion_5yr NUMERIC(6,3),
  source_title TEXT,
  source_url TEXT,
  date_checked DATE,
  notes TEXT,
  is_superseded BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE law_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their law versions" ON law_versions
  FOR ALL USING (auth.uid() = user_id);

-- ─── APP SETTINGS ────────────────────────────────────────────────────────────
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_federal_rate NUMERIC(6,3) DEFAULT 0.20,
  default_niit_rate NUMERIC(6,3) DEFAULT 0.038,
  default_state_rate NUMERIC(6,3) DEFAULT 0.05,
  default_state TEXT,
  theme TEXT DEFAULT 'light',
  active_company_id UUID REFERENCES companies(id),
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their settings" ON app_settings
  FOR ALL USING (auth.uid() = user_id);

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
  'profiles','companies','owners','entity_events','stock_issuances',
  'valuation_records','asset_records','revenue_mix_records','scenarios',
  'qsbs_assessments','evidence_checklists','law_versions','app_settings'
]) LOOP
  EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
END LOOP; END $$;
