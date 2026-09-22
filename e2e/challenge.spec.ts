import { expect, test } from '@playwright/test';

test.describe('Challenge Mode', () => {
  test('挑战列表显示 7 个挑战', async ({ page }) => {
    await page.goto('/#/challenges');
    await expect(page.getByRole('heading', { name: '挑战', exact: true })).toBeVisible();
    const cards = page.locator('.challenge-card');
    await expect(cards).toHaveCount(7);
  });

  test('冒泡一轮：正确序列通关，记录入库', async ({ page }) => {
    await page.goto('/#/challenges/bubble-pass');
    await expect(page.getByRole('heading', { name: '冒泡一轮' })).toBeVisible();

    // [5,2,4,1] 第一轮：c(0,1) s(0,1) c(1,2) s(1,2) c(2,3) s(2,3)
    const seq: [number, number, '比较' | '交换'][] = [
      [0, 1, '比较'], [0, 1, '交换'],
      [1, 2, '比较'], [1, 2, '交换'],
      [2, 3, '比较'], [2, 3, '交换'],
    ];
    for (const [a, b, op] of seq) {
      await page.locator('.challenge-cell').nth(a).click();
      await page.locator('.challenge-cell').nth(b).click();
      await page.getByRole('button', { name: op }).click();
      await expect(page.locator('.challenge-verdict.is-correct').last()).toBeVisible();
    }
    // 完成提示
    await expect(page.getByText(/🎉 完成！/)).toBeVisible();

    // 记录入库：列表页显示已完成
    await page.goto('/#/challenges');
    await expect(page.getByText('✓ 已完成')).toHaveCount(1);
  });

  test('错误操作给出教学反馈', async ({ page }) => {
    await page.goto('/#/challenges/bubble-pass');
    await expect(page.locator('.challenge-cell')).toHaveCount(4);
    // 错误：先比较 (1,2)
    await page.locator('.challenge-cell').nth(1).click();
    await page.locator('.challenge-cell').nth(2).click();
    await page.getByRole('button', { name: '比较' }).click();
    await expect(page.locator('.challenge-verdict.is-wrong')).toContainText('应该先比较下标 0 和 1');
  });

  test('二分定位：点中点元素通关', async ({ page }) => {
    await page.goto('/#/challenges/binary-search');
    // 期望 pick 5 → pick 9
    await page.getByRole('option', { name: /选择值 5/ }).click();
    await expect(page.locator('.challenge-verdict.is-correct').last()).toBeVisible();
    await page.getByRole('option', { name: /选择值 9/ }).click();
    await expect(page.getByText(/🎉 完成！/)).toBeVisible();
  });

  test('栈操作序列：按钮操作通关', async ({ page }) => {
    await page.goto('/#/challenges/stack-ops');
    await page.getByRole('button', { name: 'push x' }).click();
    await page.getByRole('button', { name: 'push y' }).click();
    await page.getByRole('button', { name: 'pop', exact: true }).click();
    await expect(page.getByText(/🎉 完成！/)).toBeVisible();
  });

  test('BFS 访问顺序：按序点节点通关', async ({ page }) => {
    await page.goto('/#/challenges/bfs-order');
    // BFS 从 A 出发，邻居字母序：A, B, D, C, E, F（节点 DOM 顺序 = 声明顺序 A..F）
    const order = [0, 1, 3, 2, 4, 5]; // A, B, D, C, E, F
    for (const idx of order) {
      await page.locator('.viz-node-clickable').nth(idx).click();
      await expect(page.locator('.challenge-verdict.is-correct').last()).toBeVisible();
    }
    await expect(page.getByText(/🎉 完成！/)).toBeVisible();
  });

  test('BST 查找：按路径点节点通关', async ({ page }) => {
    await page.goto('/#/challenges/bst-search');
    // 树节点 DOM 顺序与 nodes 数组一致；值 8/3/6 的节点按 build 序定位
    for (const v of ['8', '3', '6']) {
      await page.locator('.viz-node-clickable', { has: page.locator('text', { hasText: v }) }).first().click().catch(async () => {
        await page.locator('.viz-node-clickable').filter({ hasText: new RegExp(`^${v}`) }).first().click();
      });
      await expect(page.locator('.challenge-verdict.is-correct').last()).toBeVisible();
    }
    await expect(page.getByText(/🎉 完成！/)).toBeVisible();
  });
});
