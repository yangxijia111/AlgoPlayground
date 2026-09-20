/**
 * BST 与遍历测试（TEST_PLAN T1.4）。
 */
import { describe, expect, it } from 'vitest';
import { collectSteps } from '../../step/step';
import { checkStepIntegrity } from '../../step/integrity';
import type { BSTInput } from '../../registry';
import { buildTree, findNode, inOrderValues, removeNode, countNodes } from './model';
import { layoutTree } from './layout';
import entries from './index';

const GOLDEN = [8, 3, 10, 1, 6, 14, 4, 7, 13];

function runBst(startTree: number[], operation: BSTInput['operation']) {
  const entry = entries.find((e) => e.meta.id === 'bst-operations');
  if (!entry) throw new Error('bst-operations 未注册');
  return collectSteps(entry.run({ type: 'bst', startTree, operation }));
}

function runTraversal(startTree: number[], order: 'pre' | 'in' | 'post' | 'level') {
  const entry = entries.find((e) => e.meta.id === 'tree-traversal');
  if (!entry) throw new Error('tree-traversal 未注册');
  return collectSteps(entry.run({ type: 'bst', startTree, operation: { op: 'traverse', order } }));
}

/** 从遍历步骤帧中提取最终输出序列 */
function finalOutput(steps: ReturnType<typeof runTraversal>): number[] {
  const f = steps[steps.length - 1].frame;
  if (f.kind !== 'tree') throw new Error('帧类型错误');
  return f.output.map(Number);
}

describe('BST 模型', () => {
  it('插入后中序序列为升序', () => {
    const { root } = buildTree(GOLDEN);
    expect(inOrderValues(root)).toEqual([...GOLDEN].sort((a, b) => a - b));
  });

  it('重复值构建时被忽略（首个生效）', () => {
    const { root, inserted } = buildTree([5, 5, 3, 5]);
    expect(inserted).toBe(2);
    expect(inOrderValues(root)).toEqual([3, 5]);
  });

  it('查找命中与未命中', () => {
    const { root } = buildTree(GOLDEN);
    expect(findNode(root, 7)?.value).toBe(7);
    expect(findNode(root, 99)).toBeNull();
  });

  it('删除叶子', () => {
    const { root } = buildTree(GOLDEN);
    const after = removeNode(root, 1);
    expect(inOrderValues(after)).toEqual([3, 4, 6, 7, 8, 10, 13, 14]);
  });

  it('删除单孩子节点', () => {
    const { root } = buildTree([8, 3, 1]);
    // 3 只有左孩子 1
    const after = removeNode(root, 3);
    expect(inOrderValues(after)).toEqual([1, 8]);
  });

  it('删除双子节点（含删根）', () => {
    const { root } = buildTree(GOLDEN);
    // 删除根 8（双子）：后继 10 顶替
    const after = removeNode(root, 8);
    expect(inOrderValues(after)).toEqual([1, 3, 4, 6, 7, 10, 13, 14]);
    expect(findNode(after, 8)).toBeNull();
    expect(after?.value).toBe(10);
  });

  it('删除不存在的值返回等价树', () => {
    const { root } = buildTree(GOLDEN);
    const after = removeNode(root, 99);
    expect(inOrderValues(after)).toEqual(inOrderValues(root));
  });

  it('countNodes 正确', () => {
    const { root } = buildTree(GOLDEN);
    expect(countNodes(root)).toBe(GOLDEN.length);
  });
});

describe('树布局', () => {
  it('坐标在 [0,1] 内且无重叠（中序序号唯一）', () => {
    const { root } = buildTree(GOLDEN);
    const layout = layoutTree(root);
    expect(layout.nodes).toHaveLength(GOLDEN.length);
    const seen = new Set<string>();
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThanOrEqual(1);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThanOrEqual(1);
      seen.add(`${n.x},${n.y}`);
    }
    expect(seen.size).toBe(layout.nodes.length);
  });

  it('边数 = 节点数 - 1', () => {
    const { root } = buildTree(GOLDEN);
    const layout = layoutTree(root);
    expect(layout.edges).toHaveLength(GOLDEN.length - 1);
  });

  it('空树布局为空', () => {
    expect(layoutTree(null)).toEqual({ nodes: [], edges: [] });
  });
});

