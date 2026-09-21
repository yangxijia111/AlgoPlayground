import { expect, test } from '@playwright/test';
import { gotoAlgo, seekToEnd, stepDescription } from './utils';

test.describe('单链表 / BST', () => {
  test('链表插入：节点数量 4 → 5，结构更新', async ({ page }) => {
    await gotoAlgo(page, 'linear', 'linked-list');
    // 默认 initial 为 A,B,C,D；操作值默认 X、位置默认 1
    await page.getByRole('button', { name: '插入' }).click();
    await expect(stepDescription(page)).toContainText('准备在位置 1 插入');
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('插入完成：链表长度变为 5');
    await expect(page.locator('.struct-box')).toHaveCount(5);
    // 新节点 X 出现在位置 1
    const boxes = page.locator('.struct-box');
    await expect(boxes.nth(1)).toHaveText('X');
  });

  test('BST 插入与搜索：树规模与命中状态', async ({ page }) => {
    await gotoAlgo(page, 'tree', 'bst-operations');
    const nodeCount = () => page.locator('.tree-svg circle.viz-el').count();

    // 插入 55（默认值）：节点 7 → 8
    const before = await nodeCount();
    expect(before).toBe(7);
    await page.getByRole('button', { name: '插入', exact: true }).click();
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('插入完成');
    await expect(page.locator('.tree-svg circle.viz-el')).toHaveCount(8);

    // 搜索 40（树中存在）：命中
    await page.getByLabel('操作值').fill('40');
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    await expect(stepDescription(page)).toContainText('准备查找 40');
    // 下行路径步骤中出现"相等，找到目标"
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('查找成功');
  });

  test('BST 搜索未命中值有明确解释', async ({ page }) => {
    await gotoAlgo(page, 'tree', 'bst-operations');
    await page.getByLabel('操作值').fill('99');
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    await seekToEnd(page);
    await expect(stepDescription(page)).toContainText('查找失败');
  });
});
