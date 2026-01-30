
# 予約ボタンの文言修正と二重送信防止

## 修正内容

### 1. 文言の修正

| 場所 | 現在 | 修正後 |
|------|------|--------|
| `BookingPage.tsx` 558行目 | 予約を確定する | 予約リクエストを送信 |
| `BookingSummary.tsx` 50行目 | 予約する | リクエストを送信 |
| `BookingSummary.tsx` 81行目 | 予約内容を確認する | 予約リクエストを送信 |

### 2. 二重送信防止の実装

**BookingPage.tsx に以下の変更を加えます：**

```typescript
// 新しい状態を追加
const [isSubmitting, setIsSubmitting] = useState(false);
const submittingRef = useRef(false); // 高速な二重クリック防止用

// handleSubmit を修正
const handleSubmit = async () => {
  // 二重送信防止（ref guard）
  if (submittingRef.current) {
    return;
  }
  submittingRef.current = true;
  setIsSubmitting(true);

  try {
    // 空き状況の再確認
    if (selectedDate && selectedTime) {
      const isStillAvailable = await checkRealTimeAvailability(selectedDate, selectedTime);
      if (!isStillAvailable) {
        toast.error("この時間帯は他の方が予約されました。別の時間帯を選択してください。");
        await fetchDayAvailability(selectedDate);
        setCurrentStep(2);
        return;
      }
    }

    const result = await submitBooking();
    if (result) {
      setBookingData(result);
      setShowConfirmation(true);
    }
  } finally {
    submittingRef.current = false;
    setIsSubmitting(false);
  }
};
```

**ボタンの disabled 条件を修正：**

```typescript
<Button
  onClick={handleSubmit}
  disabled={!canSubmit || isSubmitting}  // isSubmitting を追加
  className="flex-1 h-10 text-sm font-semibold touch-manipulation"
>
  {isSubmitting ? (
    <>
      <span className="animate-spin mr-2">⏳</span>
      送信中...
    </>
  ) : (
    "予約リクエストを送信"
  )}
</Button>
```

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/BookingPage.tsx` | 二重送信防止の状態追加、handleSubmit修正、ボタン文言・disabled条件変更 |
| `src/components/booking/BookingSummary.tsx` | ボタン文言を「リクエストを送信」に変更 |

## 効果

1. **文言**: ユーザーに「これは確定ではなくリクエストである」ことが明確に伝わる
2. **二重送信防止**: 
   - `useRef` で高速な二重クリックをブロック
   - `useState` でUIを更新（ボタン無効化 + ローディング表示）
   - `finally` ブロックで確実にフラグをリセット
