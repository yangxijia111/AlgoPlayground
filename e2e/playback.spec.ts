import { expect, test } from '@playwright/test';
import { clickNext, controlButton, gotoAlgo, readStepCounter, seekTo, setSpeed } from './utils';

test.describe('播放器', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAlgo(page, 'sorting', 'selection-sort');
  });

  test('Next / Previous：计数与解说随之变化', async ({ page }) => {
    const firstDesc = await page.locator('.step-description').textContent();
    const { index: i1 } = await clickNext(page);
    expect(i1).toBe(2);
    await controlButton(page, '上一步').click();
    await expect.poll(() => readStepCounter(page).then((s) => s.index)).toBe(1);
    // 手动导航会暂停
    await expect(controlButton(page, '播放')).toBeVisible();
    expect(await page.locator('.step-description').textContent()).toBe(firstDesc);
  });

  test('Restart：回到第 1 步且保持速度档位', async ({ page }) => {
    await setSpeed(page, '2x');
    await clickNext(page);
    await clickNext(page);
    await controlButton(page, '重播').click();
    await expect.poll(() => readStepCounter(page).then((s) => s.index)).toBe(1);
    await expect(controlButton(page, '速度 2x')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Speed：切换档位生效', async ({ page }) => {
    await setSpeed(page, '0.25x');
    await setSpeed(page, '4x');
    await expect(controlButton(page, '速度 0.25x')).toHaveAttribute('aria-pressed', 'false');
    await expect(controlButton(page, '速度 4x')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Timeline：拖动（fill）到中段与终点', async ({ page }) => {
    const { total } = await readStepCounter(page);
    expect(total).toBeGreaterThan(10);
    const mid = Math.floor(total / 2);
    await seekTo(page, mid);
    await expect(page.locator('.player-step')).toHaveText(`${mid} / ${total}`);
    await seekTo(page, total);
    await expect(page.locator('.player-step')).toHaveText(`${total} / ${total}`);
  });
});
