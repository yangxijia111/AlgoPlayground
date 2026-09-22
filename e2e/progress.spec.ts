import { expect, test } from '@playwright/test';

test.describe('Progress 页', () => {
  test('学习行为汇聚到 Progress：统计卡、明细表、掌握度徽章', async ({ page }) => {
    // 产生学习数据：访问冒泡页 + 播放完 + 答一题 Quiz
    await page.goto('/#/sorting/bubble-sort');
    await expect(page.locator('.player-step')).toBeVisible();
    await page.goto('/#/progress');

    await expect(page.getByRole('heading', { name: '学习进度' })).toBeVisible();
    // 统计卡
    await expect(page.locator('.stat-card', { hasText: '学习天数' }).locator('.stat-num')).toHaveText('1');
    await expect(page.locator('.stat-card', { hasText: '已学算法' }).locator('.stat-num')).toHaveText('1');
    // 明细表有冒泡行（学习中发现 learning）
    const row = page.locator('.progress-table tr', { hasText: '冒泡排序' });
    await expect(row).toBeVisible();
    await expect(row.locator('.mastery-badge')).toContainText(/学习中|练习中|接近掌握|已掌握/);
    // 分类掌握条形 8 条
    await expect(page.getByRole('progressbar')).toHaveCount(8);
  });

  test('完成挑战与答题后掌握度提升可见', async ({ page }) => {
    // 看完动画：拖动到最后一播
    await page.goto('/#/sorting/bubble-sort');
    const total = Number((await page.locator('.player-step').textContent())!.split('/')[1].trim());
    await page.getByRole('slider', { name: '时间轴' }).fill(String(total - 1));
    await page.goto('/#/progress');
    const row = page.locator('.progress-table tr', { hasText: '冒泡排序' });
    await expect(row.locator('.mastery-badge')).toContainText('25');
  });
});
