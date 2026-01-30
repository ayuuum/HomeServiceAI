
# 通知フローのテスト計画

## 現在の状況

調査の結果、以下が確認できました：

| 機能 | 状態 | 備考 |
|------|------|------|
| メール通知（Edge Function） | ✅ 正常動作 | `send-booking-email` がstatus 200を返却 |
| LINE通知（Edge Function） | ✅ 正常動作 | LINE連携がない顧客はスキップ（期待通り） |
| Realtime設定 | ✅ 設定済み | `notifications` テーブルがpublicationに含まれている |
| 通知データ | ⚠️ 空 | 現在データベースに通知が0件 |

## テスト方法

### テスト1: 新規予約による通知テスト

1. **予約ページを開く**
   - `/booking/nagareboshi-test` にアクセス
   - 新しい予約を作成する

2. **期待される動作**
   - 管理者のヘッダーに🔔ベルアイコンに通知バッジが表示される
   - `notifications` テーブルに `type: 'new_booking'` のレコードが追加される
   - 管理者メールに通知が届く

### テスト2: 予約キャンセルによる通知テスト

1. **既存予約のキャンセルURLにアクセス**
   - 予約詳細から「キャンセルリンクをコピー」
   - そのURLでキャンセルを実行

2. **期待される動作**
   - `type: 'booking_cancelled'` の通知が作成される
   - 管理者メールにキャンセル通知が届く

### テスト3: LINE メッセージによる通知テスト

1. **LINE公式アカウントにメッセージを送信**
   - 顧客のLINEアカウントから店舗のLINE公式アカウントにメッセージを送る

2. **期待される動作**
   - `type: 'line_message'` の通知が作成される
   - 管理者画面でリアルタイムに🔔に表示される

---

## 実装の確認ポイント

通知作成のコード箇所：

```text
1. 新規予約 → src/hooks/useBooking.ts:660-672
2. キャンセル → src/pages/CancelBookingPage.tsx:113-124
3. LINEメッセージ → supabase/functions/line-webhook/index.ts:314-323
```

Realtimeリスナー：
```text
src/hooks/useNotifications.ts → postgres_changes で INSERT を監視
```

---

## 推奨テスト手順

**最も簡単なテスト方法**: 
1. 別のブラウザ/シークレットウィンドウで予約ページを開く
2. 新しい予約を作成する
3. 管理者画面で通知ベルを確認する

これにより、以下が一度にテストできます：
- ✅ 予約作成時のin-app通知挿入
- ✅ Realtimeによる即時更新
- ✅ 管理者メール通知
