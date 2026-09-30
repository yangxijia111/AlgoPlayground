/**
 * P12 属性测试：拓扑排序与 Prim 最小生成树的随机输入不变式。
 * - 随机 DAG（按编号只连 i→j 保证无环）：Kahn 输出是全体节点的排列，
 *   且每条边 u→v 都满足 u 排在 v 之前；含环图必然触发 cycle-detected。
 * - 随机连通图：Prim 总权重与独立参考实现一致，树边数 = V−1，树连通。
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { registerAll, getAlgorithm } from '../registry';
import { allEntries } from '../algorithms';
import type { AlgorithmInput, GraphModel } from '../registry';
import { collectSteps } from '../step/step';
import type { VizStep } from '../step/step';

registerAll(allEntries);

const NUM_RUNS = 100;

const run = (id: string, input: AlgorithmInput): VizStep[] => {
  const entry = getAlgorithm(id);
  if (!entry) throw new Error(`算法不存在：${id}`);
  return collectSteps(entry.run(input));
};

// ---------------------------------------------------------------------------
// 随机图生成器
// ---------------------------------------------------------------------------

/** 随机 DAG：n 个节点 id 依次 A..；边只允许 i→j（i<j），结构上不可能成环 */
const dagArb = (maxNodes: number) =>
  fc
    .record({
      n: fc.integer({ min: 1, max: maxNodes }),
      edgePairs: fc.array(fc.record({ i: fc.integer({ min: 0, max: maxNodes - 2 }), j: fc.integer({ min: 1, max: maxNodes - 1 }) }), {
        maxLength: 24,
      }),
    })
    .map(({ n, edgePairs }) => {
      const nodes = Array.from({ length: n }, (_, k) => ({
        id: String.fromCharCode(65 + k),
        x: 0.1 + (k * 0.8) / Math.max(1, n - 1),
        y: 0.5,
      }));
      const seen = new Set<string>();
      const edges = [];
      for (const { i, j } of edgePairs) {
        if (i >= j || i >= n || j >= n) continue; // 只保留 i<j（无环保证）
        const from = String.fromCharCode(65 + i);
        const to = String.fromCharCode(65 + j);
        const key = `${from}>${to}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ id: `e${edges.length + 1}`, from, to, directed: true, weight: 1 });
      }
      return { n, graph: { nodes, edges } as GraphModel };
    });

/** 随机连通图：先以随机树保证连通（每个 k≥1 节点连到随机前驱），再加额外随机边 */
const connectedGraphArb = (maxNodes: number) =>
  fc
    .record({
      n: fc.integer({ min: 2, max: maxNodes }),
      treeParents: fc.array(fc.integer({ min: 0, max: maxNodes - 2 }), { minLength: 0, maxLength: 11 }),
      extra: fc.array(fc.record({ i: fc.integer({ min: 0, max: maxNodes - 1 }), j: fc.integer({ min: 0, max: maxNodes - 1 }) }), {
        maxLength: 10,
      }),
      weights: fc.array(fc.integer({ min: 1, max: 99 }), { minLength: 0, maxLength: 40 }),
    })
    .map(({ n, treeParents, extra, weights }) => {
      const idOf = (k: number) => String.fromCharCode(65 + k);
      const nodes = Array.from({ length: n }, (_, k) => ({
        id: idOf(k),
        x: 0.1 + ((k * 7) % n) * (0.8 / Math.max(1, n - 1)),
        y: 0.15 + ((k * 3) % n) * (0.7 / Math.max(1, n - 1)),
      }));
      const seen = new Set<string>();
      const edges: { id: string; from: string; to: string; directed: boolean; weight: number }[] = [];
      let wi = 0;
      const nextWeight = () => weights[wi++ % Math.max(1, weights.length)] ?? 1;
      const addEdge = (a: number, b: number) => {
        if (a === b) return;
        const key = [idOf(a), idOf(b)].sort().join('-');
        if (seen.has(key)) return;
        seen.add(key);
        edges.push({ id: `e${edges.length + 1}`, from: idOf(a), to: idOf(b), directed: false, weight: nextWeight() });
      };
      // 生成树：k 连到 <k 的随机节点（parents[k-1] % k）
      for (let k = 1; k < n; k++) {
        const parent = treeParents[(k - 1) % Math.max(1, treeParents.length)] ?? 0;
        addEdge(parent % k, k);
      }
      for (const { i, j } of extra) addEdge(i % n, j % n);
      return { n, graph: { nodes, edges } as GraphModel };
    });

// ---------------------------------------------------------------------------
// 参考实现（独立于 Generator，用不同算法形态：Kruskal）
// ---------------------------------------------------------------------------

/** 并查集 */
function kruskalWeight(graph: GraphModel): number {
  const parent = new Map<string, string>();
  for (const nd of graph.nodes) parent.set(nd.id, nd.id);
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  const union = (a: string, b: string): boolean => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent.set(ra, rb);
    return true;
  };
  let total = 0;
  let count = 0;
  for (const e of [...graph.edges].sort((a, b) => a.weight - b.weight)) {
    if (union(e.from, e.to)) {
      total += e.weight;
      count++;
    }
  }
  if (count !== graph.nodes.length - 1) throw new Error('参考实现：图不连通');
  return total;
}

/** 从 Prim 步骤提取（接受序列， 树边数, 总权重）；非连通返回 null */
function primResult(steps: VizStep[]): { accepts: string[]; edgeCount: number; total: number } | null {
  const accepts: string[] = [];
  let total = 0;
  for (const s of steps) {
    if (s.semantic?.type === 'mst-accept') {
      accepts.push(s.semantic.nodeId);
      total = s.semantic.totalWeight;
    }
  }
  const lastFrameEdges = (steps[steps.length - 1]!.frame as { edges?: { state: string }[] }).edges ?? [];
  const edgeCount = lastFrameEdges.filter((e) => e.state === 'success').length;
  return accepts.length === 0 ? null : { accepts, edgeCount, total };
}

// ---------------------------------------------------------------------------
// 拓扑排序属性
// ---------------------------------------------------------------------------

describe('Property：拓扑排序（Kahn）', () => {
  it('随机 DAG：输出是全体节点的排列，且每条边 u→v 满足 u 在 v 之前', () => {
    fc.assert(
      fc.property(dagArb(12), ({ n, graph }) => {
        const steps = run('topo-sort', { type: 'graph', algorithm: 'topo-sort', graph, start: null, end: null });
        const output = steps
          .map((s) => (s.semantic?.type === 'visit-node' && s.semantic.algorithm === 'topo-sort' ? s.semantic.nodeId : null))
          .filter((x): x is string => x !== null);
        expect(new Set(output).size).toBe(output.length); // 无重复
        expect(output.length).toBe(n); // 全部输出（DAG 无环）
        const pos = new Map(output.map((id, i) => [id, i]));
        for (const e of graph.edges) {
          expect(pos.get(e.from)!, `边 ${e.from}→${e.to} 顺序`).toBeLessThan(pos.get(e.to)!);
        }
        // 全输出 ⇔ 无 cycle-detected 语义
        expect(steps.some((s) => s.semantic?.type === 'cycle-detected')).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('随机 DAG 加一条反向边成环：cycle-detected 必然出现，且输出是排列的真前缀', () => {
    fc.assert(
      fc.property(dagArb(12), ({ graph }) => {
        if (graph.nodes.length < 2 || graph.edges.length === 0) return;
        // 取一条现有边 (u→v)，加反向边 v→u 强制成环（保持边 id/去重约束）
        const e0 = graph.edges[0]!;
        const back = { id: `back${e0.id}`, from: e0.to, to: e0.from, directed: true, weight: 1 };
        if (graph.edges.length >= 24) return;
        const cyclic: GraphModel = { nodes: graph.nodes, edges: [...graph.edges, back] };
        const steps = run('topo-sort', { type: 'graph', algorithm: 'topo-sort', graph: cyclic, start: null, end: null });
        const output = steps
          .map((s) => (s.semantic?.type === 'visit-node' && s.semantic.algorithm === 'topo-sort' ? s.semantic.nodeId : null))
          .filter((x): x is string => x !== null);
        expect(output.length).toBeLessThan(cyclic.nodes.length); // 未全部输出
        expect(steps.some((s) => s.semantic?.type === 'cycle-detected')).toBe(true);
        expect(new Set(output).size).toBe(output.length);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Prim 属性
// ---------------------------------------------------------------------------

describe('Property：Prim 最小生成树', () => {
  it('随机连通图：总权重 = Kruskal 参考实现，树边数 = V−1，起点在树中', () => {
    fc.assert(
      fc.property(connectedGraphArb(10), ({ graph }) => {
        const start = graph.nodes[0]!.id;
        const steps = run('prim', { type: 'graph', algorithm: 'prim', graph, start, end: null });
        const result = primResult(steps);
        expect(result).not.toBeNull();
        const expected = kruskalWeight(graph);
        expect(result!.total, `Prim=${result!.total} Kruskal=${expected}`).toBe(expected);
        expect(result!.accepts).toHaveLength(graph.nodes.length - 1);
        expect(result!.accepts).not.toContain(start);
        expect(result!.edgeCount).toBe(graph.nodes.length - 1);
        // 接受序列无重复
        expect(new Set(result!.accepts).size).toBe(result!.accepts.length);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
