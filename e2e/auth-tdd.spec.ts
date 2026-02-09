import { test, expect } from '@playwright/test';

test.describe('Authentication & Onboarding TDD', () => {
    test.beforeEach(async ({ page }) => {
        // 全体的なSupabaseの基本モック（セッション等）
        await page.route('**/auth/v1/session*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'fake-token',
                    token_type: 'bearer',
                    expires_in: 3600,
                    refresh_token: 'fake-refresh',
                    user: {
                        id: 'test-user-id',
                        email: 'tdd-test@example.com',
                        user_metadata: { name: 'テストユーザー', business_name: 'テスト店舗' }
                    }
                })
            });
        });
    });

    test('新規登録直後のオンボーディング表示（レースコンディション再現）', async ({ page }) => {
        // シナリオ: DBトリガーが遅れており、最初のプロフィール取得が失敗（空）を返す
        let profileRequestCount = 0;
        await page.route('**/rest/v1/profiles*', async route => {
            profileRequestCount++;
            if (profileRequestCount === 1) {
                // 最初の1回目のリクエストはデータなし（レースコンディションを再現）
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([]) // 空の配列
                });
            } else {
                // 2回目以降は成功
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{
                        id: 'test-user-id',
                        organization_id: 'test-org-id'
                    }])
                });
            }
        });

        await page.route('**/rest/v1/organizations*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: 'test-org-id',
                    name: 'テスト店舗',
                    slug: 'test-shop-123',
                    phone: null,
                    business_hours: {}
                }])
            });
        });

        await page.route('**/rest/v1/services*', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        });

        // ログイン状態としてダッシュボードにアクセス
        await page.goto('/admin');

        // ローディング表示が消えるのを待つ
        await expect(page.getByText('読み込み中...')).not.toBeVisible({ timeout: 15000 });

        const onboardingTitle = page.getByText('予約受付の準備をしましょう');
        await expect(onboardingTitle).toBeVisible({ timeout: 10000 });

        // 0/3 完了 という文字列を探す（正規表現で空白に柔軟に対応）
        const stepsBadge = page.getByText(/0\/3\s*完了/);
        await expect(stepsBadge).toBeVisible({ timeout: 10000 });
    });

    test('ログアウトボタンの動作確認', async ({ page }) => {
        // デスクトップ表示を強制
        await page.setViewportSize({ width: 1280, height: 720 });

        // ダッシュボード表示
        await page.goto('/admin');
        await expect(page.getByText('読み込み中...')).not.toBeVisible({ timeout: 15000 });

        // ログアウトボタン（logoutテキストを含むiまたはspanを持つボタン）
        const logoutTrigger = page.locator('button').filter({ has: page.locator('span:has-text("logout")') });
        await expect(logoutTrigger).toBeVisible({ timeout: 10000 });
        await logoutTrigger.click();

        // ダイアログ内の「ログアウト」ボタン
        const confirmLogout = page.locator('role=alertdialog >> role=button').filter({ hasText: 'ログアウト' });
        await expect(confirmLogout).toBeVisible({ timeout: 5000 });
        await confirmLogout.click();

        // ログイン画面へ遷移することを確認
        await expect(page).toHaveURL(/\/login/);
    });

    test('プロフィールの名前更新と即時反映', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        // プロフィールページにアクセス
        await page.goto('/admin/profile');
        await expect(page.getByText('読み込み中...')).not.toBeVisible({ timeout: 15000 });

        const nameInput = page.locator('input#name');
        await expect(nameInput).toBeVisible({ timeout: 10000 });
        await expect(nameInput).toHaveValue('テストユーザー');

        // 名前を変更
        await nameInput.fill('更新後の名前');
        const saveButton = page.getByRole('button', { name: '変更を保存' }).first();
        await saveButton.click();

        // 成功トーストの確認
        await expect(page.locator('text=プロフィールを更新しました')).toBeVisible({ timeout: 10000 });
    });
});
