import { expect, test } from '@playwright/test';

test.describe('Predict Next Step', () => {
  test('冒泡排序：开启预测模式，作答判分，记录到进度', async ({ page }) => {
    await page.goto('/#/sorting/bubble-sort');
    await expect(page.locator('.player-step')).toBeVisible();

    // 开启预测模式并前进到比较步，手动出题
    await page.getByRole('button', { name: /预测模式/ }).click();
    await page.locator('[aria-label="下一步"]').click();
    await page.getByRole('button', { name: '考考我' }).click();
    await expect(page.locator('.predict-options')).toBeVisible();
    await expect(page.locator('.predict-option')).toHaveCount(3);
    await expect(page.getByRole('button', { name: '提交答案' })).toBeDisabled();

    // 选择答案并提交（不预设答案位置，只验证流程闭环）
    await page.locator('.predict-option').first().click();
    await page.getByRole('button', { name: '提交答案' }).click();
    await expect(page.locator('.predict-verdict')).toBeVisible();
    await expect(page.getByRole('button', { name: '继续动画' })).toBeVisible();

    // 继续：卡片关闭
    await page.getByRole('button', { name: '继续动画' }).click();
    await expect(page.locator('.predict-options')).toHaveCount(0);
  });

  test('播放中自动出题并暂停', async ({ page }) => {
    await page.goto('/#/sorting/bubble-sort');
    await expect(page.locator('.player-step')).toBeVisible();
    await page.getByRole('button', { name: /预测模式/ }).click();
    // 从第 4 步（index 3）会出题：先手动走到 index 2，再播放让它推进到 3
    await page.locator('[aria-label="下一步"]').click();
    await page.locator('[aria-label="下一步"]').click();
    await page.locator('[aria-label="播放"]').click();
    // 出题卡片出现即表示播放已暂停
    await expect(page.locator('.predict-options')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: '播放', pressed: true })).toHaveCount(0);
  });
});
