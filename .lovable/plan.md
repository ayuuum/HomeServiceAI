
# カレンダーページへの手動予約登録機能追加

## 概要
カレンダーページ（/admin/calendar）からも新規予約を手動で登録できるようにします。さらに、カレンダーの日付をクリックした際に、その日付が自動的に選択された状態で予約モーダルを開けるようにすることで、ワークフローを効率化します。

## 実装内容

### 1. カレンダーページにNewBookingModalを追加
- 「＋ 新規予約」ボタンをページヘッダーに追加
- 既存の `NewBookingModal` コンポーネントを再利用

### 2. 日付クリックで予約作成機能（オプション強化）
- カレンダーの日付セルをクリックした際に、その日付で新規予約モーダルを開く
- 選択された日付が自動的にフォームにセットされる

### 3. NewBookingModal の拡張
- オプションで初期日付（`initialDate`）を受け取れるように修正
- 日付がプリセットされた状態でモーダルが開く

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/pages/CalendarPage.tsx` | 新規予約ボタン追加、日付クリックハンドラー |
| `src/components/NewBookingModal.tsx` | `initialDate` prop のサポート追加 |

## ユーザー体験

```text
現在のフロー:
┌─────────────────┐    ┌─────────────────┐
│ カレンダーページ │ → │ ダッシュボードへ │ → 新規予約
└─────────────────┘    └─────────────────┘

改善後のフロー:
┌─────────────────┐    ┌─────────────────┐
│ カレンダーページ │ → │ 新規予約モーダル │（日付自動セット）
└─────────────────┘    └─────────────────┘
```

## UIイメージ

### ヘッダー部分
```
予約管理                               [＋ 新規予約]
予約の確認・承認・管理ができます        [<] 2026年 1月 [>] [今日]
```

### カレンダーセル
- 日付をクリック → その日付で新規予約モーダルが開く
- 既存の予約をクリック → 予約詳細モーダルが開く（現状維持）

---

## 技術詳細

### CalendarPage.tsx の変更

```typescript
// インポート追加
import { NewBookingModal } from "@/components/NewBookingModal";

// State追加
const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
const [initialBookingDate, setInitialBookingDate] = useState<Date | undefined>();

// 日付クリックハンドラー
const handleDayClick = (day: Date) => {
  setInitialBookingDate(day);
  setNewBookingModalOpen(true);
};

// ヘッダーに新規予約ボタン追加
<Button onClick={() => {
  setInitialBookingDate(undefined);
  setNewBookingModalOpen(true);
}}>
  ＋ 新規予約
</Button>

// モーダル追加
<NewBookingModal
  open={newBookingModalOpen}
  onOpenChange={setNewBookingModalOpen}
  onBookingCreated={fetchBookings}
  initialDate={initialBookingDate}
/>
```

### NewBookingModal.tsx の変更

```typescript
interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated: () => void;
  initialDate?: Date;  // 新規追加
}

// useEffect で初期日付をセット
useEffect(() => {
  if (open && initialDate) {
    setSelectedDate(initialDate);
  }
}, [open, initialDate]);
```

## 実装の安全性
- 既存の `NewBookingModal` コンポーネントをそのまま活用するため、予約作成ロジックは変更なし
- `initialDate` は後方互換性のあるオプショナルなpropとして追加
- RLSポリシーや認証フローへの影響なし
