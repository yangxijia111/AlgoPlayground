import { expect, test } from '@playwright/test';

test.describe('Quiz 随堂小测', () => {
  test('冒泡排序页：作答 → 判分 → 解析 → 下一题', async ({ page }) => {
    await page.goto('/#/sorting/bubble-sort');
    const quiz = page.locator('.quiz-card');
    await expect(quiz).toBeVisible();
    await expect(quiz.locator('.quiz-progress')).toContainText('1/');

    // 选择第一个选项并提交
    await quiz.locator('[role="radio"]').first().click();
    await quiz.getByRole('button', { name: '提交' }).click();
    await expect(quiz.locator('.quiz-verdict')).toBeVisible();
    await expect(quiz.locator('.quiz-explanation')).not.toBeEmpty();
    // 选项锁定
    await expect(quiz.locator('[role="radio"]').first()).toBeDisabled();

    // 下一题
    await quiz.getByRole('button', { name: '下一题' }).click();
    await expect(quiz.locator('[role="radio"]').first()).toBeEnabled();
  });

  test('刷新后答题记录保留（历史圆点）', async ({ page }) => {
    await page.goto('/#/sorting/bubble-sort');
    const quiz = page.locator('.quiz-card');
    await quiz.locator('[role="radio"]').first().click();
    await quiz.getByRole('button', { name: '提交' }).click();
    await expect(quiz.locator('.quiz-verdict')).toBeVisible();

    // 刷新（HashRouter 深层链接安全）
    await page.reload();
    const quiz2 = page.locator('.quiz-card');
    await expect(quiz2.locator('.quiz-history-dot').first()).toBeVisible();
  });
});
