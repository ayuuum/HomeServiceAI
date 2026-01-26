
# LINE連携の問題点と改善計画

## 現状分析結果

### 発見した問題

#### 1. 顧客の重複作成（最大の問題）
```
データ例:
- 同じ「08038140263 / bbdream11ayumu@gmail.com」で8件の顧客レコードが存在
- 毎回予約するたびに新しい顧客レコードが作成されている
```

**原因**: `useBooking.ts`の顧客検索ロジックに問題がある
- 未認証ユーザー（Webからの一般予約）は既存顧客の検索がスキップされる（RLSでSELECT権限がないため）
- 結果として毎回新しい顧客レコードが作成される

#### 2. LINE連携顧客に予約が紐付いていない
```
現状:
- LINE連携済み顧客「歩武」(line_user_id: Uc393d67f9f...): booking_count = 0
- 同一人物と思われる「松井歩武」(line_user_id: NULL): booking_count = 複数
```

**原因**:
- LINEからメッセージを送ると新規顧客レコードが作成される
- しかしWebから予約すると別の顧客レコードが作成される
- 両者が紐付いていない

#### 3. LINE通知が届かない
**原因**: 上記2つの問題の結果
- Web予約で作成された顧客レコードには`line_user_id`がない
- `send-booking-notification`は`line_user_id`がある顧客にしか通知を送れない

---

## 改善計画

### Phase 1: 顧客マッチング強化（高優先度）

**目的**: 予約時に既存顧客を正しく見つけて紐付ける

**変更1: 予約処理での顧客検索をRPCに移行**

現在の問題:
```typescript
// useBooking.ts 現在の実装
const { data: { user } } = await supabase.auth.getUser();
if (user && (customerEmail || customerPhone)) {
  // 認証済みユーザーのみ検索可能 → 未認証は検索スキップ
}
```

解決策:
- 新しいRPC関数`find_or_create_customer`を作成
- `SECURITY DEFINER`で管理者権限で実行
- 未認証ユーザーでも既存顧客を検索・マッチング可能に

```sql
CREATE OR REPLACE FUNCTION find_or_create_customer(
  p_organization_id uuid,
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_address_building text DEFAULT NULL,
  p_line_user_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_normalized_phone text;
BEGIN
  -- 1. line_user_idで検索（最優先）
  IF p_line_user_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE line_user_id = p_line_user_id
      AND organization_id = p_organization_id;
    IF v_customer_id IS NOT NULL THEN
      -- 情報を更新して返す
      UPDATE customers SET
        name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        phone = COALESCE(p_phone, phone),
        updated_at = now()
      WHERE id = v_customer_id;
      RETURN v_customer_id;
    END IF;
  END IF;

  -- 2. 電話番号で検索
  IF p_phone IS NOT NULL THEN
    v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    SELECT id INTO v_customer_id
    FROM customers
    WHERE organization_id = p_organization_id
      AND regexp_replace(phone, '[^0-9]', '', 'g') = v_normalized_phone;
    IF v_customer_id IS NOT NULL THEN
      -- line_user_idを紐付け（未設定の場合）
      UPDATE customers SET
        line_user_id = COALESCE(line_user_id, p_line_user_id),
        updated_at = now()
      WHERE id = v_customer_id;
      RETURN v_customer_id;
    END IF;
  END IF;

  -- 3. メールで検索
  IF p_email IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE email = p_email
      AND organization_id = p_organization_id;
    IF v_customer_id IS NOT NULL THEN
      UPDATE customers SET
        line_user_id = COALESCE(line_user_id, p_line_user_id),
        updated_at = now()
      WHERE id = v_customer_id;
      RETURN v_customer_id;
    END IF;
  END IF;

  -- 4. 見つからなければ新規作成
  INSERT INTO customers (
    organization_id, name, email, phone, 
    postal_code, address, address_building, line_user_id
  ) VALUES (
    p_organization_id, p_name, p_email, p_phone,
    p_postal_code, p_address, p_address_building, p_line_user_id
  ) RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;
```

**変更2: useBooking.tsの修正**

```typescript
// 新しい実装
const { data: customerId, error: customerError } = await supabase
  .rpc('find_or_create_customer', {
    p_organization_id: organizationId,
    p_name: fullName,
    p_email: customerEmail || null,
    p_phone: customerPhone || null,
    p_postal_code: customerPostalCode || null,
    p_address: customerAddress || null,
    p_address_building: customerAddressBuilding || null,
    p_line_user_id: lineUserId || null
  });
```

---

### Phase 2: 既存データの修復ツール

**目的**: 既存の重複顧客を統合し、LINE IDを正しく紐付ける

**変更1: 顧客統合機能を追加**

顧客管理画面に「顧客統合」機能を追加:
- 同じ電話番号/メールの顧客を検出
- ドラッグ＆ドロップまたは選択で統合
- 統合時に予約履歴も移行

**変更2: LINE ID紐付けUIの改善**

現在のCustomerFormModalにLINE User ID入力欄はあるが、使いにくい:
- LINE InboxからのLINEユーザー選択機能を追加
- 「LINE連携」ボタンで、メッセージを送ってきたLINEユーザー一覧から選択可能に

---

### Phase 3: LINE Webhookでの顧客マッチング強化

**目的**: LINEからメッセージが来た時点で既存顧客と紐付ける

**変更: line-webhook/index.tsの修正**

```typescript
// 既存顧客をline_user_idだけでなく、LINE表示名でも検索
// (プロフィール名が顧客名と一致する場合に紐付け提案)
if (!existingCustomer) {
  // 名前で類似顧客を検索
  const { data: similarCustomers } = await supabase
    .from('customers')
    .select('id, name, phone, email')
    .eq('organization_id', org.id)
    .ilike('name', `%${displayName}%`)
    .limit(5);
  
  // 類似顧客が見つかった場合、管理者に通知
  // (自動マッチングは誤りが多いため手動確認を推奨)
}
```

---

## 技術的な変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `supabase/migrations/xxx.sql` | `find_or_create_customer` RPC関数の作成 |
| `src/hooks/useBooking.ts` | 顧客検索ロジックをRPCに置き換え |
| `src/components/CustomerFormModal.tsx` | LINE連携UIの改善（LINEユーザー選択） |
| `src/pages/CustomerManagement.tsx` | 顧客統合機能の追加 |
| `supabase/functions/line-webhook/index.ts` | 顧客マッチング強化（オプション） |

---

## 期待される効果

1. **新規予約時**: 電話番号・メールで既存顧客を自動検出、重複作成を防止
2. **LINE通知**: 既存顧客にLINE IDが紐付くことで、予約確認・リマインダーがLINEで届く
3. **顧客管理**: 重複顧客の統合、LINE連携状況の可視化

---

## 優先順位

1. **最優先**: Phase 1（顧客マッチングRPC）- これで新規予約の問題は解決
2. **次点**: Phase 2（既存データ修復）- 過去データの整理
3. **オプション**: Phase 3（Webhook強化）- より精度の高いマッチング
