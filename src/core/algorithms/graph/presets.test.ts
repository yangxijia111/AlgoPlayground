/**
 * 图预设与编辑辅助测试（含满网格回退分支）。
 */
import { describe, expect, it } from 'vitest';
import { defaultGraph, freePosition, nextNodeId } from './presets';
import type { GraphModel } from '../../registry';

describe('presets', () => {
  it('默认图结构合法（6 节点 7 边，坐标在界内）', () => {
    const g = defaultGraph();
    expect(g.nodes).toHaveLength(6);
    expect(g.edges).toHaveLength(7);
    for (const n of g.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(1);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(1);
    }
  });

  it('nextNodeId：按字母序取空位，满时返回 null', () => {
    const g = defaultGraph();
    expect(nextNodeId(g)).toBe('G');
    const full: GraphModel = {
      nodes: 'ABCDEFGHIJKL'.split('').map((id, i) => ({ id, x: 0.1 + i * 0.05, y: 0.5 })),
      edges: [],
    };
    expect(nextNodeId(full)).toBeNull();
  });

  it('freePosition：避开已占用位置；满网格时回退到中心', () => {
    const g = defaultGraph();
    const p = freePosition(g);
    const occupied = g.nodes.some((n) => Math.abs(n.x - p.x) < 0.06 && Math.abs(n.y - p.y) < 0.1);
    expect(occupied).toBe(false);
    // 12 个节点占满 4×3 网格后回退 {0.5, 0.5}
    const full: GraphModel = {
      nodes: 'ABCDEFGHIJKL'.split('').map((id, i) => ({
        id,
        x: 0.1 + ((i % 4) * 0.8) / 3,
        y: 0.12 + (Math.floor(i / 4) * 0.76) / 2,
      })),
      edges: [],
    };
    expect(freePosition(full)).toEqual({ x: 0.5, y: 0.5 });
  });
});
