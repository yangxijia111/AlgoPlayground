import { expect, test } from '@playwright/test';

test.describe('Recursion Tree / DP 增强 / Complexity Explorer', () => {
  test('斐波那契递归页可切换到递归树视图', async ({ page }) => {
    await page.goto('/#/recursion/fibonacci-recursion');
    await expect(page.locator('.player-step')).toBeVisible();
    // 推进一步产生调用（首步为纯初始态，尚无树）
    await page.locator('[aria-label="下一步"]').click();
    // 切换到递归树视图
    await page.getByRole('tab', { name: '递归树' }).click();
    const tree = page.getByRole('img', { name: /递归树，共 \d+ 个节点/ });
    await expect(tree).toBeVisible();
    // 单步推进树节点数增长或状态变化
    await page.locator('[aria-label="下一步"]').click();
    await expect(tree).toBeVisible();
  });

  test('DP 页显示转移公式与候选对比', async ({ page }) => {
    await page.goto('/#/dp/knapsack');
    await expect(page.locator('.player-step')).toBeVisible();
    // 前进到第一个填格步（边界之后）
    await page.locator('[aria-label="下一步"]').click();
    await page.locator('[aria-label="下一步"]').click();
    await page.locator('[aria-label="下一步"]').click();
    await expect(page.getByText('转移公式')).toBeVisible({ timeout: 10_000 });
  });

  test('复杂度探索器：曲线、表格与算法映射', async ({ page }) => {
    await page.goto('/#/complexity');
    await expect(page.getByRole('heading', { name: '复杂度探索器' })).toBeVisible();
    await expect(page.getByRole('img', { name: /增长曲线/ })).toBeVisible();
    // 调整 n 滑杆
    await page.getByLabel('调整最大规模 n').fill('128');
    await expect(page.getByText(/最大规模 n = 128/)).toBeVisible();
    // 算法映射表：快排最坏 O(n²)
    await expect(page.locator('.progress-table tr', { hasText: '快速排序' })).toContainText('O(n²)');
  });
});
