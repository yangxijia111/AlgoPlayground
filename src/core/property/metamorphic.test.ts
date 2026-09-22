/**
 * Metamorphic + Cross-Layer Contract 测试（CROSS_LAYER_TEST_SPEC §2.2/§4）：
 * - Contract：全部注册条目 defaultInput → validate → run → share roundtrip → rerun 确定性
 * - Metamorphic：排序等价性/二分步数/BFS 可达集/Dijkstra 三角不等式/BST 中序/N 皇后解数/fib DP
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { registerAll, allAlgorithms, getAlgorithm } from '../registry';
import { allEntries } from '../algorithms';
import type { AlgorithmInput, GraphInput, GraphModel } from '../registry';
import { collectSteps } from '../step/step';
import type { VizStep } from '../step/step';
import { isArrayFrame, isGraphFrame } from '../step/frame';
import { buildTree, inOrderValues } from '../algorithms/tree/model';
import { buildShareQuery, parseShareQuery } from '../share/url';

registerAll(allEntries);

// ---------------------------------------------------------------------------
// Cross-Layer Algorithm Contract（全部条目统一契约）
// ---------------------------------------------------------------------------

describe('Cross-Layer Algorithm Contract', () => {
  it('全部注册条目：defaultInput → validate ✓ → run 产出步骤 → share roundtrip 深等 → rerun 确定性', () => {
    for (const entry of allAlgorithms()) {
      const id = entry.meta.id;
      // 1. 默认输入自校验通过
      expect(entry.validate(entry.defaultInput), `${id}: 默认输入未通过 validate`).toBeNull();
      // 2. run 产出非空步骤
      const steps = collectSteps(entry.run(entry.defaultInput));
      expect(steps.length, `${id}: 步骤为空`).toBeGreaterThan(0);
      // 3. share v2 roundtrip 深等（算法 identity 不变、输入语义等价）
      const q = buildShareQuery(entry.defaultInput, { algorithmId: id });
      const parsed = parseShareQuery(entry.defaultInput.type, q, { algorithmId: id });
      expect(parsed, `${id}: share roundtrip 失败`).not.toBeNull();
      expect(parsed!.input, `${id}: roundtrip 输入不深等`).toEqual(entry.defaultInput);
      expect(parsed!.input.type, `${id}: 算法 identity 变化`).toBe(entry.defaultInput.type);
      // 4. rerun 确定性（同一输入步骤序列完全一致）
      const rerun = collectSteps(entry.run(entry.defaultInput));
      expect(rerun.map((s) => s.description), `${id}: rerun 不确定`).toEqual(steps.map((s) => s.description));
      expect(rerun.map((s) => s.semantic ?? null), `${id}: rerun semantic 不确定`).toEqual(steps.map((s) => s.semantic ?? null));
    }
  });
});

// ---------------------------------------------------------------------------
// Metamorphic：排序
// ---------------------------------------------------------------------------

describe('Metamorphic：排序', () => {
  const sortIds = ['bubble-sort', 'selection-sort', 'insertion-sort', 'merge-sort', 'quick-sort', 'heap-sort'] as const;
  const finalArray = (steps: VizStep[]): number[] => {
    const last = steps[steps.length - 1];
    if (!last || !isArrayFrame(last.frame)) throw new Error('非数组帧');
    return [...last.frame.values];
  };

  it('sort(A) === [...A].sort(asc)（随机 30 组）', () => {
    const arb = fc.array(fc.integer({ min: -99, max: 999 }), { minLength: 1, maxLength: 40 });
    fc.assert(
      fc.property(arb, (arr) => {
        for (const id of sortIds) {
          const steps = collectSteps(getAlgorithm(id)!.run({ type: 'sort', array: arr }));
          expect(finalArray(steps), id).toEqual([...arr].sort((a, b) => a - b));
        }
      }),
      { numRuns: 30 },
    );
  });

  it('sort(A) ≡ sort(shuffle(A)) ≡ sort(reverse(A))（终态相等；随机 15 组）', () => {
    const arb = fc.array(fc.integer({ min: -99, max: 999 }), { minLength: 2, maxLength: 25 });
    fc.assert(
      fc.property(arb, fc.integer({ min: 1, max: 1 << 30 }), (arr0, seed) => {
        let s = seed >>> 0;
        const rand = () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 4294967296;
        };
        const shuffled = [...arr0];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
        }
        const reversed = [...arr0].reverse();
        for (const id of ['bubble-sort', 'merge-sort'] as const) {
          const a = finalArray(collectSteps(getAlgorithm(id)!.run({ type: 'sort', array: arr0 })));
          const b = finalArray(collectSteps(getAlgorithm(id)!.run({ type: 'sort', array: shuffled })));
          const c = finalArray(collectSteps(getAlgorithm(id)!.run({ type: 'sort', array: reversed })));
          expect(b, id).toEqual(a);
          expect(c, id).toEqual(a);
        }
      }),
      { numRuns: 15 },
    );
  });

  it('同一输入的 counters 确定且单调不减', () => {
    const arr = [5, 2, 8, 1, 9, 3];
    for (const id of sortIds) {
      const steps = collectSteps(getAlgorithm(id)!.run({ type: 'sort', array: arr }));
      let prev: Record<string, number> = {};
      for (const s of steps) {
        for (const [k, v] of Object.entries(s.counters)) {
          expect(v, `${id} counter ${k} 减少`).toBeGreaterThanOrEqual(prev[k] ?? 0);
        }
        prev = { ...s.counters };
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Metamorphic：搜索
// ---------------------------------------------------------------------------

describe('Metamorphic：搜索', () => {
  it('线性查找：target ∈ A → found 下标的值 = target；target ∉ A → not-found 语义存在', () => {
    const arr = [3, 1, 4, 1, 5, 9, 2, 6];
    for (const t of arr) {
      const steps = collectSteps(getAlgorithm('linear-search')!.run({ type: 'search', variant: 'linear', array: arr, target: t }));
      const foundStep = steps.find((s) => s.semantic?.type === 'found');
      expect(foundStep, `target=${t}`).toBeDefined();
      if (foundStep?.semantic?.type === 'found') expect(arr[foundStep.semantic.index]).toBe(t);
    }
    const steps = collectSteps(getAlgorithm('linear-search')!.run({ type: 'search', variant: 'linear', array: arr, target: 99 }));
    expect(steps.some((s) => s.semantic?.type === 'not-found')).toBe(true);
  });

  it('二分查找：步数受 O(log n) 约束（range 收缩），命中值正确', () => {
    const arb = fc.uniqueArray(fc.integer({ min: 0, max: 999 }), { minLength: 2, maxLength: 60 });
    fc.assert(
      fc.property(arb, (raw) => {
        const arr = [...raw].sort((a, b) => a - b);
        const t = arr[Math.floor(arr.length / 2)]!;
        const steps = collectSteps(getAlgorithm('binary-search')!.run({ type: 'search', variant: 'binary', array: arr, target: t }));
        const midSteps = steps.filter((s) => s.semantic?.type === 'compare').length;
        expect(midSteps, `n=${arr.length}`).toBeLessThanOrEqual(Math.ceil(Math.log2(arr.length)) + 2);
        const found = steps.find((s) => s.semantic?.type === 'found');
        expect(found).toBeDefined();
        if (found?.semantic?.type === 'found') expect(arr[found.semantic.index]).toBe(t);
      }),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// Metamorphic：图
// ---------------------------------------------------------------------------

/** 独立 DFS 参考实现：从 start 可达的节点集合 */
function reachableSet(graph: GraphModel, start: string): Set<string> {
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const u = stack.pop()!;
    for (const e of graph.edges) {
      let v: string | null = null;
      if (e.from === u) v = e.to;
      else if (!e.directed && e.to === u) v = e.from;
      if (v !== null && !seen.has(v)) {
        seen.add(v);
        stack.push(v);
      }
    }
  }
  return seen;
}

