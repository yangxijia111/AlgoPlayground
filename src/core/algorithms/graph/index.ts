/**
 * 图算法注册条目：BFS / DFS / Dijkstra（共享图编辑器）。
 */
import type { AlgorithmEntry, AlgorithmInput, GraphAlgorithm, GraphInput } from '../../registry';
import { validateGraphInput } from './common';
import { defaultGraph } from './presets';
import { bfsGen, dfsGen } from './traversals';
import { dijkstraGen } from './dijkstra';

const RUNNERS: Record<GraphAlgorithm, (input: GraphInput) => Generator<import('../../step/step').VizStep, void, void>> = {
  bfs: bfsGen,
  dfs: dfsGen,
  dijkstra: dijkstraGen,
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
      graph: defaultGraph(),
      start: 'A',
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
];

export default entries;
