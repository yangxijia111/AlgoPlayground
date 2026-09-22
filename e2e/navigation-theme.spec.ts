import { expect, test } from '@playwright/test';

const PAGES = [
  ['sorting', 'bubble-sort'],
  ['sorting', 'quick-sort'],
  ['sorting', 'heap-sort'],
  ['searching', 'linear-search'],
  ['linear', 'stack'],
  ['linear', 'queue'],
  ['linear', 'linked-list'],
  ['tree', 'bst-operations'],
  ['tree', 'tree-traversal'],
  ['graph', 'bfs'],
  ['graph', 'dfs'],
  ['graph', 'dijkstra'],
  ['recursion', 'factorial'],
  ['recursion', 'fibonacci-recursion'],
  ['recursion', 'hanoi'],
  ['backtracking', 'n-queens'],
  ['dp', 'fib-dp'],
  ['dp', 'knapsack'],
] as const;

test.describe('主题与全站导航', () => {
  test('Dark 默认，切换 Light 后刷新保持（localStorage 持久化）', async ({ page }) => {
    await page.goto('/');
    // 首次访问会弹首次欢迎卡（v1.1.0）；先跳过再操作主题
    const welcome = page.getByRole('dialog', { name: /欢迎使用/ });
    if (await welcome.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '跳过' }).click();
      await expect(welcome).toHaveCount(0);
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: '切换到浅色主题' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    // 刷新后主题持久化
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: '切换到深色主题' })).toBeVisible();
  });

  for (const [category, algoId] of PAGES) {
    test(`页面无崩溃：${category}/${algoId}`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(String(err)));
      await page.goto(`/#/${category}/${algoId}`);
      // 关键 UI 存在 = 未白屏/未触发错误边界
      await expect(page.locator('.app-brand')).toBeVisible();
      await expect(page.locator('.player-step')).toBeVisible();
      await expect(page.locator('.step-description')).not.toBeEmpty();
      // 无 React fatal error
      expect(pageErrors, `页面 ${category}/${algoId} 抛出异常：${pageErrors.join('; ')}`).toEqual([]);
    });
  }

  test('深层链接刷新不 404（HashRouter）', async ({ page }) => {
    await page.goto('/#/graph/dijkstra');
    await page.reload();
    await expect(page.locator('.player-step')).toBeVisible();
    await expect(page.locator('.card-title', { hasText: 'Dijkstra' })).toBeVisible();
  });
});
