
# LIFFアプリ修正プラン

## 概要
LIFFアプリが正常に動作しない原因は、組織情報を取得するRPC関数に`line_liff_id`が含まれていないことです。このフィールドを追加し、LIFFアプリが正しく初期化できるようにします。

## 修正内容

### 1. データベース：RPC関数の修正
`get_organization_public`関数を更新して`line_liff_id`を返すようにする

**変更前：**
```sql
SELECT id, name, slug, logo_url, brand_color, welcome_message, header_layout, booking_headline, created_at, updated_at
FROM public.organizations
WHERE slug = org_slug
```

**変更後：**
```sql
SELECT id, name, slug, logo_url, brand_color, welcome_message, header_layout, booking_headline, line_liff_id, created_at, updated_at
FROM public.organizations
WHERE slug = org_slug
```

### 2. 管理画面でLIFF IDを設定
組織の設定画面（ProfilePage）でLIFF IDを入力する必要があります。LINE DevelopersコンソールでLIFFアプリを作成後、そのIDを設定します。

---

## LIFFアプリのテスト手順

### 事前準備（LINE Developers Console）
1. LINE Developersコンソールにログイン
2. **LINE Login**チャネルを作成（Messaging APIではなく）
3. LIFF > 「Add」からLIFFアプリを追加
   - サイズ: Full
   - Endpoint URL: `https://cleaning-booking.lovable.app/liff/booking/{orgSlug}`
4. 生成されたLIFF ID（例：`2006677890-abcdXYZ`）をコピー

### システム設定
1. 管理画面 > 設定 > LINE設定
2. 「LINE LIFF ID」フィールドにコピーしたIDを貼り付け
3. 保存

### テスト方法
1. LINEアプリで `https://liff.line.me/{LIFF_ID}` にアクセス
2. または、リッチメニューにこのURLを設定

---

## 技術的な補足

### LIFFの動作条件
- `line_liff_id`が組織に設定されていること
- LINE Login チャネルでLIFFアプリが作成されていること
- LIFF SDKの初期化が成功すること

### 現在のコード品質
- `useLiff.ts`: 適切に実装されている
- `LiffBookingPage.tsx`: ロジックは正しいが、LIFF IDが取得できないため初期化に失敗
- `get-or-create-line-customer`: ID Token検証ロジックは正しく実装済み

## 実装の優先順位
1. RPC関数に`line_liff_id`を追加（必須）
2. テスト組織にLIFF IDを設定（運用）
3. 動作確認

