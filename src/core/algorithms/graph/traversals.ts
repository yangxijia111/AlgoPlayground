/**
 * BFS 与 DFS 的可视化生成器（邻居按字母序，访问序确定）。
 */
import type { GraphInput } from '../../registry';
import { makeGraphEmit, outNeighbors } from './common';
import type { ElementState } from '../../step/frame';
import type { VizStep } from '../../step/step';

/** BFS 伪代码：
 * 0 procedure bfs(G, s)
 * 1   s 入队并标记已发现
 * 2   while 队列非空 do
 * 3     u ← 出队
 * 4     访问 u
 * 5     for v ∈ u 的未发现邻居 do
 * 6       v 入队并标记已发现（dist[v] ← dist[u]+1，pred[v] ← u）
 * 7 end procedure
 */
export function* bfsGen(input: GraphInput): Generator<VizStep, void, void> {
  const graph = input.graph;
  const start = input.start!;
  const ctx = {
    dist: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, number | null>,
    pred: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, string | null>,
    counters: { visits: 0, comparisons: 0 },
  };
  const emit = makeGraphEmit(graph, 'bfs', ctx);
  const discovered = new Set<string>([start]);
  const visited: string[] = [];
  ctx.dist[start] = 0;

  const frontierOf = (queue: string[]): { id: string; state: ElementState }[] =>
    queue.map((id) => ({ id, state: 'special' as ElementState }));

  yield emit({}, null, frontierOf([start]), 'queue', new Set(), new Set(), `初始：起点 ${start} 入队，dist[${start}]=0`, [1]);

  const queue: string[] = [start];
  while (queue.length > 0) {
    const u = queue.shift()!;
    ctx.counters.visits++;
    visited.push(u);
    yield emit({ [u]: 'active' }, u, frontierOf(queue), 'queue', new Set(), new Set(), `节点 ${u} 出队并访问（访问序第 ${visited.length} 个）`, [3, 4]);
    for (const nb of outNeighbors(graph, u)) {
      if (discovered.has(nb.to)) continue;
      discovered.add(nb.to);
      queue.push(nb.to);
      ctx.dist[nb.to] = (ctx.dist[u] ?? 0) + 1;
      ctx.pred[nb.to] = u;
      ctx.counters.comparisons++;
      const edges = new Set([nb.edgeId]);
      yield emit(
        { [u]: 'active', [nb.to]: 'special' },
        u,
        frontierOf(queue),
        'queue',
        edges,
        new Set(),
        `邻居 ${nb.to} 未发现：入队，dist[${nb.to}]=${ctx.dist[nb.to]}，pred[${nb.to}]=${u}，队列：[${queue.join(', ')}]`,
        [5, 6],
      );
    }
  }
  const okStates: Record<string, ElementState> = {};
  for (const v of visited) okStates[v] = 'success';
  const unreachable = graph.nodes.filter((n) => !discovered.has(n.id)).map((n) => n.id);
  const note = unreachable.length > 0 ? `；不可达节点：${unreachable.join(', ')}` : '';
  yield emit(okStates, null, [], 'none', new Set(), new Set(), `BFS 完成：访问序 [ ${visited.join(' → ')} ]${note}`, [2]);
}

/** DFS 伪代码（显式栈，邻居逆序压入保证字母序访问）：
 * 0 procedure dfs(G, s)
 * 1   s 入栈
 * 2   while 栈非空 do
 * 3     u ← 出栈
 * 4     if u 未访问 then 访问 u
 * 5     for v ∈ u 的未发现邻居（逆序）do
 * 6       v 入栈并标记已发现
 * 7 end procedure
 */
export function* dfsGen(input: GraphInput): Generator<VizStep, void, void> {
  const graph = input.graph;
  const start = input.start!;
  const ctx = {
    dist: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, number | null>,
    pred: Object.fromEntries(graph.nodes.map((n) => [n.id, null])) as Record<string, string | null>,
    counters: { visits: 0, comparisons: 0 },
  };
  const emit = makeGraphEmit(graph, 'dfs', ctx);
  const discovered = new Set<string>([start]);
  const visited: string[] = [];

  const frontierOf = (stack: string[]): { id: string; state: ElementState }[] =>
    stack.map((id) => ({ id, state: 'special' as ElementState }));

  yield emit({}, null, frontierOf([start]), 'stack', new Set(), new Set(), `初始：起点 ${start} 入栈`, [1]);

  const stack: string[] = [start];
  while (stack.length > 0) {
    const u = stack.pop()!;
    if (visited.includes(u)) continue;
    ctx.counters.visits++;
    visited.push(u);
    yield emit({ [u]: 'active' }, u, frontierOf(stack), 'stack', new Set(), new Set(), `节点 ${u} 出栈并访问（访问序第 ${visited.length} 个）`, [3, 4]);
    const nbs = outNeighbors(graph, u).filter((nb) => !discovered.has(nb.to));
    if (nbs.length > 0) {
      ctx.counters.comparisons += nbs.length;
      // 逆序压栈：字母序小的最后压入、最先弹出
      for (const nb of [...nbs].reverse()) {
        discovered.add(nb.to);
        stack.push(nb.to);
        ctx.pred[nb.to] = u;
      }
      const edges = new Set(nbs.map((nb) => nb.edgeId));
      const states: Record<string, ElementState> = { [u]: 'active' };
      for (const nb of nbs) states[nb.to] = 'special';
      yield emit(
        states,
        u,
        frontierOf(stack),
        'stack',
        edges,
        new Set(),
        `${u} 的未发现邻居 ${nbs.map((nb) => nb.to).join(', ')} 按逆序压栈（保证按字母序访问），栈：[${stack.join(', ')}]`,
        [5, 6],
      );
    }
  }
  const okStates: Record<string, ElementState> = {};
  for (const v of visited) okStates[v] = 'success';
  const unreachable = graph.nodes.filter((n) => !discovered.has(n.id)).map((n) => n.id);
  const note = unreachable.length > 0 ? `；不可达节点：${unreachable.join(', ')}` : '';
  yield emit(okStates, null, [], 'none', new Set(), new Set(), `DFS 完成：访问序 [ ${visited.join(' → ')} ]${note}`, [2]);
}
