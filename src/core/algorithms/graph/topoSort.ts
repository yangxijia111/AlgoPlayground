/**
 * 拓扑排序（Kahn 算法）：反复取入度 0 的节点输出，并给出环检测。
 * 徽标（distance 字段）复用为「当前入度」：输出节点必然为 0，成环节点恒大于 0。
 */
import type { GraphInput } from '../../registry';
import { makeGraphEmit, outNeighbors } from './common';
import type { ElementState } from '../../step/frame';
import type { VizStep } from '../../step/step';

/** topo-sort 伪代码：
 * 0  procedure topoSort(G)
 * 1    计算每个节点的入度 indeg[v]
 * 2    所有 indeg=0 的节点入队（按字母序）
 * 3    while 队列非空 do
 * 4      u ← 出队；输出 u 加入拓扑序
 * 5      for v ∈ u 的出边邻居 do
 * 6        indeg[v] ← indeg[v] − 1
 * 7        if indeg[v] = 0 then v 入队
 * 8    if 已输出节点数 < |V| then 图含环
 * 9  end procedure
 */
export function* topoSortGen(input: GraphInput): Generator<VizStep, void, void> {
  const graph = input.graph;
  const ctx = {
    // 入度复用 dist 徽标通道（初始即为真实入度，非 null）
    dist: Object.fromEntries(graph.nodes.map((n) => [n.id, 0])) as Record<string, number | null>,
    pred: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, string | null>,
    counters: { visits: 0, comparisons: 0 },
  };
  const emit = makeGraphEmit(graph, 'topo-sort', ctx);

  const frontierOf = (queue: string[]): { id: string; state: ElementState }[] =>
    queue.map((id) => ({ id, state: 'special' as ElementState }));

  // 入度计算（校验已保证全部边有向，出边即唯一入边来源）
  for (const e of graph.edges) {
    ctx.dist[e.to] = (ctx.dist[e.to] ?? 0) + 1;
  }
  const degText = graph.nodes.map((n) => `${n.id}=${ctx.dist[n.id]}`).join(', ');
  yield emit({}, null, [], 'none', new Set(), new Set(), `计算入度（节点旁数字）：${degText}`, [1]);

  const queue: string[] = graph.nodes
    .filter((n) => ctx.dist[n.id] === 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => n.id);
  yield emit(
    {},
    null,
    frontierOf(queue),
    'queue',
    new Set(),
    new Set(),
    queue.length > 0
      ? `入度为 0 的节点 ${queue.join('、')} 入队（没有前置依赖，可以立即开始）；队列：[${queue.join(', ')}]`
      : '没有任何入度为 0 的节点：所有节点都有前置依赖，图必含环',
    [2],
    { type: 'frontier-add', nodeIds: [...queue], container: 'queue' },
  );

  const output: string[] = [];
  const inTree = new Set<string>(); // 已输出节点（用于状态着色）
  while (queue.length > 0) {
    const u = queue.shift()!;
    output.push(u);
    inTree.add(u);
    ctx.counters.visits++;
    yield emit(
      { [u]: 'active' },
      u,
      frontierOf(queue),
      'queue',
      new Set(),
      new Set(),
      `节点 ${u} 出队并加入拓扑序（第 ${output.length} 个）；拓扑序：[${output.join(' → ')}]`,
      [3, 4],
      { type: 'visit-node', nodeId: u, algorithm: 'topo-sort' },
    );
    for (const nb of outNeighbors(graph, u)) {
      ctx.counters.comparisons++;
      const before = ctx.dist[nb.to] ?? 0;
      const after = before - 1;
      ctx.dist[nb.to] = after;
      if (after === 0) queue.push(nb.to);
      yield emit(
        { [u]: 'active', [nb.to]: 'special' },
        u,
        frontierOf(queue),
        'queue',
        new Set([nb.edgeId]),
        new Set(),
        after === 0
          ? `处理边 ${u}→${nb.to}：入度 ${before}→0，${nb.to} 的前置依赖全部完成，入队；队列：[${queue.join(', ')}]`
          : `处理边 ${u}→${nb.to}：入度 ${before}→${after}（还有依赖未完成，暂不能输出）`,
        [5, 6, 7],
        { type: 'graph-degree-dec', from: u, to: nb.to, before, after },
      );
    }
  }

  if (output.length === graph.nodes.length) {
    const okStates: Record<string, ElementState> = {};
    for (const id of output) okStates[id] = 'success';
    yield emit(
      okStates,
      null,
      [],
      'none',
      new Set(),
      new Set(),
      `拓扑排序完成：[${output.join(' → ')}]——任意一条边 u→v 都保证 u 排在 v 之前`,
      [9],
    );
  } else {
    const remaining = graph.nodes.filter((n) => !inTree.has(n.id)).map((n) => n.id);
    const states: Record<string, ElementState> = {};
    for (const id of output) states[id] = 'success';
    for (const id of remaining) states[id] = 'danger';
    yield emit(
      states,
      null,
      [],
      'none',
      new Set(),
      new Set(),
      `检测到环：剩余节点 ${remaining.join('、')} 的入度都大于 0，互相等待前置依赖，永远无法归零。部分拓扑序：[${output.join(' → ')}]`,
      [8],
      { type: 'cycle-detected', remaining },
    );
  }
}
