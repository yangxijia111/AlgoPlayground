/**
 * 图算法注册条目：BFS / DFS / Dijkstra / 拓扑排序 / Prim（共享图编辑器）。
 */
import type { AlgorithmEntry, AlgorithmInput, GraphAlgorithm, GraphInput } from '../../registry';
import { validateGraphInput } from './common';
import { defaultGraph, defaultPrimGraph, defaultTopoGraph } from './presets';
import { bfsGen, dfsGen } from './traversals';
import { dijkstraGen } from './dijkstra';
import { topoSortGen } from './topoSort';
import { primGen } from './primMst';

const RUNNERS: Record<GraphAlgorithm, (input: GraphInput) => Generator<import('../../step/step').VizStep, void, void>> = {
  bfs: bfsGen,
  dfs: dfsGen,
  dijkstra: dijkstraGen,
  'topo-sort': topoSortGen,
  prim: primGen,
};

const DEFAULT_GRAPHS: Record<GraphAlgorithm, () => import('../../registry').GraphModel> = {
  bfs: defaultGraph,
  dfs: defaultGraph,
  dijkstra: defaultGraph,
  'topo-sort': defaultTopoGraph,
  prim: defaultPrimGraph,
};

function graphEntry(
  algorithm: GraphAlgorithm,
  meta: AlgorithmEntry['meta'],
  endDefault: string | null,
): AlgorithmEntry {
  return {
    meta,
    defaultInput: {
      type: 'graph',
      algorithm,
      graph: DEFAULT_GRAPHS[algorithm](),
      start: algorithm === 'topo-sort' ? null : 'A',
      end: endDefault,
    },
    validate: (input: AlgorithmInput) => (input.type === 'graph' ? validateGraphInput(input) : '输入类型错误'),
    // validate 已保证 input.type === 'graph' 且 algorithm 与条目一致
    run: (input) => RUNNERS[algorithm](input as GraphInput),
  };
}

const entries: AlgorithmEntry[] = [
  graphEntry('bfs', {
    id: 'bfs',
    name: '广度优先搜索',
    enName: 'BFS',
    category: 'graph',
    purpose: '按"层"的顺序访问图的所有可达节点，求无权图最短跳数。',
    coreIdea: '借助队列：起点入队后反复出队访问，并把尚未发现的邻居依次入队；先被发现的节点先被访问，因此跳数按层递增。同时记录距离与前驱。',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    pseudocode: [
      'procedure bfs(G, s)',
      '  s 入队并标记已发现',
      '  while 队列非空 do',
      '    u ← 出队',
      '    访问 u',
      '    for v ∈ u 的未发现邻居 do',
      '      v 入队（dist[v] ← dist[u]+1，pred[v] ← u）',
      '  end while',
      'end procedure',
    ],
  }, null),
  graphEntry('dfs', {
    id: 'dfs',
    name: '深度优先搜索',
    enName: 'DFS',
    category: 'graph',
    purpose: "沿一条路走到底再回头的图访问方式，是拓扑排序、连通性等问题的基础。",
    coreIdea: '借助栈（显式或递归调用栈）：出栈访问当前节点，把未发现的邻居按逆序压栈，使字母序最小的邻居最先被访问；一路深入直到无路可走。',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    pseudocode: [
      'procedure dfs(G, s)',
      '  s 入栈',
      '  while 栈非空 do',
      '    u ← 出栈',
      '    if u 未访问 then 访问 u',
      '    for v ∈ u 的未发现邻居（逆序）do',
      '      v 入栈并标记已发现',
      '  end while',
      'end procedure',
    ],
  }, null),
  graphEntry('dijkstra', {
    id: 'dijkstra',
    name: 'Dijkstra 最短路',
    enName: "Dijkstra's Algorithm",
    category: 'graph',
    purpose: '求带权图中源点到各节点的最短路径（权重非负）。',
    coreIdea: '贪心：每轮从未确定集中选 dist 最小的节点，它的距离即已最终确定；再用它的出边尝试松弛邻居（dist[u]+w < dist[v] 则更新）。可指定终点提前结束并回溯路径。',
    timeComplexity: 'O(V²)（本实现的简单选择版）',
    spaceComplexity: 'O(V)',
    pseudocode: [
      'procedure dijkstra(G, s)',
      '  dist[s] ← 0，其余 dist ← ∞',
      '  while 存在未确定节点 do',
      '    u ← 未确定节点中 dist 最小者',
      '    将 u 标记为已确定',
      '    for 每条出边 (u, v, w) do',
      '      if dist[u] + w < dist[v] then',
      '        dist[v] ← dist[u]+w；pred[v] ← u   // 松弛',
      '  end while',
      'end procedure',
    ],
  }, null),
  graphEntry('topo-sort', {
    id: 'topo-sort',
    name: '拓扑排序',
    enName: 'Topological Sort (Kahn)',
    category: 'graph',
    purpose: '给有向无环图（DAG）的节点排一个线性顺序，保证每条边 u→v 都满足 u 在 v 之前；若图含环则报告无法完成。',
    coreIdea: 'Kahn 算法：入度为 0 的节点没有前置依赖，可以立即输出；输出后删掉它的出边（邻居入度减一），产生新的入度 0 节点。若最终有节点未输出，说明它们互相等待——图含环。课程先修、构建依赖、任务调度都是这个模型。',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    pseudocode: [
      'procedure topoSort(G)',
      '  计算每个节点的入度 indeg[v]',
      '  所有 indeg=0 的节点入队（按字母序）',
      '  while 队列非空 do',
      '    u ← 出队；输出 u 加入拓扑序',
      '    for v ∈ u 的出边邻居 do',
      '      indeg[v] ← indeg[v] − 1',
      '      if indeg[v] = 0 then v 入队',
      '  if 已输出节点数 < |V| then 图含环',
      'end procedure',
    ],
  }, null),
  graphEntry('prim', {
    id: 'prim',
    name: 'Prim 最小生成树',
    enName: "Prim's Algorithm",
    category: 'graph',
    purpose: '求带权连通图的最小生成树：用 V−1 条边把所有节点连通，且总权重最小（网络布线、道路规划等场景）。',
    coreIdea: '贪心生长：树从起点开始，每轮在「树内 → 树外」的所有割边中选权重最小的一条，把新节点连入树。key[v] 记录 v 连入树的最便宜边权，节点入树后用它的边更新邻居的 key。与 Dijkstra 的区别：key 不做路径累加，只比较单条边本身的权重。',
    timeComplexity: 'O(V²)（本实现的简单选择版）',
    spaceComplexity: 'O(V)',
    pseudocode: [
      'procedure prim(G, s)',
      '  树 ← {s}；key[s]=0，其余 key ← ∞',
      '  while 还有未入树节点 do',
      '    u ← 割边（树→非树）中权重最小者对应的节点',
      '    把 u 连入树（选中那条最小割边）',
      '    for v ∈ u 的未入树邻居 do',
      '      if w(u,v) < key[v] then key[v] ← w(u,v)；parent[v] ← u',
      'end procedure',
    ],
  }, null),
];

export default entries;
