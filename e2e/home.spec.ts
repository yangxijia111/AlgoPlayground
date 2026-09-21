import { expect, test } from '@playwright/test';

test.describe('首页', () => {
  test('标题、算法导航与比较模式入口存在', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-brand')).toContainText('AlgoPlayground');
    await expect(page.getByRole('navigation', { name: '站点导航' })).toBeVisible();
    await expect(page.locator('.sidebar-link', { hasText: '冒泡排序' })).toBeVisible();
    await expect(page.locator('.sidebar-link', { hasText: '排序比较模式' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '比较模式' })).toBeVisible();
    // 8 个分类 + 20 个算法入口（首页卡片）
    await expect(page.locator('.home-card')).toHaveCount(9);
  });
});