function makeGraph(n: number, edgeSeed: number): GraphInput {
  let s = edgeSeed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const nodes = Array.from({ length: n }, (_, i) => ({ id: `N${i}`, x: rand(), y: rand() }));
  const edges: GraphModel['edges'] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const a = nodes[i]!.id;
    const b = nodes[(i + 1) % n]!.id;
    if (a !== b && !seen.has(`${a}>${b}`)) {
      seen.add(`${a}>${b}`);
      seen.add(`${b}>${a}`);
      edges.push({ id: `e${edges.length}`, from: a, to: b, directed: false, weight: 1 + Math.floor(rand() * 9) });
    }
  }
  return { type: 'graph', algorithm: 'bfs', graph: { nodes, edges }, start: nodes[0]!.id, end: null };
}

describe('Metamorphic：图', () => {
  it('BFS visited 集合 === 从 start 可达集合（随机图）', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 12 }), fc.integer({ min: 0, max: 1 << 30 }), (n, seed) => {
        const input = makeGraph(n, seed);
        const steps = collectSteps(getAlgorithm('bfs')!.run(input));
        const visited = new Set(
          steps.filter((s) => s.semantic?.type === 'visit-node').map((s) => (s.semantic as { nodeId: string }).nodeId),
        );
        expect([...visited].sort()).toEqual([...reachableSet(input.graph, input.start!)].sort());
      }),
      { numRuns: 30 },
    );
  });

  it('Dijkstra：终态所有可达边满足三角不等式 dist[v] ≤ dist[u] + w(u,v)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), fc.integer({ min: 0, max: 1 << 30 }), (n, seed) => {
        const input: GraphInput = { ...makeGraph(n, seed), algorithm: 'dijkstra' };
        const steps = collectSteps(getAlgorithm('dijkstra')!.run(input));
        const last = steps[steps.length - 1];
        if (!last || !isGraphFrame(last.frame)) throw new Error('非图帧');
        const dist = new Map(last.frame.nodes.map((nd) => [nd.id, nd.distance]));
        expect(dist.get(input.start!)).toBe(0);
        for (const e of input.graph.edges) {
          const du = dist.get(e.from) ?? null;
          const dv = dist.get(e.to) ?? null;
          if (du === null || dv === null) continue; // 不可达
          expect(dv, `边 ${e.from}->${e.to}: dist[${e.to}]=${dv} > dist[${e.from}]+w=${du + e.weight}`).toBeLessThanOrEqual(du + e.weight);
          if (!e.directed) {
            expect(du, `边 ${e.to}->${e.from}（无向）`).toBeLessThanOrEqual(dv + e.weight);
          }
        }
        // relax semantic 总数 = dist 更新次数 ≥ 1（可达多节点时）
      }),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// Metamorphic：BST / N 皇后 / fib DP
