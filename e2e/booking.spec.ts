import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
    test('should allow a user to complete a booking', async ({ page }) => {
        // 1. Supabaseの通信をモック化
        await page.route('**/rest/v1/rpc/get_organization_public*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: '00000000-0000-0000-0000-000000000000',
                    name: 'Test Organization',
                    slug: 'test119-ca665cae',
                    line_liff_id: 'test-liff-id',
                    brand_color: '#0ea5e9',
                }]),
            });
        });

        await page.route('**/rest/v1/services*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    id: 'service-1',
                    title: 'エアコンクリーニング',
                    description: 'プロの技術で徹底洗浄',
                    base_price: 10000,
                    duration: 90,
                    image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
                    category: 'cleaning',
                    organization_id: '00000000-0000-0000-0000-000000000000',
                }]),
            });
        });

        await page.route('**/rest/v1/service_options*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        // 郵便番号検索のモック
        await page.route('**/zipcloud.ibsnet.co.jp/api/search*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    results: [{
                        address1: '東京都',
                        address2: '千代田区',
                        address3: '千代田'
                    }]
                }),
            });
        });

        // 空き状況Edge Functionのモック
        await page.route('**/functions/v1/get-availability', async route => {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const availability = {
                [dateStr]: {
                    "09:00": 0, "10:00": 0, "11:00": 0,
                    "12:00": 0, "13:00": 0, "14:00": 0,
                    "15:00": 0, "16:00": 0, "17:00": 0
                }
            };
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ availability }),
            });
        });

        // 顧客作成RPCのモック
        await page.route('**/rest/v1/rpc/find_or_create_customer*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify('test-customer-id'),
            });
        });

        // 予約データの関連テーブルへのインサートのモック
        await page.route('**/rest/v1/booking_services*', async route => {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        await page.route('**/rest/v1/booking_options*', async route => {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        // 予約登録のモック (送信成功)
        await page.route('**/rest/v1/bookings*', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ id: 'new-booking-id' }),
                });
            } else {
                // SELECT (空き状況確認用など)
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([]),
                });
            }
        });

        // 2. 予約ページにアクセス
        await page.goto('/booking/test119-ca665cae');

        // 4. 読み込み待ち
        await expect(page.locator('header')).toBeVisible();

        // 5. サービスを選択
        await page.waitForSelector('text=エアコンクリーニング', { timeout: 15000 });
        await page.click('text=エアコンクリーニング', { force: true });
        await page.waitForTimeout(500);

        // 6. 次へ進む
        const nextButton = page.getByRole('button', { name: /日時選択|次へ/ });
        await expect(nextButton).toBeEnabled({ timeout: 15000 });
        await nextButton.click();

        // 7. 日時を選択 (カレンダー操作)
        await page.waitForTimeout(1000);
        // 空きスロット（○）を探してクリック
        const availableSlot = page.locator('button').filter({ hasText: '○' }).first();
        await expect(availableSlot).toBeVisible({ timeout: 15000 });
        await availableSlot.click({ force: true });

        // 8. 駐車場情報を選択
        await page.locator('label', { hasText: '駐車場あり' }).click();

        // 9. 次へ進む
        const toCustomerButton = page.getByRole('button', { name: 'お客様情報へ' });
        await expect(toCustomerButton).toBeEnabled();
        await toCustomerButton.click();

        // 10. 顧客情報を入力
        await page.locator('#lastName').fill('テスト');
        await page.locator('#firstName').fill('太郎');
        await page.locator('#phone').fill('09012345678');
        await page.locator('#postalCode').fill('1000001');
        await page.getByRole('button', { name: '住所検索' }).click();

        // 住所が自動入力されるのを待つ
        await expect(page.locator('#address')).not.toHaveValue('', { timeout: 10000 });

        // 11. 予約内容の確認ページへ
        await page.getByRole('button', { name: '確認へ' }).click();

        // 12. 最終確認して送信
        await expect(page.locator('h2')).toContainText('予約内容の確認');
        await page.getByRole('button', { name: '予約を確定する' }).click();

        // 13. 完了画面の確認 (モーダル内のメッセージを確認)
        await expect(page.getByText('ご予約ありがとうございます！')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('予約リクエストを受け付けました')).toBeVisible();
    });
});
