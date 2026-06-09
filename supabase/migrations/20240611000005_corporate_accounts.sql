-- Corporate / business accounts for bulk booking and invoicing
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  rc_number     TEXT,  -- Nigerian CAC registration number
  tax_id        TEXT,
  credit_limit  INTEGER NOT NULL DEFAULT 0,  -- in kobo; 0 = no credit
  balance       INTEGER NOT NULL DEFAULT 0,  -- outstanding balance in kobo
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- Link orders to an organization for bulk invoicing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

ALTER TABLE organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members  ENABLE ROW LEVEL SECURITY;

-- Org members can see their org details
CREATE POLICY "Org members view their org" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage orgs" ON organizations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Org members view org membership" ON organization_members
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
