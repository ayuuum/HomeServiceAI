
# メールアドレス変更機能の追加

## 機能概要

Supabase Authの`updateUser`メソッドを使用して、ユーザーがメールアドレスを変更できる機能を追加します。

## 変更フロー

```text
【メールアドレス変更フロー】

1. ユーザーがプロフィール画面で新しいメールアドレスを入力
2. 「メールアドレスを変更」ボタンをクリック
3. Supabase Authが確認メールを新しいアドレスに送信
4. ユーザーがメール内のリンクをクリックして確認
5. メールアドレスが更新される

┌─────────────────────────────────────────┐
│  アカウント設定                         │
├─────────────────────────────────────────┤
│                                         │
│  📧 メールアドレス                      │
│  ┌─────────────────────────────────┐   │
│  │ 現在: user@example.com          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  新しいメールアドレス                   │
│  ┌─────────────────────────────────┐   │
│  │ newuser@example.com             │   │
│  └─────────────────────────────────┘   │
│                                         │
│         [メールアドレスを変更]          │
│                                         │
│  ⚠️ 確認メールが送信されます           │
│                                         │
└─────────────────────────────────────────┘
```

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/pages/ProfilePage.tsx` | メールアドレス変更セクションの追加 |

## 変更詳細

### ProfilePage.tsx の変更

**新しい状態変数:**
```tsx
const [newEmail, setNewEmail] = useState('');
const [isLoadingEmail, setIsLoadingEmail] = useState(false);
```

**新しいスキーマ:**
```tsx
const emailChangeSchema = z.object({
  newEmail: z.string().email({ message: "有効なメールアドレスを入力してください" }),
});
```

**メールアドレス変更ハンドラー:**
```tsx
const handleEmailChange = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    emailChangeSchema.parse({ newEmail });
    setIsLoadingEmail(true);
    
    // Supabase Auth の updateUser を使用
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });
    
    if (error) throw error;
    
    setNewEmail('');
    toast({
      title: "確認メール送信",
      description: "新しいメールアドレスに確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。",
    });
  } catch (error) {
    // エラーハンドリング
  } finally {
    setIsLoadingEmail(false);
  }
};
```

**新しいUIセクション（プロフィール設定カード内）:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>メールアドレス変更</CardTitle>
    <CardDescription>
      ログインに使用するメールアドレスを変更します
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleEmailChange} className="space-y-4">
      {/* 現在のメールアドレス表示 */}
      <div className="space-y-2">
        <Label>現在のメールアドレス</Label>
        <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
          {user?.email}
        </div>
      </div>
      
      {/* 新しいメールアドレス入力 */}
      <div className="space-y-2">
        <Label htmlFor="newEmail">新しいメールアドレス</Label>
        <Input
          id="newEmail"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new@example.com"
        />
      </div>
      
      {/* 注意書き */}
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Icon name="info" size={16} />
        確認メールが新しいアドレスに送信されます
      </div>
      
      <Button type="submit" disabled={isLoadingEmail || !newEmail}>
        {isLoadingEmail ? "送信中..." : "メールアドレスを変更"}
      </Button>
    </form>
  </CardContent>
</Card>
```

## 注意事項

1. **確認プロセス**: Supabase Authは新しいメールアドレスに確認メールを送信します。ユーザーがリンクをクリックするまで変更は反映されません。

2. **profiles テーブル同期**: メールアドレス変更後、`profiles`テーブルの`email`カラムも更新が必要な場合があります。これはSupabase Authのトリガーで自動化するか、確認完了後に手動で同期することを検討します。

3. **リダイレクトURL**: 確認メールのリダイレクト先がLovable Cloudの設定で正しく設定されている必要があります。

## メリット

- **セキュリティ**: 確認メールによる二段階認証でなりすましを防止
- **シンプルなUI**: 現在のアドレスを表示し、新しいアドレスのみ入力
- **明確なフィードバック**: 確認メール送信後のステップを案内
