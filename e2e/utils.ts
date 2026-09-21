import { expect, type Page } from '@playwright/test';

/**
 * E2E 公共工具：全部基于 locator / expect / 明确状态条件等待，禁止任意 sleep。
 */

/** 打开算法页（应用使用 HashRouter，深层链接刷新安全） */
export async function gotoAlgo(page: Page, category: string, algoId: string): Promise<void> {
  await page.goto(`/#/${category}/${algoId}`);
  await expect(page.locator('.player-step')).toBeVisible();
}

/** 播放器步数文本，如 "1 / 23" → { index: 1, total: 23 } */
export async function readStepCounter(page: Page): Promise<{ index: number; total: number }> {
  const text = (await page.locator('.player-step').textContent()) ?? '';
  const m = text.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) throw new Error(`无法解析步数文本：${text}`);
  return { index: Number(m[1]), total: Number(m[2]) };
}

/** 当前步骤解说文本 */
export function stepDescription(page: Page) {
  return page.locator('.step-description');
}

/** 通过 aria-label 定位播放器控制按钮 */
export function controlButton(page: Page, label: string) {
  return page.locator(`[aria-label="${label}"]`);
}

/** 点击"下一步"并等待计数变化（返回新计数） */
export async function clickNext(page: Page): Promise<{ index: number; total: number }> {
  const before = await readStepCounter(page);
  await controlButton(page, '下一步').click();
  await expect
    .poll(() => readStepCounter(page), { timeout: 5_000 })
    .toEqual({ index: before.index + 1, total: before.total });
  return readStepCounter(page);
}

/** 用时间轴滑块跳到指定步（1-based）；range 输入可用 fill 设置 */
export async function seekTo(page: Page, step1based: number): Promise<void> {
  const slider = page.getByRole('slider', { name: '时间轴' });
  await slider.fill(String(step1based - 1));
  await expect.poll(async () => (await readStepCounter(page)).index, { timeout: 5_000 }).toBe(step1based);
}

/** 直接跳到最后一步（终态） */
export async function seekToEnd(page: Page): Promise<void> {
  const { total } = await readStepCounter(page);
  await seekTo(page, total);
}

/** 设置速度档位（如 "4x"） */
export async function setSpeed(page: Page, label: string): Promise<void> {
  await controlButton(page, `速度 ${label}`).click();
  await expect(controlButton(page, `速度 ${label}`)).toHaveAttribute('aria-pressed', 'true');
}

/** 数组柱状图的数值标签（不含下标），按 DOM 顺序返回 */
export async function arrayValues(page: Page): Promise<string[]> {
  const texts = page.locator('.array-svg text.viz-text:not(.viz-text--dim)');
  return texts.allTextContents();
}

/** 编辑器内的文本输入框（按 aria-label） */
export function editorInput(page: Page, label: string) {
  return page.getByLabel(label);
}