// ---------------------------------------------------------------------------

describe('Metamorphic：BST / N 皇后 / DP', () => {
  it('任意随机序列 build：中序 === sorted(去重集合)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -99, max: 999 }), { minLength: 1, maxLength: 25 }), (seq) => {
        const { root } = buildTree(seq);
        expect(inOrderValues(root)).toEqual([...new Set(seq)].sort((a, b) => a - b));
      }),
      { numRuns: 30 },
    );
  });

  it('N 皇后解数与已知基准一致（n=4..8）', () => {
    const known: Record<number, number> = { 4: 2, 5: 10, 6: 4, 7: 40, 8: 92 };
    for (const [nStr, expected] of Object.entries(known)) {
      const n = Number(nStr);
      const steps = collectSteps(getAlgorithm('n-queens')!.run({ type: 'nqueens', n }));
      const found = steps.filter((s) => s.semantic?.type === 'solution-found').length;
      expect(found, `n=${n}`).toBe(expected);
      // 每个解独立校验：行列对角互不攻击
      for (const s of steps) {
        if (s.semantic?.type !== 'solution-found') continue;
        const sol = s.semantic.solution;
        for (let r1 = 0; r1 < sol.length; r1++) {
          for (let r2 = r1 + 1; r2 < sol.length; r2++) {
            expect(sol[r1], `n=${n} 同列冲突`).not.toBe(sol[r2]);
            expect(Math.abs(r1 - r2), `n=${n} 对角冲突`).not.toBe(Math.abs(sol[r1]! - sol[r2]!));
          }
        }
      }
    }
  });

  it('fib-dp 终值 === 朴素递归参考', () => {
    const fibRef = (k: number): number => (k <= 2 ? 1 : fibRef(k - 1) + fibRef(k - 2));
    for (let n = 1; n <= 12; n++) {
      const steps = collectSteps(getAlgorithm('fib-dp')!.run({ type: 'dp', kind: 'fibonacci', n }));
      const fills = steps.filter((s) => s.semantic?.type === 'dp-fill');
      const last = fills[fills.length - 1];
      expect(last?.semantic && last.semantic.type === 'dp-fill' ? last.semantic.value : NaN).toBe(fibRef(n));
    }
  });
});

// ---------------------------------------------------------------------------
// Share 与算法 identity（跨层组合）
// ---------------------------------------------------------------------------

describe('跨层组合：share → run 一致', () => {
  it('share decode 后的输入与原输入运行结果完全一致（每条目）', () => {
    for (const entry of allAlgorithms()) {
      const id = entry.meta.id;
      const q = buildShareQuery(entry.defaultInput, { algorithmId: id });
      const parsed = parseShareQuery(entry.defaultInput.type, q, { algorithmId: id });
      const original = collectSteps(entry.run(entry.defaultInput));
      const fromShare = collectSteps(entry.run(parsed!.input as AlgorithmInput));
      expect(fromShare.map((s) => s.description), id).toEqual(original.map((s) => s.description));
      expect(fromShare.map((s) => s.counters), id).toEqual(original.map((s) => s.counters));
    }
  });
});
