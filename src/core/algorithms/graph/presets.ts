/**
 * 图的预设与编辑辅助。
 */
import type { GraphModel } from '../../registry';

/** 默认演示图：6 节点带权无向（部分有向），坐标手工布置 */
export function defaultGraph(): GraphModel {
  return {
    nodes: [
      { id: 'A', x: 0.12, y: 0.22 },
      { id: 'B', x: 0.5, y: 0.12 },
      { id: 'C', x: 0.88, y: 0.25 },
      { id: 'D', x: 0.22, y: 0.72 },
      { id: 'E', x: 0.58, y: 0.62 },
      { id: 'F', x: 0.9, y: 0.82 },
    ],
    edges: [
      { id: 'e1', from: 'A', to: 'B', directed: false, weight: 4 },
      { id: 'e2', from: 'A', to: 'D', directed: false, weight: 2 },
      { id: 'e3', from: 'B', to: 'C', directed: false, weight: 5 },
      { id: 'e4', from: 'B', to: 'E', directed: false, weight: 3 },
      { id: 'e5', from: 'C', to: 'F', directed: false, weight: 2 },
      { id: 'e6', from: 'D', to: 'E', directed: false, weight: 6 },
      { id: 'e7', from: 'E', to: 'F', directed: false, weight: 1 },
    ],
  };
}

const LABELS = 'ABCDEFGHIJKL';

/** 下一个可用节点 id（A…L） */
export function nextNodeId(graph: GraphModel): string | null {
  for (const ch of LABELS) {
    if (!graph.nodes.some((n) => n.id === ch)) return ch;
  }
  return null;
}

/** 未占用的网格位置（4×3 扫描，带 8% 边距） */
export function freePosition(graph: GraphModel): { x: number; y: number } {
  const cols = 4;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 0.1 + (c * 0.8) / (cols - 1);
      const y = 0.12 + (r * 0.76) / (rows - 1);
      const occupied = graph.nodes.some((n) => Math.abs(n.x - x) < 0.06 && Math.abs(n.y - y) < 0.1);
      if (!occupied) return { x, y };
    }
  }
  return { x: 0.5, y: 0.5 };
}
