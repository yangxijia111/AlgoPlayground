import { expect, test } from '@playwright/test';
import { seekToEnd } from './utils';

test.describe('比较模式', () => {
  test('三个排序算法同步播放，终态全部有序', async ({ page }) => {
    await page.goto('/#/compare');
    await expect(page.locator('.compare-run')).toHaveCount(3);
    await expect(page.locator('.compare-run-name', { hasText: '冒泡排序' })).toBeVisible();
    await expect(page.locator('.compare-run-name', { hasText: '选择排序' })).toBeVisible();
    await expect(page.locator('.compare-run-name', { hasText: '快速排序' })).toBeVisible();

    // 统计表存在且包含 Steps/比较/交换列
    await expect(page.locator('.compare-table')).toContainText('Steps');
    await expect(page.locator('.compare-table')).toContainText('比较');

    // 单一时间轴：三者同步推进到终点
    await seekToEnd(page);
    const descs = page.locator('.compare-run-desc');
    await expect(descs.nth(0)).toContainText('排序完成');
    await expect(descs.nth(1)).toContainText('排序完成');
    await expect(descs.nth(2)).toContainText('排序完成');

    // 三个视图的柱状图全部处于已排序（success）状态
    for (let i = 0; i < 3; i++) {
      const bars = page.locator('.compare-run').nth(i).locator('rect.viz-el--success');
      expect(await bars.count()).toBeGreaterThanOrEqual(10);
    }
  });

  test('算法选择限制：最多 3 个', async ({ page }) => {
    await page.goto('/#/compare');
    // 默认已选 3 个，追加第 4 个无效
    await page.getByRole('button', { name: '插入排序' }).click();
    await expect(page.getByRole('button', { name: '插入排序' })).toHaveAttribute('aria-pressed', 'false');
  });
});
