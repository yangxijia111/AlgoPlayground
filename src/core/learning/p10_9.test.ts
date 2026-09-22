/**
 * P10-9 测试：递归树布局/数据、DP 转移数据、复杂度核心。
 */
import { describe, expect, it } from 'vitest';
import { allEntries } from '../algorithms';
import { getAlgorithm, registerAll } from '../registry';
import { collectSteps } from '../step/step';
import { isRecursionFrame, isDPFrame } from '../step/frame';
import { layoutRecursionTree } from '../../ui/components/frames/RecursionView';
import { ALGO_COMPLEXITY, COMPLEXITY_KINDS, opTable, sampleCurves } from './complexity';

registerAll(allEntries);

describe('递归树（fibonacci）', () => {
  function fibSteps(n: number) {
    const entry = getAlgorithm('fibonacci-recursion')!;
    return collectSteps(entry.run({ type: 'recursion', kind: 'fibonacci', n }));
  }

  it('每个步骤都携带递归树数据，最终节点数 = 2·fib(n)−1', () => {
    const steps = fibSteps(6);
    // 首步（初始态、树为空）不携带 tree；此后每步都携带
    for (let i = 1; i < steps.length; i++) {
      const s = steps[i]!;
      expect(isRecursionFrame(s.frame)).toBe(true);
      if (isRecursionFrame(s.frame)) {
        expect(s.frame.tree, `step ${i}`).toBeDefined();
        expect(s.frame.tree!.nodes.length).toBeGreaterThan(0);
      }
    }
    // fib(6)=8 → 节点 2*8-1=15
    const last = steps[steps.length - 1]!;
    if (isRecursionFrame(last.frame)) {
      expect(last.frame.tree!.nodes).toHaveLength(15);
    }
  });

  it('树结构正确：唯一根、parent 关系与调用层级一致、状态最终全部 returned', () => {
    const steps = fibSteps(6);
    const last = steps[steps.length - 1]!;
    if (!isRecursionFrame(last.frame)) throw new Error('not recursion');
    const nodes = last.frame.tree!.nodes;
    const roots = nodes.filter((n) => n.parent === null);
    expect(roots).toHaveLength(1);
    const ids = new Set(nodes.map((n) => n.id));
    for (const n of nodes) {
      if (n.parent !== null) expect(ids.has(n.parent)).toBe(true);
    }
    expect(nodes.every((n) => n.state === 'returned')).toBe(true);
    const root = roots[0]!;
    expect(root.label).toBe('fib(6)');
    expect(root.returnValue).toBe('8');
  });

  it('布局：根在顶部居中，深度越大 y 越大，叶子均布', () => {
    const steps = fibSteps(6);
    const last = steps[steps.length - 1]!;
    if (!isRecursionFrame(last.frame)) throw new Error('not recursion');
    const pos = layoutRecursionTree(last.frame.tree!.nodes);
    const root = last.frame.tree!.nodes.find((n) => n.parent === null)!;
    const leaves = last.frame.tree!.nodes.filter((n) => !(last.frame as RecursionFrameLike).tree!.nodes.some((m) => m.parent === n.id));
    expect(pos.size).toBe(last.frame.tree!.nodes.length);
    const rp = pos.get(root.id)!;
    expect(rp.y).toBe(0);
    // 叶子 x 均匀分布（间隔 1/totalLeaf）
    const leafXs = leaves.map((l) => pos.get(l.id)!.x).sort((a, b) => a - b);
    const gap = leafXs[1]! - leafXs[0]!;
    for (let i = 2; i < leafXs.length; i++) {
      expect(Math.abs(leafXs[i]! - leafXs[i - 1]! - gap)).toBeLessThan(1e-9);
    }
  });
});

type RecursionFrameLike = { tree: { nodes: { id: string; parent: string | null }[] } };

describe('DP 转移数据', () => {
  it('fib-dp 填格步携带公式与候选', () => {
    const entry = getAlgorithm('fib-dp')!;
    const steps = collectSteps(entry.run({ type: 'dp', kind: 'fibonacci', n: 5 }));
    const fill = steps.find((s) => isDPFrame(s.frame) && s.frame.transition);
    expect(fill).toBeTruthy();
    if (isDPFrame(fill!.frame)) {
      expect(fill!.frame.transition!.formula).toContain('dp[i-1]');
      expect(fill!.frame.transition!.candidates.length).toBe(2);
      expect(fill!.frame.transition!.chosen.length).toBeGreaterThan(0);
    }
  });

  it('knapsack 填格步携带选/不选候选与选择原因', () => {
    const entry = getAlgorithm('knapsack')!;
    const steps = collectSteps(entry.run({
      type: 'dp',
      kind: 'knapsack',
      items: [{ name: 'A', weight: 2, value: 3 }],
      capacity: 3,
    }));
    const fills = steps.filter((s) => isDPFrame(s.frame) && s.frame.transition);
    expect(fills.length).toBeGreaterThan(0);
    const withTake = fills.find((s) => isDPFrame(s.frame) && s.frame.transition!.candidates.length === 2);
    expect(withTake).toBeTruthy();
  });
});

describe('复杂度核心', () => {
  it('六类增长函数单调且量级正确', () => {
    expect(COMPLEXITY_KINDS).toHaveLength(6);
    for (const k of COMPLEXITY_KINDS) {
      expect(k.fn(1)).toBeLessThanOrEqual(k.fn(16));
      expect(k.fn(16)).toBeLessThanOrEqual(k.fn(256));
    }
    expect(COMPLEXITY_KINDS.find((k) => k.id === 'log')!.fn(1024)).toBeCloseTo(10);
    expect(COMPLEXITY_KINDS.find((k) => k.id === 'linear')!.fn(50)).toBe(50);
  });

  it('采样曲线与操作数表结构完整', () => {
    const curves = sampleCurves(64, 10);
    expect(curves).toHaveLength(10);
    for (const c of curves) expect(Object.keys(c.values)).toHaveLength(6);
    const table = opTable(64);
    expect(table.length).toBeGreaterThan(3);
    expect(table[0]!.n).toBe(1);
  });

  it('复杂度映射引用的算法真实存在且覆盖 6 排序 + 2 搜索', () => {
    const ids = ALGO_COMPLEXITY.map((r) => r.algorithmId);
    for (const id of ids) expect(getAlgorithm(id)).toBeDefined();
    for (const must of ['bubble-sort', 'selection-sort', 'insertion-sort', 'merge-sort', 'quick-sort', 'heap-sort', 'linear-search', 'binary-search']) {
      expect(ids).toContain(must);
    }
    // 快排三档区分
    const quick = ALGO_COMPLEXITY.find((r) => r.algorithmId === 'quick-sort')!;
    expect(quick.best).toBe('O(n log n)');
    expect(quick.worst).toBe('O(n²)');
  });

  it('全部注册条目默认输入仍可运行（扩展字段向后兼容）', () => {
    for (const entry of allEntries) {
      const steps = collectSteps(entry.run(entry.defaultInput));
      expect(steps.length).toBeGreaterThan(0);
    }
  });
});
