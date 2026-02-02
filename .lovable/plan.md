

# LIFFアプリ読み込みエラー修正プラン

## 問題の診断

### 根本原因
1. **LIFF ID未設定**: `tanaka` 組織の `line_liff_id` が `null` になっている
2. **コードの問題**: LIFF IDが未設定の場合のハンドリングが不足している

### コードの問題箇所
```typescript
// LiffBookingPage.tsx 212行目
if (orgLoading || !isInitialized || isCustomerLoading) {
    return <LiffLoadingScreen ... />;
}
```
- `line_liff_id` が `null` の場合、`initLiff()` が呼ばれない
- `isInitialized` が永久に `false` のままになる
- 結果：ローディング画面から抜け出せない

## 修正内容

### 1. LiffBookingPage.tsx の修正

LIFF IDが未設定の場合にエラーメッセージを表示するように修正

**変更箇所**:

1. **新しいstate追加** (26行目付近):
```typescript
const [liffRequired, setLiffRequired] = useState(true);
```

2. **組織取得後のLIFF ID確認** (50行目付近):
```typescript
if (data[0] && !data[0].line_liff_id) {
    setLiffRequired(false);
}
```

3. **LIFF未設定時のエラー表示** (212行目付近):
```typescript
// LIFF IDが設定されていない場合のエラー表示
if (!orgLoading && organization && !organization.line_liff_id) {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4">
            <div className="text-center space-y-4">
                <h2 className="text-lg font-bold text-destructive">設定エラー</h2>
                <p className="text-sm text-muted-foreground">
                    LIFFアプリが設定されていません。<br/>
                    管理者にお問い合わせください。
                </p>
            </div>
        </div>
    );
}

// LIFF初期化待ち（LIFF IDがある場合のみ）
if (orgLoading || (organization?.line_liff_id && !isInitialized) || isCustomerLoading) {
    return <LiffLoadingScreen ... />;
}
```

### 2. ユーザー側の設定作業

LINE DevelopersコンソールでLIFFアプリを作成し、LIFF IDを設定する必要があります。

**手順**:
1. LINE Developersコンソール → LINE Loginチャネル作成
2. LIFF → Add → サイズ「Full」
3. Endpoint URL: `https://haukuripro.com/liff/booking/tanaka`
4. LIFF IDをコピー
5. 管理画面 → プロフィール設定 → LINE LIFF IDに貼り付け

## 技術的な補足

### なぜ haukuripro.com なのか
- ユーザーが独自ドメインを使用している
- LIFFのEndpoint URLは独自ドメインに合わせる必要がある
- `cleaning-booking.lovable.app` ではなく `haukuripro.com` を使用

### コード修正の影響範囲
- `src/pages/liff/LiffBookingPage.tsx` のみ
- MyBookingsPage.tsx も同様の修正が必要な可能性あり

## 修正後の検証手順
1. LIFF ID未設定の状態でアクセス → エラーメッセージ表示を確認
2. LIFF IDを設定後、LINEアプリからアクセス → 正常に動作を確認

