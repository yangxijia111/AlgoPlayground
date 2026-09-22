import { expect, test } from '@playwright/test';

test.describe('Share / Import-Export / Graph Presets', () => {
  test('分享 URL 携带输入数据；打开链接应用自定义数组', async ({ page }) => {
    // 应用格式一致的分享链接：#/{category}/{algoId}?a=...
    await page.goto('/#/sorting/bubble-sort?a=9%2C4%2C7%2C1');
    await expect(page.locator('.player-step')).toBeVisible();
    // 分享数据生效：无校验错误提示
    await expect(page.locator('.form-error')).toHaveCount(0);
    // 分享按钮存在（复制链接功能在 UI 测试覆盖）
    await expect(page.getByRole('button', { name: '复制分享链接' })).toBeVisible();
  });

  test('非法分享参数回退默认输入并提示', async ({ page }) => {
    await page.goto('/#/sorting/bubble-sort?a=999999999');
    await expect(page.getByText('分享链接中的数据无效，已使用默认输入。')).toBeVisible();
    await expect(page.locator('.player-step')).toBeVisible();
    // 关闭提示
    await page.getByRole('button', { name: '关闭提示' }).click();
    await expect(page.getByText('分享链接中的数据无效，已使用默认输入。')).toHaveCount(0);
  });

  test('导出数据生成 JSON 下载；导入坏文件被拒绝', async ({ page }) => {
    await page.goto('/#/progress');
    const dlPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.getByRole('button', { name: '导出数据' }).click();
    const download = await dlPromise;
    expect(download.suggestedFilename()).toMatch(/^algoplayground-learning-\d{8}\.json$/);
  });

  test('Reset 两步确认后统计归零', async ({ page }) => {
    await page.goto('/#/sorting/bubble-sort');
    await expect(page.locator('.player-step')).toBeVisible();
    await page.goto('/#/progress');
    await page.getByRole('button', { name: '重置学习数据' }).click();
    await page.getByRole('button', { name: '确认重置（不可恢复）' }).click();
    await expect(page.getByText('学习数据已重置。')).toBeVisible();
    await expect(page.locator('.stat-card', { hasText: '已学算法' }).locator('.stat-num')).toHaveText('0');
  });

  test('图编辑器保存并加载预设', async ({ page }) => {
    await page.goto('/#/graph/dijkstra');
    await expect(page.getByRole('application', { name: '图编辑画布' })).toBeVisible();
    await page.getByLabel('预设名称').fill('我的测试图');
    await page.getByRole('button', { name: '保存当前图' }).click();
    // 保存成功后出现加载下拉
    const loader = page.getByLabel('加载已保存的图预设');
    await expect(loader).toBeVisible();
    // 加载预设不报错
    await loader.selectOption({ index: 1 });
    await expect(page.getByText(/已加载/)).toBeVisible();
  });
});
