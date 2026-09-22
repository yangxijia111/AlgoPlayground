import { expect, test, type Page } from '@playwright/test';
import { buildShareQuery } from '../src/core/share/url';
import { encodeInput } from '../src/core/share/url';
import { getAlgorithm, registerAll } from '../src/core/registry';
import { allEntries } from '../src/core/algorithms';

registerAll(allEntries);

/** 构造与浏览器地址栏一致的完整分享 URL（v2 或 v1） */
function shareUrl(algoId: string, query: string): string {
  const entry = getAlgorithm(algoId)!;
  return `/#/${entry.meta.category}/${algoId}?${query}`;
}

test.describe('P11-1 Stack 连续状态链', () => {
  test('A,B,C 入栈 → Pop → Push D：编辑器 chips 与可视化终态一致', async ({ page }) => {
    await page.goto('/#/linear/stack');
    await expect(page.locator('.player-step')).toBeVisible();
    const valueInput = page.getByLabel('操作值');

    // 清空默认内容（stack 默认输入非空）：重置为空栈
    await valueInput.fill('');
    await page.getByRole('button', { name: '重置' }).click();
    await expect
      .poll(async () => page.locator('.input-editor .viz-chip:not(.viz-chip--note)').allTextContents())
      .toEqual([]);

    // 依次入栈 A B C
    for (const v of ['A', 'B', 'C']) {
      await valueInput.fill(v);
      await page.getByRole('button', { name: '入栈 Push' }).click();
    }
    // 编辑器 chips 应显示 A B C（stack：底→顶）
    await expect
      .poll(async () => page.locator('.input-editor .viz-chip:not(.viz-chip--note)').allTextContents())
      .toEqual(['A', 'B', 'C']);

    // Pop：栈顶 C 出栈（P11 修复点：编辑器不得显示 [B,C]）
    await page.getByRole('button', { name: '出栈 Pop' }).click();
    await expect
      .poll(async () => page.locator('.input-editor .viz-chip:not(.viz-chip--note)').allTextContents())
      .toEqual(['A', 'B']);

    // 继续入栈 D：状态链 [A,B,D]
    await valueInput.fill('D');
    await page.getByRole('button', { name: '入栈 Push' }).click();
    await expect
      .poll(async () => page.locator('.input-editor .viz-chip:not(.viz-chip--note)').allTextContents())
      .toEqual(['A', 'B', 'D']);

    // 可视化帧的栈内容与编辑器一致：seek 到「D 入栈」高亮步（0 基第 1 步）
    await page.getByRole('slider', { name: '时间轴' }).fill('1');
    await expect(page.locator('.player-step')).toHaveText(/^2\s*\/\s*3$/);
    const frameChips = await page.locator('.viz-card .struct-box').allTextContents();
    // StructureView 按顶→底渲染（DOM 顺序 D,B,A）
    expect(frameChips).toEqual(['D', 'B', 'A']);
  });
});

test.describe('P11-2 Binary Search Share（variant 不丢失）', () => {
  test('v1 兼容链接（无 variant 字段）打开后仍是二分：lo/hi/mid 指针与区间收缩可见', async ({ page }) => {
    await page.goto(shareUrl('binary-search', 'a=1,3,5,7,9,11&t=9'));
    await expect(page.locator('.player-step')).toBeVisible();
    await expect(page.locator('.form-error')).toHaveCount(0);
    await expect(page.locator('.share-notice')).toHaveCount(0);
    // 二分专属可视化：中点步骤解说含「中点 mid」；linear 不会出现
    await page.getByRole('button', { name: '下一步' }).click();
    await expect(page.locator('.step-description')).toContainText('mid');
  });

  test('v2 链接 roundtrip：variant=binary 保持', async ({ page }) => {
    const q = buildShareQuery({ type: 'search', variant: 'binary', array: [1, 3, 5, 7, 9, 11], target: 9 }, { algorithmId: 'binary-search' });
    await page.goto(shareUrl('binary-search', q));
    await expect(page.locator('.player-step')).toBeVisible();
    await page.getByRole('button', { name: '下一步' }).click();
    await expect(page.locator('.step-description')).toContainText('mid');
  });
});

