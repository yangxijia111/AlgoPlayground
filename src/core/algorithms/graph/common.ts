/**
 * 图算法共享工具：邻接查询与帧发射器。
 * 约定：邻居按字母序排序，保证遍历顺序确定可测（见 ALGORITHM_SPEC §6）。
 */
import type { GraphAlgorithm, GraphInput, GraphModel } from '../../registry';
import type { ElementState, GraphEdgeView, GraphFrame, GraphNodeView } from '../../step/frame';
import type { VizStep } from '../../step/step';

export interface AdjacentEdge {
  to: string;
  edgeId: string;
  weight: number;
}

/** 出边邻居（有向图仅出边），按目标 id 字母序排序 */
export function outNeighbors(graph: GraphModel, id: string): AdjacentEdge[] {
  const out: AdjacentEdge[] = [];
  for (const e of graph.edges) {
    if (e.from === id) out.push({ to: e.to, edgeId: e.id, weight: e.weight });
    else if (!e.directed && e.to === id) out.push({ to: e.from, edgeId: e.id, weight: e.weight });
  }
  return out.sort((a, b) => a.to.localeCompare(b.to));
}

export interface GraphEmit {
  (
    states: Record<string, ElementState>,
    current: string | null,
    frontier: { id: string; state: ElementState }[],
    frontierKind: 'queue' | 'stack' | 'set' | 'none',
    activeEdges: Set<string>,
    okEdges: Set<string>,
    message: string,
    lines: number[],
  ): VizStep;
}

export function makeGraphEmit(
  graph: GraphModel,
  _algorithm: GraphAlgorithm,
  ctx: { dist: Record<string, number | null>; pred: Record<string, string | null>; counters: Record<string, number> },
): GraphEmit {
  return (states, current, frontier, frontierKind, activeEdges, okEdges, message, lines) => {
    const nodes: GraphNodeView[] = graph.nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      state: states[n.id] ?? 'normal',
      distance: ctx.dist[n.id] ?? null,
      predecessor: ctx.pred[n.id] ?? null,
    }));
    const edges: GraphEdgeView[] = graph.edges.map((e) => {
      let state: ElementState = 'normal';
      if (activeEdges.has(e.id)) state = 'active';
      if (okEdges.has(e.id)) state = 'success';
      return { id: e.id, from: e.from, to: e.to, directed: e.directed, weight: e.weight, state };
    });
    return {
      frame: { kind: 'graph', nodes, edges, current, frontier: [...frontier], frontierKind, message } satisfies GraphFrame,
      description: message,
      pseudocodeLines: lines,
      counters: { ...ctx.counters },
    };
  };
}

/** 图算法通用输入校验（注册表 validate 复用） */
export function validateGraphInput(input: GraphInput): string | null {
  const g = input.graph;
  if (g.nodes.length === 0) return '图至少需要一个节点';
  if (g.nodes.length > 12) return '节点数不能超过 12';
  if (g.edges.length > 24) return '边数不能超过 24';
  const ids = new Set(g.nodes.map((n) => n.id));
  for (const e of g.edges) {
    if (e.from === e.to) return '不允许自环边';
    if (!ids.has(e.from) || !ids.has(e.to)) return `边 ${e.from}-${e.to} 引用了不存在的节点`;
    if (!Number.isInteger(e.weight) || e.weight < 1 || e.weight > 99) {
      return `边 ${e.from}-${e.to} 的权重必须是 1–99 的整数`;
    }
  }
  // 重复边检测（无向边双向视为重复）
  const seen = new Set<string>();
  for (const e of g.edges) {
    const key = e.directed ? `${e.from}>${e.to}` : [e.from, e.to].sort().join('-');
    if (seen.has(key)) return `存在重复边 ${e.from}-${e.to}`;
    seen.add(key);
  }
  if (input.start === null || !ids.has(input.start)) return '必须选择一个有效的起点';
  if (input.end !== null && !ids.has(input.end)) return '终点不存在';
  return null;
}
