import { expect, test } from '@playwright/test';

test.describe('学习路线', () => {
  test('学习路线页显示 13 章与推荐下一步', async ({ page }) => {
    await page.goto('/#/learn');
    await expect(page.getByRole('heading', { name: '学习路线' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '1. 基础概念' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '13. 动态规划' })).toBeVisible();
    await expect(page.getByText('推荐下一步')).toBeVisible();
    // 进度文本：初始 0/N
    await expect(page.locator('.learn-progress-text').first()).toContainText('0/');
  });

  test('概念课页显示内容与关联算法，访问后路线标记完成', async ({ page }) => {
    await page.goto('/#/learn/concept/what-is-algorithm');
    await expect(page.getByRole('heading', { name: /算法是什么/ })).toBeVisible();
    await expect(page.locator('.concept-related').getByRole('link', { name: /冒泡排序/ })).toBeVisible();
    // 返回学习路线：该节完成
    await page.getByRole('link', { name: '学习路线' }).first().click();
    await expect(page.locator('.lesson-done-mark')).toHaveCount(1);
  });

  test('算法小节跳转到算法页，侧栏圆点点亮', async ({ page }) => {
    await page.goto('/#/learn');
    await page.getByRole('link', { name: /冒泡排序/ }).first().click();
    await expect(page.locator('.player-step')).toBeVisible();
    // 访问后侧栏算法圆点点亮（aria-label = 学习中）
    await expect(page.locator('.sidebar-state-dot.is-started').first()).toBeVisible();
    // 学习路线该节显示已完成
    await page.goto('/#/learn');
    await expect(page.locator('.lesson-done-mark')).toHaveCount(1);
  });
});
