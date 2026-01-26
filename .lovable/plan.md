

# gen_random_bytes エラーの修正

## 問題の原因

**`generate_cancel_token` トリガー関数がpgcrypto拡張にアクセスできない**

予約（bookings）テーブルにINSERTする際、キャンセルトークンを自動生成するトリガー `generate_cancel_token` が実行されますが、この関数は `SET search_path TO 'public'` が設定されているため、`extensions` スキーマにある `pgcrypto` 拡張の `gen_random_bytes` 関数にアクセスできません。

```sql
-- 現在の関数（問題あり）
NEW.cancel_token := encode(gen_random_bytes(16), 'hex');
-- gen_random_bytes は extensions スキーマにあるためアクセス不可
```

---

## 修正内容

### 解決策: `gen_random_uuid()` を使用

`gen_random_uuid()` はPostgreSQL組み込み関数で、スキーマ制限の影響を受けません。

```sql
CREATE OR REPLACE FUNCTION public.generate_cancel_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.cancel_token IS NULL THEN
    -- gen_random_uuid() は組み込み関数なのでスキーマ制限の影響を受けない
    NEW.cancel_token := replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$function$;
```

---

## 技術詳細

| 項目 | 内容 |
|------|------|
| エラー箇所 | `generate_cancel_token` トリガー関数 |
| 原因 | `search_path` 制限により `pgcrypto.gen_random_bytes` にアクセス不可 |
| 修正方法 | `gen_random_uuid()` を使用（組み込み関数） |
| 影響テーブル | `bookings` テーブルへのINSERT処理 |

---

## 修正後のトークン形式

| 変更前 | 変更後 |
|--------|--------|
| `encode(gen_random_bytes(16), 'hex')` | `replace(gen_random_uuid()::text, '-', '')` |
| 32文字の16進数 | 32文字のUUID（ハイフンなし） |

両方とも32文字のランダム文字列を生成するため、既存のキャンセルURL機能との互換性は維持されます。

---

## 期待される結果

- 予約確認ボタンを押した際にエラーが発生しなくなる
- キャンセルトークンが正常に生成される
- 予約がデータベースに保存される

