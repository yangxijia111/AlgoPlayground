/**
 * Prim 最小生成树：从起点开始，每轮从「树 → 非树」的割边中选权重最小者生长。
 * 徽标（distance 字段）复用为「key = 连入树的最小边权」；predecessor 显示连入边来源。
 * 与 Dijkstra 的关键区别：key 不做路径累加，只看这一条边本身的权重。
 */
import type { GraphInput } from '../../registry';
import { makeGraphEmit, outNeighbors } from './common';
import type { ElementState } from '../../step/frame';
import type { VizStep } from '../../step/step';

/** prim 伪代码：
 * 0  procedure prim(G, s)
 * 1    树 ← {s}；key[s]=0，其余 key ← ∞
 * 2    while 还有未入树节点 do
 * 3      u ← 割边（树→非树）中权重最小者对应的节点（平局按字母序）
 * 4      把 u 连入树（选中那条最小割边）
 * 5      for v ∈ u 的未入树邻居 do
 * 6        if w(u,v) < key[v] then key[v] ← w(u,v)；parent[v] ← u
 * 7  end procedure
 */
export function* primGen(input: GraphInput): Generator<VizStep, void, void> {
  const graph = input.graph;
  const start = input.start!;
  const ctx = {
    dist: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, number | null>,
    pred: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, string | null>,
    counters: { visits: 0, comparisons: 0 },
  };
  const emit = makeGraphEmit(graph, 'prim', ctx);
  ctx.dist[start] = 0;

  const inTree = new Set<string>([start]);
  const treeEdges = new Set<string>();
  let totalWeight = 0;

  /** 未入树节点按 key 升序（null=∞ 在最后，平局按字母序） */
  const pending = (): string[] =>
    graph.nodes
      .filter((n) => !inTree.has(n.id))
      .sort((a, b) => {
        const ka = ctx.dist[a.id];
        const kb = ctx.dist[b.id];
        if (ka === null && kb === null) return a.id.localeCompare(b.id);
        if (ka === null) return 1;
        if (kb === null) return -1;
        return ka - kb || a.id.localeCompare(b.id);
      })
      .map((n) => n.id);

  const frontierOf = (ids: string[]): { id: string; state: ElementState }[] =>
    ids.map((id) => ({ id, state: 'special' as ElementState }));

  const treeStates = (): Record<string, ElementState> => {
    const s: Record<string, ElementState> = {};
    for (const id of inTree) s[id] = 'success';
    return s;
  };

  yield emit(
    { [start]: 'special' },
    null,
    frontierOf(pending()),
    'set',
    new Set(),
    new Set(),
    `初始：树只含起点 ${start}（key=0），其余节点 key=∞（徽标数字，∞ 表示还没有边连到树）`,
    [1],
  );

  /** 考察 u 的未入树邻居，更新 key（每条边一帧） */
  function* relax(u: string): Generator<VizStep, void, void> {
    for (const nb of outNeighbors(graph, u)) {
      if (inTree.has(nb.to)) continue;
      ctx.counters.comparisons++;
      const candidate = nb.weight;
      const kv = ctx.dist[nb.to];
      const activeEdges = new Set([nb.edgeId]);
      if (kv === null || candidate < kv) {
        ctx.dist[nb.to] = candidate;
        ctx.pred[nb.to] = u;
        yield emit(
          { ...treeStates(), [u]: 'active', [nb.to]: 'special' },
          u,
          frontierOf(pending()),
          'set',
          activeEdges,
          treeEdges,
          `考察割边 ${u}—${nb.to}（w=${candidate}）< 当前 key[${nb.to}]=${kv === null ? '∞' : kv}：key[${nb.to}] 更新为 ${candidate}（只看这条边本身的权重，不做路径累加）`,
          [5, 6],
          { type: 'mst-relax', from: u, to: nb.to, weight: candidate, oldKey: kv, newKey: candidate },
        );
      } else {
        yield emit(
          { ...treeStates(), [u]: 'active' },
          u,
          frontierOf(pending()),
          'set',
          activeEdges,
          treeEdges,
          `考察割边 ${u}—${nb.to}（w=${candidate}）≥ 当前 key[${nb.to}]=${kv}：${nb.to} 已有更便宜的连入方式，不更新`,
          [5],
          { type: 'mst-examine', from: u, to: nb.to, weight: candidate, currentKey: kv, candidate },
        );
      }
    }
  }

  // 初始：用起点的出边为邻居建立初始 key
  yield* relax(start);

  while (true) {
    const cand = pending();
    const u = cand[0];
    if (u === undefined) break;
    const ku = ctx.dist[u];
    if (ku === null) break; // 剩余节点与树不连通
    inTree.add(u);
    ctx.counters.visits++;
    totalWeight += ku;
    const via = ctx.pred[u];
    const viaEdge = graph.edges.find(
      (e) =>
        via !== null &&
        ((e.from === via && e.to === u) || (!e.directed && e.from === u && e.to === via)),
    );
    if (viaEdge) treeEdges.add(viaEdge.id);
    yield emit(
      { ...treeStates(), [u]: 'active' },
      u,
      frontierOf(cand.slice(1)),
      'set',
      new Set(),
      treeEdges,
      `选中割边中最小者：${via}—${u}（w=${ku}），${u} 连入树；当前树总权重 = ${totalWeight}`,
      [3, 4],
      { type: 'mst-accept', nodeId: u, via: via ?? u, weight: ku, totalWeight },
    );
    yield* relax(u);
  }

  const covered = inTree.size;
  if (covered === graph.nodes.length) {
    yield emit(
      treeStates(),
      null,
      [],
      'none',
      new Set(),
      treeEdges,
      `Prim 完成：最小生成树覆盖全部 ${covered} 个节点，用了 ${covered - 1} 条边，总权重 = ${totalWeight}`,
      [7],
    );
  } else {
    const states = treeStates();
    const outside = graph.nodes.filter((n) => !inTree.has(n.id)).map((n) => n.id);
    for (const id of outside) states[id] = 'muted';
    yield emit(
      states,
      null,
      [],
      'none',
      new Set(),
      treeEdges,
      `图不连通：生成树只覆盖 ${covered}/${graph.nodes.length} 个节点（${outside.join('、')} 与树不连通），总权重 = ${totalWeight}`,
      [7],
    );
  }
}
