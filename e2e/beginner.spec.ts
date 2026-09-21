import { expect, test } from '@playwright/test';

test.describe('Beginner Mode 与术语表', () => {
  test('开启新手模式后，算法页显示逐步详解与要点；关闭后消失', async ({ page }) => {
    await page.goto('/#/sorting/quick-sort');
    await expect(page.locator('.player-step')).toBeVisible();
    // 前进到分区/比较步
    await page.locator('[aria-label="下一步"]').click();
    await page.locator('[aria-label="下一步"]').click();
    await expect(page.locator('.beginner-detail')).toHaveCount(0);

    await page.getByRole('button', { name: /切换到新手模式/ }).click();
    await expect(page.locator('.beginner-detail')).toHaveCount(1);
    await expect(page.locator('.beginner-detail')).toContainText('a[');
    // 按钮状态切换
    await expect(page.getByRole('button', { name: /切换到标准模式/ })).toHaveAttribute('aria-pressed', 'true');

    // Beginner 模式跨页面保持（顶栏按钮状态）
    await page.goto('/#/sorting/bubble-sort');
    await expect(page.getByRole('button', { name: /切换到标准模式/ })).toBeVisible();
    // 冒泡第 1 步是「开始新一轮扫描」（无详解），第 2 步是比较
    await page.locator('[aria-label="下一步"]').click();
    await page.locator('[aria-label="下一步"]').click();
    await expect(page.locator('.beginner-detail')).toHaveCount(1);
    await expect(page.locator('.beginner-detail')).toContainText('比较');

    // 关闭
    await page.getByRole('button', { name: /切换到标准模式/ }).click();
    await expect(page.locator('.beginner-detail')).toHaveCount(0);
  });

  test('术语表页展示全部术语并可跳转相关算法', async ({ page }) => {
    await page.goto('/#/glossary');
    await expect(page.getByRole('heading', { name: '术语表' })).toBeVisible();
    await expect(page.getByText('基准值（pivot）')).toBeVisible();
    await page.getByRole('link', { name: /快速排序/ }).first().click();
    await expect(page.locator('.player-step')).toBeVisible();
  });

  test('概念课中的术语引用可点击弹出解释', async ({ page }) => {
    await page.goto('/#/learn/concept/space-complexity');
    const ref = page.locator('.term-ref').first();
    await expect(ref).toBeVisible();
    await ref.click();
    await expect(page.locator('.term-pop')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.term-pop')).toHaveCount(0);
  });
});
