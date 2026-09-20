/**
 * 树布局：中序序号 → x、深度 → y（均归一化到 [0,1]，见 VISUALIZATION_SPEC §4）。
 * 任意两节点的（序号，深度）不全相同，保证无重叠。
 */
import type { BstNode } from './model';

export interface TreeLayoutNode {
  id: number;
  value: number;
  x: number;
  y: number;
}

export interface TreeLayoutEdge {
  from: number;
  to: number;
}

export interface TreeLayout {
  nodes: TreeLayoutNode[];
  edges: TreeLayoutEdge[];
}

export function layoutTree(root: BstNode | null): TreeLayout {
  // 第一趟：中序收集（节点，深度，序号）并求最大深度
  const entries: { node: BstNode; depth: number; idx: number }[] = [];
  const edges: TreeLayoutEdge[] = [];
  let idx = 0;
  let maxDepth = 0;
  const walk = (node: BstNode | null, depth: number, parent: BstNode | null) => {
    if (!node) return;
    maxDepth = Math.max(maxDepth, depth);
    walk(node.left, depth + 1, node);
    entries.push({ node, depth, idx: idx++ });
    if (parent) edges.push({ from: parent.id, to: node.id });
    walk(node.right, depth + 1, node);
  };
  walk(root, 0, null);

  const total = entries.length;
  const nodes = entries.map((e) => ({
    id: e.node.id,
    value: e.node.value,
    x: total === 0 ? 0.5 : (e.idx + 0.5) / total,
    y: (e.depth + 0.5) / (maxDepth + 1),
  }));
  return { nodes, edges };
}
