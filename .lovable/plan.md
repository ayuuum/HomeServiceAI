

# LINEログイン後の読み込み停止問題修正プラン

## 問題の分析

### 根本原因
LINEログイン認証後にページがリロードされた際、以下の問題が発生している可能性があります：

1. **LIFFエラーの未処理**: `liffError` があっても、ローディング画面の条件でチェックしていない
2. **カスタムドメインのリダイレクト問題**: `liff.login()` でリダイレクト先URLを指定していないため、カスタムドメイン（haukuripro.com）で正しくリダイレクトされない
3. **タイムアウトなし**: 初期化が無限に待機状態になる

### 現在のコードの問題点
```typescript
// LiffBookingPage.tsx 231行目
if (orgLoading || (organization?.line_liff_id && !isInitialized) || isCustomerLoading) {
    return <LiffLoadingScreen ... />;
}
```
- `liffError` をチェックしていない → エラーがあっても永久にローディング

## 修正内容

### 1. useLiff.ts の修正

`liff.login()` でリダイレクトURLを明示的に指定し、カスタムドメインでも正しく動作するようにする

```typescript
// 修正前
const login = useCallback(() => {
    if (isInitialized && !isLoggedIn) {
        liff.login();
    }
}, [isInitialized, isLoggedIn]);

// 修正後
const login = useCallback((redirectUri?: string) => {
    if (isInitialized && !isLoggedIn) {
        liff.login({ redirectUri: redirectUri || window.location.href });
    }
}, [isInitialized, isLoggedIn]);
```

### 2. LiffBookingPage.tsx の修正

#### a) LIFFエラー表示を追加
```typescript
// 新規追加: LIFFエラーの表示
if (!orgLoading && liffError) {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4">
            <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <Icon name="error" size={32} className="text-destructive" />
                </div>
                <h2 className="text-lg font-bold text-destructive">接続エラー</h2>
                <p className="text-sm text-muted-foreground">
                    LINEへの接続に失敗しました。<br />
                    ブラウザを閉じて、もう一度お試しください。
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">{liffError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    再読み込み
                </Button>
            </div>
        </div>
    );
}
```

#### b) ローディング条件の改善
```typescript
// 修正前
if (orgLoading || (organization?.line_liff_id && !isInitialized) || isCustomerLoading) {

// 修正後（エラーがない場合のみローディング表示）
if (orgLoading || (organization?.line_liff_id && !isInitialized && !liffError) || isCustomerLoading) {
```

#### c) 初期化タイムアウトの追加
10秒以上初期化が完了しない場合にエラーを表示

### 3. MyBookingsPage.tsx も同様の修正

同じエラーハンドリングロジックを追加

## 技術的詳細

### カスタムドメインでの注意点
- LINE DevelopersコンソールでLIFFアプリのEndpoint URLが `https://haukuripro.com/liff/booking/tanaka` に設定されていることを確認
- `liff.login()` のリダイレクト先URLを明示的に指定することで、カスタムドメインへの正しいリダイレクトを保証

### デバッグ用ログの追加
LIFF SDKの各ステップでコンソールログを出力し、問題箇所を特定しやすくする

## 修正後の動作フロー

```text
1. ページロード
   ↓
2. 組織データ取得（line_liff_id含む）
   ↓
3. LIFF SDK初期化
   ↓ 成功 → 4へ
   ↓ 失敗 → エラー画面表示
   
4. ログイン状態確認
   ↓ ログイン済み → 5へ
   ↓ 未ログイン → LINE認証ページへ（redirectUri指定）
   
5. 顧客情報取得/作成
   ↓
6. 予約画面表示
```

## ユーザー側の確認事項

1. LINE DevelopersコンソールでLIFFアプリの設定確認：
   - Endpoint URL: `https://haukuripro.com/liff/booking/tanaka`
   - Scope: `profile` が有効
   
2. 管理画面でLINE LIFF IDが正しく設定されているか確認

