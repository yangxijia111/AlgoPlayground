import { expect, test } from '@playwright/test';
import { arrayValues, clickNext, gotoAlgo, seekToEnd, stepDescription } from './utils';

test.describe('冒泡排序', () => {
  test('输入 5,4,3,2,1 → 下一步推进 → 播放到终点为 1,2,3,4,5', async ({ page }) => {
    await gotoAlgo(page, 'sorting', 'bubble-sort');

    await page.getByLabel('自定义数组').fill('5,4,3,2,1');
    await page.getByRole('button', { name: '应用' }).click();
    await expect(stepDescription(page)).toContainText('初始状态');

    // 点击 Next：步数前进、解说变化
    const first = await stepDescription(page).textContent();
    await clickNext(page);
    await expect(stepDescription(page)).not.toHaveText(first ?? '');

    // 播放到结束（直接跳到终态，避免逐帧等待）
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('排序完成');

    // 最终数组必须为 1,2,3,4,5（柱顶数值标签排序后比对）
    const values = await arrayValues(page);
    expect([...values].sort((a, b) => Number(a) - Number(b))).toEqual(['1', '2', '3', '4', '5']);
    // 全部下标处于已排序（success）状态
    const successBars = page.locator('.array-svg rect.viz-el--success');
    await expect(successBars).toHaveCount(5);
  });
});
