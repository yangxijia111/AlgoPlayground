import { expect, test } from '@playwright/test';
import { gotoAlgo, seekToEnd, stepDescription } from './utils';

test.describe('Dijkstra', () => {
  test('预设图播放到终点：距离与最短结果正确展示', async ({ page }) => {
    await gotoAlgo(page, 'graph', 'dijkstra');
    await seekToEnd(page);
    // 终态解说包含每个节点的最短距离（默认图从 A 出发的金标准）
    await expect(stepDescription(page)).toContainText('Dijkstra 完成');
    await expect(stepDescription(page)).toContainText('A:0');
    await expect(stepDescription(page)).toContainText('F:8');
    // 变量面板展示距离与前驱
    await expect(page.locator('.graph-state')).toContainText('pred=');
  });

  test('指定终点：回溯最短路径并以 success 高亮', async ({ page }) => {
    await gotoAlgo(page, 'graph', 'dijkstra');
    await page.getByLabel('终点（可选，提前结束）').selectOption('F');
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('最短路径');
    // 路径边高亮
    const okEdges = page.locator('.graph-svg .viz-edge--success');
    expect(await okEdges.count()).toBeGreaterThanOrEqual(2);
  });
});
