import { expect, test } from '@playwright/test';
import { clickNext, gotoAlgo, seekToEnd, stepDescription } from './utils';

test.describe('二分查找', () => {
  test('有序数组查找 7：mid 指针与搜索区间出现，最终命中', async ({ page }) => {
    await gotoAlgo(page, 'searching', 'binary-search');

    await page.getByLabel('查找数组').fill('-5,-1,0,3,7,7,9');
    await page.getByLabel('目标值').fill('7');
    await page.getByRole('button', { name: '开始查找' }).click();
    await expect(stepDescription(page)).toContainText('初始状态');

    // 前进一步：出现 mid 指针（区间/中点比较）
    await clickNext(page);
    await expect(page.locator('.viz-pointer', { hasText: 'mid' })).toBeVisible();
    await expect(stepDescription(page)).toContainText('mid=');

    // 播放到终点：命中目标
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('查找成功');
    await expect(stepDescription(page)).toContainText('共比较');
    // 命中下标高亮为 success
    await expect(page.locator('.array-svg rect.viz-el--success')).toHaveCount(1);
  });

  test('无序数组被拦截并可一键排序后查找', async ({ page }) => {
    await gotoAlgo(page, 'searching', 'binary-search');
    await page.getByLabel('查找数组').fill('9,3,7');
    await page.getByRole('button', { name: '开始查找' }).click();
    await expect(page.getByRole('alert')).toContainText('升序');
    await page.getByRole('button', { name: '一键排序' }).click();
    await expect(stepDescription(page)).toContainText('初始状态');
  });
});
