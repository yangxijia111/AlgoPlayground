import { expect, test } from '@playwright/test';
import { gotoAlgo, seekToEnd, stepDescription, readStepCounter, clickNext } from './utils';
import { buildShareQuery } from '../src/core/share/url';
import { getAlgorithm, registerAll } from '../src/core/registry';
import { allEntries } from '../src/core/algorithms';

registerAll(allEntries);

function shareUrl(algoId: string, query: string): string {
  const entry = getAlgorithm(algoId)!;
  return `/#/${entry.meta.category}/${algoId}?${query}`;
}

test.describe('拓扑排序（P12）', () => {
  test('默认 DAG 播放到终点：拓扑序 A→B→C→D→E 正确展示', async ({ page }) => {
    await gotoAlgo(page, 'graph', 'topo-sort');
    // 拓扑排序不显示起点选择器，显示说明
    await expect(page.getByText('拓扑排序不需要起点')).toBeVisible();
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('拓扑排序完成');
    await expect(stepDescription(page)).toContainText('A → B → C → D → E');
  });

  test('单步推进：出队节点高亮，入度徽标逐步递减', async ({ page }) => {
    await gotoAlgo(page, 'graph', 'topo-sort');
    // 第 1 帧：入度计算（徽标为真实入度）
    await expect(stepDescription(page)).toContainText('计算入度');
    await clickNext(page); // 入度 0 入队
    await expect(stepDescription(page)).toContainText('入度为 0 的节点');
    await clickNext(page); // A 出队
    await expect(stepDescription(page)).toContainText('A 出队');
    await clickNext(page); // 处理边 A→B：入度归零
    await expect(stepDescription(page)).toContainText('入度 1→0');
  });

  test('分享链接 roundtrip：打开后恢复同一输入并得到同一拓扑序', async ({ page }) => {
    await gotoAlgo(page, 'graph', 'topo-sort');
    const { total } = await readStepCounter(page);
    const q = buildShareQuery(getAlgorithm('topo-sort')!.defaultInput, { algorithmId: 'topo-sort' });
    await page.goto(shareUrl('topo-sort', q));
    await expect(page.locator('.player-step')).toBeVisible();
    await expect(page.getByText('分享链接中的数据无效')).toHaveCount(0);
    await expect.poll(async () => (await readStepCounter(page)).total).toBe(total);
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('A → B → C → D → E');
  });
});

test.describe('Prim 最小生成树（P12）', () => {
  test('默认图播放到终点：总权重 14 与 4 条树边', async ({ page }) => {
    await gotoAlgo(page, 'graph', 'prim');
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('Prim 完成');
    await expect(stepDescription(page)).toContainText('总权重 = 14');
    // 树边 success 高亮：MST 的 4 条边
    const okEdges = page.locator('.graph-svg .viz-edge--success');
    expect(await okEdges.count()).toBe(4);
  });

  test('单步推进：起点 key=0 初始帧与第一次 key 更新', async ({ page }) => {
    await gotoAlgo(page, 'graph', 'prim');
    await expect(stepDescription(page)).toContainText('树只含起点 A');
    await clickNext(page); // 考察割边 A—B
    await expect(stepDescription(page)).toContainText('key[B] 更新为 3');
  });

  test('分享链接 roundtrip：打开后恢复同一输入并得到总权重 14', async ({ page }) => {
    const q = buildShareQuery(getAlgorithm('prim')!.defaultInput, { algorithmId: 'prim' });
    await page.goto(shareUrl('prim', q));
    await expect(page.locator('.player-step')).toBeVisible();
    await expect(page.getByText('分享链接中的数据无效')).toHaveCount(0);
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('总权重 = 14');
  });
});

test.describe('P12 挑战：新图算法挑战可完成', () => {
  test('拓扑排序挑战：按 Kahn 输出顺序点击 5 个节点后通关', async ({ page }) => {
    await page.goto('/#/challenges/topo-order');
    // 节点 DOM 顺序 = 声明顺序 A..E；期望序列 A,B,C,D,E
    for (const idx of [0, 1, 2, 3, 4]) {
      await page.locator('.viz-node-clickable').nth(idx).click();
      await expect(page.locator('.challenge-verdict.is-correct').last()).toBeVisible();
    }
    await expect(page.getByText(/🎉 完成！/)).toBeVisible();
  });

  test('Prim 挑战：按连入树顺序点击 B,C,E,D 后通关', async ({ page }) => {
    await page.goto('/#/challenges/prim-tree');
    // prim 默认图节点声明顺序 A..E；接受序列 B,C,E,D
    for (const idx of [1, 2, 4, 3]) {
      await page.locator('.viz-node-clickable').nth(idx).click();
      await expect(page.locator('.challenge-verdict.is-correct').last()).toBeVisible();
    }
    await expect(page.getByText(/🎉 完成！/)).toBeVisible();
  });
});

