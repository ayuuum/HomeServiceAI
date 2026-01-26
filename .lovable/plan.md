
# 予約送信エラーの修正

## 問題の原因

**`find_or_create_customer` RPC呼び出しでパラメータ不足**

`useBooking.ts`の509-519行目で `find_or_create_customer` RPCを呼び出していますが、データベース関数では `p_avatar_url` パラメータが追加されているのに、コードでは渡していません：

```typescript
// 現在のコード（p_avatar_urlが欠けている）
const { data: customerId, error: customerError } = await supabase
    .rpc('find_or_create_customer', {
        p_organization_id: organizationId,
        p_name: `${customerLastName} ${customerFirstName}`.trim(),
        p_email: customerEmail || null,
        p_phone: customerPhone || null,
        p_postal_code: customerPostalCode || null,
        p_address: customerAddress || null,
        p_address_building: customerAddressBuilding || null,
        p_line_user_id: lineUserId || null
        // ← p_avatar_url が欠けている
    });
```

TypeScriptの型チェックでは `p_avatar_url` はオプショナルですが、PostgreSQLでは関数シグネチャとして9つのパラメータが必要です。

---

## 修正内容

### ファイル: `src/hooks/useBooking.ts`

RPC呼び出しに `p_avatar_url: null` を追加：

```typescript
const { data: customerId, error: customerError } = await supabase
    .rpc('find_or_create_customer', {
        p_organization_id: organizationId,
        p_name: `${customerLastName} ${customerFirstName}`.trim(),
        p_email: customerEmail || null,
        p_phone: customerPhone || null,
        p_postal_code: customerPostalCode || null,
        p_address: customerAddress || null,
        p_address_building: customerAddressBuilding || null,
        p_line_user_id: lineUserId || null,
        p_avatar_url: null  // ← 追加
    });
```

---

## 技術詳細

| 項目 | 内容 |
|------|------|
| 修正ファイル | `src/hooks/useBooking.ts` |
| 修正行 | 509-519 |
| 変更内容 | `p_avatar_url: null` パラメータを追加 |
| 影響範囲 | 予約ページからの予約送信処理 |

---

## 期待される結果

- 予約確認ボタンを押した際にエラーが発生しなくなる
- 顧客レコードが正しく作成/検索される
- LINE連携済み顧客への自動紐付けが機能する