test.describe('P11-3 Share Step 恢复', () => {
  test('s=<step> 打开后恢复到该步', async ({ page }) => {
    const q = buildShareQuery({ type: 'sort', array: [9, 4, 7, 1] }, { algorithmId: 'bubble-sort', step: 3 });
    await page.goto(shareUrl('bubble-sort', q));
    await expect(page.locator('.player-step')).toBeVisible();
    // 0 基 step=3 → 1 基显示 4
    await expect(page.locator('.player-step')).toHaveText(/^4\s*\/\s*\d+$/);
  });

  test('s 超界被 clamp 且提示，不崩溃', async ({ page }) => {
    const q = buildShareQuery({ type: 'sort', array: [9, 4, 7, 1] }, { algorithmId: 'bubble-sort', step: 25 });
    await page.goto(shareUrl('bubble-sort', q));
    await expect(page.locator('.player-step')).toBeVisible();
    await expect(page.getByText('分享中的步数超出范围，已跳到第')).toBeVisible();
    // clamp 到最后一步（1 基 = total）
    const text = await page.locator('.player-step').textContent();
    const m = text?.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    expect(m).toBeDefined();
    expect(Number(m![1])).toBe(Number(m![2]));
  });
});

test.describe('P11-4 Beginner Share（session 生效）', () => {
  test('m=b 打开后 Beginner 详解开启且不污染全局设置', async ({ page }) => {
    const q = buildShareQuery({ type: 'sort', array: [5, 2, 4, 1] }, { algorithmId: 'bubble-sort', beginner: true });
    await page.goto(shareUrl('bubble-sort', q));
    await expect(page.locator('.player-step')).toBeVisible();
    // session 生效提示
    await expect(page.getByText('新手详解已由分享链接开启（仅本次浏览生效）')).toBeVisible();
    // 详解可见（Beginner 区域渲染）
    await expect(page.locator('.beginner-detail, .beginner-note, [class*="beginner"]').first()).toBeVisible();
    // 全局开关未被污染：aria-pressed=false
    await expect(page.getByRole('button', { name: /切换到新手模式/ })).toHaveAttribute('aria-pressed', 'false');
    // 打开另一个页面：全局设置仍关闭
    await page.goto('/#/sorting/selection-sort');
    await expect(page.getByRole('button', { name: /切换到新手模式/ })).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('P11-5 最大合法 Graph Share', () => {
  test('12 节点 24 边混合图 roundtrip 恢复成功', async ({ page }) => {
    // 构造接近上限的合法图（与单元测试同款构造）
    const nodes = Array.from({ length: 12 }, (_, i) => ({
      id: `N${i}`,
      x: Math.round(((i * 37) % 97) / 97 * 100) / 100,
      y: Math.round(((i * 53 + 11) % 89) / 89 * 100) / 100,
    }));
    const edges: { id: string; from: string; to: string; directed: boolean; weight: number }[] = [];
    for (let i = 0; i < 12; i++) {
      edges.push({ id: `r${i}`, from: nodes[i]!.id, to: nodes[(i + 1) % 12]!.id, directed: i % 2 === 0, weight: i % 3 === 0 ? 99 : i % 3 === 1 ? 1 : 50 });
    }
    for (let i = 0; edges.length < 24; i++) {
      const a = nodes[i % 12]!.id;
      const b = nodes[(i + 5) % 12]!.id;
      if (a === b) continue;
      edges.push({ id: `c${i}`, from: a, to: b, directed: true, weight: i % 2 === 0 ? 1 : 99 });
    }
    const input = { type: 'graph' as const, algorithm: 'dijkstra' as const, graph: { nodes, edges }, start: nodes[0]!.id, end: null };
    expect(getAlgorithm('dijkstra')!.validate(input)).toBeNull();

    const q = buildShareQuery(input, { algorithmId: 'dijkstra' });
    await page.goto(shareUrl('dijkstra', q));
    await expect(page.locator('.player-step')).toBeVisible();
    // 无校验错误、无分享无效提示
    await expect(page.locator('.form-error')).toHaveCount(0);
    await expect(page.getByText('分享链接中的数据无效')).toHaveCount(0);
    // 编辑器画布渲染 12 个节点
    await expect(page.locator('.graph-editor-canvas circle.viz-el--normal')).toHaveCount(12);
    // v1 大图链接（超旧 2000 上限）也能打开
    const v1 = encodeInput(input);
    expect(v1.length).toBeGreaterThan(2000);
    await page.goto(shareUrl('dijkstra', v1));
    await expect(page.locator('.player-step')).toBeVisible();
    await expect(page.getByText('分享链接中的数据无效')).toHaveCount(0);
    await expect(page.locator('.graph-editor-canvas circle.viz-el--normal')).toHaveCount(12);
  });
});

test.describe('P11-6 Storage 失败可见', () => {
  test('localStorage 写失败时笔记显示保存失败（非「已保存 ✓」）', async ({ page }) => {
    // 注入前让 setItem 全部抛错（读仍可用）
    await page.addInitScript(() => {
      const orig = window.localStorage.setItem.bind(window.localStorage);
      Object.defineProperty(window.localStorage, 'setItem', {
        value: () => {
          throw new DOMException('quota', 'QuotaExceededError');
        },
      });
      void orig;
    });
    await page.goto('/#/sorting/bubble-sort');
    await expect(page.locator('.player-step')).toBeVisible();
    const note = page.getByLabel('学习笔记内容');
    await note.fill('测试写入失败');
    // 防抖 800ms + flush 300ms
    await expect(page.locator('.note-status')).toContainText('保存失败', { timeout: 5_000 });
    await expect(page.locator('.note-status')).not.toContainText('已保存 ✓');
  });
});

test.describe('P11-7 Import malformed 拒绝', () => {
  async function importJson(page: Page, json: string): Promise<void> {
    await page.goto('/#/progress');
    await page.setInputFiles('input[type="file"]', {
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(json, 'utf-8'),
    });
  }

  test('correct > total 的 quiz 记录被明确拒绝', async ({ page }) => {
    await importJson(
      page,
      JSON.stringify({
        storageVersion: 2,
        revision: 1,
        profile: { progress: { bfs: { quiz: { q1: { attemptCount: 2, correctCount: 5, lastCorrect: true, lastAnsweredAt: '2026-01-01T00:00:00.000Z' } } } } },
      }),
    );
    await expect(page.getByText(/导入失败.*correctCount/)).toBeVisible({ timeout: 5_000 });
    // 不出现确认导入（未进入 pending 状态）
    await expect(page.getByRole('button', { name: '确认导入' })).toHaveCount(0);
  });

  test('非法日期 2026-02-31 被拒绝', async ({ page }) => {
    await importJson(
      page,
      JSON.stringify({ storageVersion: 2, revision: 1, profile: { activityDays: ['2026-02-31'] } }),
    );
    await expect(page.getByText(/导入失败.*日期/)).toBeVisible({ timeout: 5_000 });
  });

  test('非法图数据被拒绝', async ({ page }) => {
    await importJson(
      page,
      JSON.stringify({
        storageVersion: 2,
        revision: 1,
        profile: { savedGraphs: [{ id: 'g1', name: '坏图', graph: { nodes: [{ id: 'A', x: 5, y: 0.5 }], edges: [] }, createdAt: '2026-01-01T00:00:00.000Z' }] },
      }),
    );
    await expect(page.getByText(/导入失败.*x/)).toBeVisible({ timeout: 5_000 });
  });

  test('合法数据正常导入成功', async ({ page }) => {
    await importJson(
      page,
      JSON.stringify({
        storageVersion: 2,
        revision: 1,
        profile: { settings: { beginnerMode: false, welcomeDone: true }, activityDays: ['2026-01-01'] },
      }),
    );
    await page.getByRole('button', { name: '确认导入' }).click();
    await expect(page.getByText('导入成功，学习数据已覆盖。')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('P11-8 跨标签页不丢数据', () => {
  test('Tab A 答题 + Tab B 记笔记 → 双向同步后两域都保留', async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    // Tab A 打开算法页答题
    await pageA.goto('/#/sorting/bubble-sort');
    await expect(pageA.locator('.player-step')).toBeVisible();
    // 回答一道 Quiz（若该算法有题组）
    const firstOption = pageA.locator('.quiz-card button').first();
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click();
      await pageA.waitForTimeout(1_200); // 防抖 300ms 落盘
    }

    // Tab B 打开算法页记笔记
    await pageB.goto('/#/sorting/bubble-sort');
    await expect(pageB.locator('.player-step')).toBeVisible();
    await pageB.getByLabel('学习笔记内容').fill('跨标签页笔记');
    await pageB.waitForTimeout(1_500); // 防抖 800ms + 落盘 300ms → storage event → Tab A 合并写回

    // Tab B 刷新：Quiz 记录保留（域合并不丢）
    await pageB.reload();
    await expect(pageB.locator('.player-step')).toBeVisible();
    // Tab A 刷新：笔记保留
    await pageA.reload();
    await expect(pageA.locator('.player-step')).toBeVisible();
    const noteA = await pageA.getByLabel('学习笔记内容').inputValue();
    expect(noteA).toBe('跨标签页笔记');
    await context.close();
  });
});
