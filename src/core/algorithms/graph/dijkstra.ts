/**
 * Dijkstra 最短路径（简单 O(V²) 选择版），支持可选终点提前结束与路径回溯。
 */
import type { GraphInput } from '../../registry';
import { makeGraphEmit, outNeighbors } from './common';
import type { ElementState } from '../../step/frame';
import type { VizStep } from '../../step/step';

/** Dijkstra 伪代码：
 * 0  procedure dijkstra(G, s)
 * 1    dist[s] ← 0，其余 dist ← ∞
 * 2    while 存在未确定节点 do
 * 3      u ← 未确定节点中 dist 最小者
 * 4      将 u 标记为已确定
 * 5      for 每条出边 (u, v, w) do
 * 6        if dist[u] + w < dist[v] then
 * 7          dist[v] ← dist[u]+w；pred[v] ← u   // 松弛
 * 8  end procedure
 */
export function* dijkstraGen(input: GraphInput): Generator<VizStep, void, void> {
  const graph = input.graph;
  const start = input.start!;
  const end = input.end;
  const ctx = {
    dist: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, number | null>,
    pred: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, string | null>,
    counters: { visits: 0, comparisons: 0 },
  };
  const emit = makeGraphEmit(graph, 'dijkstra', ctx);
  const determined = new Set<string>();
  ctx.dist[start] = 0;

  /** 未确定集按 dist 升序（null/∞ 在最后），作为 frontier 展示 */
  const pending = (): string[] =>
    graph.nodes
      .filter((n) => !determined.has(n.id))
      .sort((a, b) => {
        const da = ctx.dist[a.id];
        const db = ctx.dist[b.id];
        if (da === null && db === null) return a.id.localeCompare(b.id);
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db || a.id.localeCompare(b.id);
      })
      .map((n) => n.id);

  const frontierOf = (ids: string[]): { id: string; state: ElementState }[] =>
    ids.map((id) => ({ id, state: 'special' as ElementState }));

  yield emit(
    { [start]: 'special' },
    null,
    frontierOf(pending()),
    'set',
    new Set(),
    new Set(),
    `初始：dist[${start}]=0，其余节点为 ∞（灰色为未确定集，按距离升序）`,
    [1],
  );

  while (true) {
    const cand = pending();
    const u = cand[0];
    if (u === undefined) break;
    const du = ctx.dist[u];
    if (du === null) {
      yield emit({}, null, [], 'none', new Set(), new Set(), '剩余节点均不可达，算法结束', [2]);
      break;
    }
    determined.add(u);
    ctx.counters.visits++;
    yield emit(
      { [u]: 'active' },
      u,
      frontierOf(cand.slice(1)),
      'set',
      new Set(),
      new Set(),
      `选取未确定集中距离最小的节点 ${u}（dist=${du}），将其标记为已确定`,
      [3, 4],
    );
    if (end !== null && u === end) {
      // 提前结束：回溯路径
      const path: string[] = [];
      let cur: string | null = end;
      while (cur !== null) {
        path.unshift(cur);
        cur = ctx.pred[cur];
      }
      const okEdges = new Set<string>();
      for (let i = 1; i < path.length; i++) {
        const edge = graph.edges.find(
          (e) => (e.from === path[i - 1] && e.to === path[i]) || (!e.directed && e.from === path[i] && e.to === path[i - 1]),
        );
        if (edge) okEdges.add(edge.id);
      }
      const okStates: Record<string, ElementState> = {};
      for (const p of path) okStates[p] = 'success';
      yield emit(
        okStates,
        null,
        [],
        'none',
        new Set(),
        okEdges,
        `终点 ${end} 已确定，提前结束：最短路径 [ ${path.join(' → ')} ]，长度 ${ctx.dist[end]}`,
        [2],
      );
      return;
    }
    for (const nb of outNeighbors(graph, u)) {
      ctx.counters.comparisons++;
      const base = ctx.dist[u] ?? 0;
      const candidate = base + nb.weight;
      const dv = ctx.dist[nb.to];
      if (determined.has(nb.to)) continue;
      const activeEdges = new Set([nb.edgeId]);
      if (dv === null || candidate < dv) {
        ctx.dist[nb.to] = candidate;
        ctx.pred[nb.to] = u;
        yield emit(
          { [u]: 'active', [nb.to]: 'special' },
          u,
          frontierOf(pending()),
          'set',
          activeEdges,
          new Set(),
          `松弛边 ${u}→${nb.to}（w=${nb.weight}）：dist[${u}]+${nb.weight}=${candidate} < ${dv === null ? '∞' : dv}，更新 dist[${nb.to}]=${candidate}，pred[${nb.to}]=${u}`,
          [5, 6, 7],
        );
      } else {
        yield emit(
          { [u]: 'active' },
          u,
          frontierOf(pending()),
          'set',
          activeEdges,
          new Set(),
          `考察边 ${u}→${nb.to}（w=${nb.weight}）：dist[${u}]+${nb.weight}=${candidate} ≥ dist[${nb.to}]=${dv}，不更新`,
          [5, 6],
        );
      }
    }
  }

  const okStates: Record<string, ElementState> = {};
  for (const d of determined) okStates[d] = 'success';
  const distText = graph.nodes.map((n) => `${n.id}:${ctx.dist[n.id] === null ? '∞' : ctx.dist[n.id]}`).join(', ');
  yield emit(okStates, null, [], 'none', new Set(), new Set(), `Dijkstra 完成：各节点最短距离 → ${distText}`, [2]);
}
