-- Phase 1: GMV課金モデルへの移行 - データベース変更

-- 1. bookings テーブル拡張
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_amount INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gmv_included_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS online_payment_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS additional_charges JSONB DEFAULT '[]';

-- 2. organizations テーブル拡張
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_payment_method_status TEXT DEFAULT 'not_setup';

-- 3. monthly_billing テーブル（新規）
CREATE TABLE IF NOT EXISTS monthly_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_month TEXT NOT NULL,
  
  -- GMV集計
  gmv_total INTEGER NOT NULL DEFAULT 0,
  gmv_cash INTEGER NOT NULL DEFAULT 0,
  gmv_bank_transfer INTEGER NOT NULL DEFAULT 0,
  gmv_online INTEGER NOT NULL DEFAULT 0,
  booking_count INTEGER NOT NULL DEFAULT 0,
  
  -- 手数料計算
  fee_percent NUMERIC(5,2) NOT NULL DEFAULT 7.00,
  fee_total INTEGER NOT NULL DEFAULT 0,
  
  -- Stripe Invoice
  stripe_invoice_id TEXT,
  invoice_status TEXT DEFAULT 'draft',
  hosted_invoice_url TEXT,
  
  -- タイムスタンプ
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, billing_month)
);

-- 4. gmv_audit_log テーブル（新規・監査用）
CREATE TABLE IF NOT EXISTS gmv_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_amount INTEGER,
  new_amount INTEGER,
  reason TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLSを有効化
ALTER TABLE monthly_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmv_audit_log ENABLE ROW LEVEL SECURITY;

-- 6. monthly_billing RLSポリシー
CREATE POLICY "Users can view their org billing"
  ON monthly_billing FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert their org billing"
  ON monthly_billing FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org billing"
  ON monthly_billing FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- 7. gmv_audit_log RLSポリシー
CREATE POLICY "Users can view their org audit logs"
  ON gmv_audit_log FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert their org audit logs"
  ON gmv_audit_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- 8. updated_at トリガー for monthly_billing
CREATE TRIGGER update_monthly_billing_updated_at
  BEFORE UPDATE ON monthly_billing
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();