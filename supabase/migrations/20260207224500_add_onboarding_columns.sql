-- オンボーディング関連カラムを追加
-- organizations テーブルに電話番号、住所、オンボーディング完了日時、予約ページステータスを追加

-- 電話番号カラム（必須項目としてオンボーディングで設定）
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 住所カラム（任意項目）
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS address TEXT;

-- オンボーディング完了日時
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 予約ページステータス（preparing: 準備中, published: 公開, paused: 一時停止）
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS booking_page_status TEXT DEFAULT 'preparing';

-- 予約ページステータスのチェック制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_booking_page_status_check'
  ) THEN
    ALTER TABLE organizations 
      ADD CONSTRAINT organizations_booking_page_status_check 
      CHECK (booking_page_status IN ('preparing', 'published', 'paused'));
  END IF;
END $$;

-- オンボーディング完了状態をチェックする関数
-- サービスが1つ以上あり、営業時間が設定されており、電話番号が設定されている場合にtrueを返す
CREATE OR REPLACE FUNCTION check_onboarding_status(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_services BOOLEAN;
  has_business_hours BOOLEAN;
  has_phone BOOLEAN;
BEGIN
  -- サービスが1つ以上あるか
  SELECT EXISTS(SELECT 1 FROM services WHERE organization_id = org_id) INTO has_services;
  
  -- 営業時間が設定されているか（business_hoursがnullでなく、空のJSONBでもない）
  SELECT business_hours IS NOT NULL AND business_hours != '{}'::jsonb
    FROM organizations WHERE id = org_id INTO has_business_hours;
  
  -- 電話番号が設定されているか
  SELECT phone IS NOT NULL AND phone != '' 
    FROM organizations WHERE id = org_id INTO has_phone;
  
  RETURN COALESCE(has_services, false) AND COALESCE(has_business_hours, false) AND COALESCE(has_phone, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- オンボーディング完了時に自動的に予約ページを公開するトリガー関数
CREATE OR REPLACE FUNCTION auto_publish_on_onboarding_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- オンボーディングが完了状態で、まだ完了日時が設定されていない場合
  IF check_onboarding_status(NEW.id) AND NEW.onboarding_completed_at IS NULL THEN
    NEW.onboarding_completed_at := NOW();
    NEW.booking_page_status := 'published';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_publish_onboarding'
  ) THEN
    CREATE TRIGGER trigger_auto_publish_onboarding
      BEFORE UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION auto_publish_on_onboarding_complete();
  END IF;
END $$;

-- get_organization_public 関数を更新して新しいカラムを含める
CREATE OR REPLACE FUNCTION get_organization_public(org_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  logo_url TEXT,
  brand_color TEXT,
  welcome_message TEXT,
  header_layout TEXT,
  booking_headline TEXT,
  phone TEXT,
  address TEXT,
  booking_page_status TEXT,
  business_hours JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.brand_color,
    o.welcome_message,
    o.header_layout,
    o.booking_headline,
    o.phone,
    o.address,
    o.booking_page_status,
    o.business_hours
  FROM organizations o
  WHERE o.slug = org_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
