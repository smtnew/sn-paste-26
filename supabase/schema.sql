-- ============================================
-- Schema: Campanie "Fii o Lumina de Paste"
-- Asociatia Something New
-- ============================================

-- 1. Campaigns table (tracks Masa Festiva progress)
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_amount integer NOT NULL,
  amount_raised integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Payments table (all donations)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  amount integer NOT NULL CHECK (amount > 0),
  payment_ref text UNIQUE,
  donor_name text,
  donor_email text,
  donor_phone text,
  donation_type text NOT NULL CHECK (donation_type IN ('family_150', 'family_250', 'family_400', 'campaign')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Index for fast campaign progress lookups
CREATE INDEX idx_payments_campaign ON payments(campaign_id) WHERE campaign_id IS NOT NULL;

-- 4. Function to recalculate campaign amount_raised
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL THEN
    UPDATE campaigns
    SET amount_raised = (
      SELECT COALESCE(SUM(amount), 0)
      FROM payments
      WHERE campaign_id = NEW.campaign_id
    ),
    status = CASE
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE campaign_id = NEW.campaign_id) >= target_amount
      THEN 'completed'
      ELSE 'active'
    END
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: auto-update campaign on new payment
CREATE TRIGGER trg_update_campaign
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_amount();

-- 6. RLS Policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Campaigns: anyone can read (for progress bar)
CREATE POLICY "campaigns_select_public"
  ON campaigns FOR SELECT
  TO anon, authenticated
  USING (true);

-- Campaigns: only service_role can update
CREATE POLICY "campaigns_update_service"
  ON campaigns FOR UPDATE
  TO service_role
  USING (true);

-- Payments: only service_role can insert
CREATE POLICY "payments_insert_service"
  ON payments FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Payments: only service_role can read
CREATE POLICY "payments_select_service"
  ON payments FOR SELECT
  TO service_role
  USING (true);

-- 7. Public view for frontend (exposes only what's needed)
CREATE OR REPLACE VIEW campaign_progress AS
  SELECT id, name, target_amount, amount_raised, status
  FROM campaigns
  WHERE status = 'active';

-- Grant anon access to the view
GRANT SELECT ON campaign_progress TO anon;