describe('BST 操作生成器', () => {
  it('insert：最终中序有序且包含新值', () => {
    const steps = runBst(GOLDEN, { op: 'insert', value: 5 });
    const f = steps[steps.length - 1].frame;
    if (f.kind !== 'tree') throw new Error('帧类型错误');
    expect(f.nodes.map((n) => n.value).sort((a, b) => a - b)).toEqual([...GOLDEN, 5].sort((a, b) => a - b));
  });

  it('insert：重复值被拒绝且树不变', () => {
    const steps = runBst(GOLDEN, { op: 'insert', value: 3 });
    const last = steps[steps.length - 1];
    expect(last.description).toContain('拒绝');
    expect(last.frame.kind === 'tree' && last.frame.nodes.length).toBe(GOLDEN.length);
  });

  it('search：命中/未命中', () => {
    const hit = runBst(GOLDEN, { op: 'search', value: 6 });
    expect(hit[hit.length - 1].description).toContain('成功');
    const miss = runBst(GOLDEN, { op: 'search', value: 99 });
    expect(miss[miss.length - 1].description).toContain('失败');
  });

  it('delete：三种情形后中序仍升序且少一元素', () => {
    for (const victim of [1, 14, 8, 3]) {
      const tree = [...GOLDEN];
      const steps = runBst(tree, { op: 'delete', value: victim });
      const f = steps[steps.length - 1].frame;
      if (f.kind !== 'tree') throw new Error('帧类型错误');
      const vals = f.nodes.map((n) => n.value);
      expect(vals).toHaveLength(tree.length - 1);
      expect(vals.sort((a, b) => a - b)).toEqual(tree.filter((v) => v !== victim).sort((a, b) => a - b));
    }
  });

  it('delete：删除后继替换场景的最终形态正确（金标准）', () => {
    // 树 [50,30,70,20,40,60,80]，删 30（双子）：后继 40 顶替
    const steps = runBst([50, 30, 70, 20, 40, 60, 80], { op: 'delete', value: 30 });
    const f = steps[steps.length - 1].frame;
    if (f.kind !== 'tree') throw new Error('帧类型错误');
    expect(f.nodes.map((n) => n.value).sort((a, b) => a - b)).toEqual([20, 40, 50, 60, 70, 80]);
  });

  it('空树插入/搜索/删除均不崩溃且有解释', () => {
    expect(runBst([], { op: 'insert', value: 5 }).length).toBeGreaterThanOrEqual(2);
    expect(runBst([], { op: 'search', value: 5 }).length).toBeGreaterThanOrEqual(2);
    expect(runBst([], { op: 'delete', value: 5 }).length).toBeGreaterThanOrEqual(2);
  });

  it('build：从空树逐步构建并跳过重复值', () => {
    const steps = runBst([], { op: 'build', values: [5, 3, 5, 8] });
    const f = steps[steps.length - 1].frame;
    if (f.kind !== 'tree') throw new Error('帧类型错误');
    expect(f.nodes.map((n) => n.value).sort((a, b) => a - b)).toEqual([3, 5, 8]);
  });

  it('步骤完整性（全部操作）', () => {
    const entry = entries.find((e) => e.meta.id === 'bst-operations');
    const len = entry?.meta.pseudocode.length ?? 0;
    expect(checkStepIntegrity(runBst(GOLDEN, { op: 'insert', value: 5 }), len)).toEqual([]);
    expect(checkStepIntegrity(runBst(GOLDEN, { op: 'search', value: 13 }), len)).toEqual([]);
    expect(checkStepIntegrity(runBst(GOLDEN, { op: 'delete', value: 8 }), len)).toEqual([]);
    expect(checkStepIntegrity(runBst([], { op: 'build', values: [5, 3, 8] }), len)).toEqual([]);
  });
});

describe('四种遍历', () => {
  const TREE = [8, 3, 10, 1, 6, 14, 4, 7, 13];

  it('前序：根左右（金标准）', () => {
    expect(finalOutput(runTraversal(TREE, 'pre'))).toEqual([8, 3, 1, 6, 4, 7, 10, 14, 13]);
  });

  it('中序：左根右（升序）', () => {
    expect(finalOutput(runTraversal(TREE, 'in'))).toEqual([...TREE].sort((a, b) => a - b));
  });

  it('后序：左右根（金标准）', () => {
    expect(finalOutput(runTraversal(TREE, 'post'))).toEqual([1, 4, 7, 6, 3, 13, 14, 10, 8]);
  });

  it('层序：逐层（金标准）', () => {
    expect(finalOutput(runTraversal(TREE, 'level'))).toEqual([8, 3, 10, 1, 6, 14, 4, 7, 13]);
  });

  it('空树遍历安全', () => {
    for (const order of ['pre', 'in', 'post', 'level'] as const) {
      const steps = runTraversal([], order);
      expect(steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('输出随步骤逐步增长', () => {
    const steps = runTraversal(TREE, 'in');
    const outputs = steps.map((s) => (s.frame.kind === 'tree' ? s.frame.output.length : 0));
    for (let i = 1; i < outputs.length; i++) {
      expect(outputs[i]).toBeGreaterThanOrEqual(outputs[i - 1]);
    }
  });

  it('步骤完整性（四种序）', () => {
    const entry = entries.find((e) => e.meta.id === 'tree-traversal');
    const len = entry?.meta.pseudocode.length ?? 0;
    for (const order of ['pre', 'in', 'post', 'level'] as const) {
      expect(checkStepIntegrity(runTraversal(TREE, order), len)).toEqual([]);
    }
  });
});

describe('BST 输入校验', () => {
  const entry = entries.find((e) => e.meta.id === 'bst-operations');
  it('重复值插入被拒绝', () => {
    expect(entry?.validate({ type: 'bst', startTree: [5, 3], operation: { op: 'insert', value: 5 } })).toContain('已存在');
  });
  it('删除不存在的值被拒绝', () => {
    expect(entry?.validate({ type: 'bst', startTree: [5], operation: { op: 'delete', value: 9 } })).toContain('不存在');
  });
  it('节点数超限被拒绝', () => {
    const big = Array.from({ length: 32 }, (_, i) => i + 1);
    expect(entry?.validate({ type: 'bst', startTree: big, operation: { op: 'traverse', order: 'in' } })).toContain('31');
  });
});
