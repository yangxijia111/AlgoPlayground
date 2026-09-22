import { expect, test } from '@playwright/test';

test.describe('Notes / Bookmarks / Welcome', () => {
  test('首次访问显示欢迎卡；跳过后刷新不再出现', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: /欢迎使用/ });
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: '跳过' }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('dialog', { name: /欢迎使用/ })).toHaveCount(0);
  });

  test('欢迎卡「从学习路线开始」跳转到 Learn', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '从学习路线开始' }).click();
    await expect(page.getByRole('heading', { name: '学习路线' })).toBeVisible();
    // 二次访问不再出现
    await page.goto('/');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('算法页笔记自动保存并在刷新后保留', async ({ page }) => {
    await page.goto('/#/sorting/quick-sort');
    const ta = page.locator('.note-textarea');
    await ta.fill('快排每轮把 pivot 放到最终位置');
    // 等待「已保存」状态出现（防抖 800ms + 保存）
    await expect(page.getByText('已保存 ✓')).toBeVisible({ timeout: 5_000 });
    await page.reload();
    await expect(page.locator('.note-textarea')).toHaveValue('快排每轮把 pivot 放到最终位置');
  });

  test('收藏星标切换，Progress 页可见', async ({ page }) => {
    await page.goto('/#/sorting/dijkstra');
    await page.getByRole('button', { name: '收藏本算法' }).click();
    await expect(page.getByRole('button', { name: '取消收藏' })).toBeVisible();
    await page.goto('/#/progress');
    await expect(page.locator('.bookmark-list a', { hasText: 'Dijkstra 最短路' })).toBeVisible();
  });
});
