/**
 * 图算法测试（TEST_PLAN T1.5）：固定图金标准 + 边界 + 校验。
 */
import { describe, expect, it } from 'vitest';
import { collectSteps } from '../../step/step';
import { checkStepIntegrity } from '../../step/integrity';
import type { GraphInput, GraphModel } from '../../registry';
import { outNeighbors, validateGraphInput } from './common';
import { defaultGraph, freePosition, nextNodeId } from './presets';
import entries from './index';

function entry(id: string) {
  const e = entries.find((x) => x.meta.id === id);
  if (!e) throw new Error(`${id} 未注册`);
  return e;
}

function run(id: string, graph: GraphModel, start: string | null, end: string | null = null) {
  return collectSteps(entry(id).run({ type: 'graph', algorithm: id as 'bfs' | 'dfs' | 'dijkstra', graph, start, end }));
}

/** 手工验证图：
 *   A - B   C
 *   |   | / |
 *   D - E - F      以及孤立节点 G
 */
function fixedGraph(): GraphModel {
  return {
    nodes: [
      { id: 'A', x: 0.1, y: 0.2 },
      { id: 'B', x: 0.5, y: 0.15 },
      { id: 'C', x: 0.9, y: 0.2 },
      { id: 'D', x: 0.1, y: 0.8 },
      { id: 'E', x: 0.5, y: 0.75 },
      { id: 'F', x: 0.9, y: 0.8 },
      { id: 'G', x: 0.7, y: 0.45 },
    ],
    edges: [
      { id: 'x1', from: 'A', to: 'B', directed: false, weight: 4 },
      { id: 'x2', from: 'A', to: 'D', directed: false, weight: 2 },
      { id: 'x3', from: 'B', to: 'E', directed: false, weight: 3 },
      { id: 'x4', from: 'B', to: 'C', directed: false, weight: 5 },
      { id: 'x5', from: 'C', to: 'F', directed: false, weight: 2 },
      { id: 'x6', from: 'D', to: 'E', directed: false, weight: 6 },
      { id: 'x7', from: 'E', to: 'F', directed: false, weight: 1 },
    ],
  };
}

const lastFrame = (steps: ReturnType<typeof run>) => {
  const f = steps[steps.length - 1].frame;
  if (f.kind !== 'graph') throw new Error('帧类型错误');
  return f;
};

describe('BFS', () => {
  it('访问序（字母序邻接 + 含孤立节点）金标准：A → B → D → C → E → F', () => {
    const steps = run('bfs', fixedGraph(), 'A');
    expect(lastFrame(steps).message).toContain('A → B → D → C → E → F');
    expect(lastFrame(steps).message).toContain('不可达节点：G');
  });

  it('距离与前驱正确', () => {
    const f = lastFrame(run('bfs', fixedGraph(), 'A'));
    const dist = Object.fromEntries(f.nodes.map((n) => [n.id, n.distance]));
    expect(dist).toEqual({ A: 0, B: 1, C: 2, D: 1, E: 2, F: 3, G: null });
    const pred = Object.fromEntries(f.nodes.map((n) => [n.id, n.predecessor]));
    expect(pred.E).toBe('B');
    expect(pred.F).toBe('C');
  });

  it('frontier 全程为队列语义', () => {
    const steps = run('bfs', defaultGraph(), 'A');
    const kinds = new Set(steps.map((s) => (s.frame.kind === 'graph' ? s.frame.frontierKind : 'none')));
    expect(kinds.has('queue')).toBe(true);
  });
});

describe('DFS', () => {
  it('访问序金标准：A → B → C → F → E → D', () => {
    const steps = run('dfs', fixedGraph(), 'A');
    expect(lastFrame(steps).message).toContain('A → B → C → F → E → D');
  });

  it('含孤立节点提示', () => {
    expect(lastFrame(run('dfs', fixedGraph(), 'A')).message).toContain('G');
  });

  it('起点孤立时只访问起点', () => {
    const g: GraphModel = {
      nodes: [
        { id: 'A', x: 0.2, y: 0.2 },
        { id: 'B', x: 0.8, y: 0.2 },
      ],
      edges: [],
    };
    const f = lastFrame(run('dfs', g, 'A'));
    expect(f.message).toContain('[ A ]');
  });
});

describe('Dijkstra', () => {
  it('距离金标准（fixedGraph 自 A）：A0 B4 D2 E7 F8 C9', () => {
    const f = lastFrame(run('dijkstra', fixedGraph(), 'A'));
    const dist = Object.fromEntries(f.nodes.map((n) => [n.id, n.distance]));
    expect(dist).toEqual({ A: 0, B: 4, C: 9, D: 2, E: 7, F: 8, G: null });
  });

  it('指定终点提前结束且回溯路径', () => {
    const steps = run('dijkstra', fixedGraph(), 'A', 'F');
    const f = lastFrame(steps);
    expect(f.message).toContain('最短路径 [ A → B → E → F ]');
    expect(f.message).toContain('长度 8');
    // 路径上的边高亮为 success
    const okEdges = f.edges.filter((e) => e.state === 'success');
    expect(okEdges).toHaveLength(3);
  });

  it('默认图（默认权重）从 A 出发的距离', () => {
    const f = lastFrame(run('dijkstra', defaultGraph(), 'A'));
    const dist = Object.fromEntries(f.nodes.map((n) => [n.id, n.distance]));
    // A-B4, A-D2, D-E8, B-E7, E-F9, B-C9 → F 最短 9（A-B4,E? 无）：E=min(8,7)=7? D-E=2+6=8; B-E=4+3=7; E-F=7+1=8; C=4+5=9; F=min(8, C?9+2=11)=8
    expect(dist).toEqual({ A: 0, B: 4, C: 9, D: 2, E: 7, F: 8 });
  });

  it('不可达节点距离为 null 且有说明', () => {
    const f = lastFrame(run('dijkstra', fixedGraph(), 'A'));
    expect(f.nodes.find((n) => n.id === 'G')?.distance).toBeNull();
    expect(f.message).toContain('G:∞');
  });
});

describe('共享工具', () => {
  it('outNeighbors 有向/无向与字母序', () => {
    const g: GraphModel = {
      nodes: [
        { id: 'B', x: 0, y: 0 },
        { id: 'A', x: 1, y: 0 },
        { id: 'C', x: 0.5, y: 1 },
      ],
      edges: [
        { id: '1', from: 'B', to: 'C', directed: false, weight: 1 },
        { id: '2', from: 'B', to: 'A', directed: true, weight: 2 },
        { id: '3', from: 'A', to: 'C', directed: true, weight: 3 },
      ],
    };
    // B 的可达邻居：A（有向出边）与 C（无向），按字母序
    expect(outNeighbors(g, 'B').map((n) => n.to)).toEqual(['A', 'C']);
    // C 没有出边（A→C 的方向进不来，B-C 的无向对 C 是 B）
    expect(outNeighbors(g, 'C').map((n) => n.to)).toEqual(['B']);
  });

  it('nextNodeId / freePosition', () => {
    const g = defaultGraph();
    expect(nextNodeId(g)).toBe('G');
    const full: GraphModel = { nodes: 'ABCDEFGHIJKL'.split('').map((id, i) => ({ id, x: 0.1 + i * 0.07, y: 0.5 })), edges: [] };
    expect(nextNodeId(full)).toBeNull();
    const p = freePosition(g);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(1);
  });
});

describe('图输入校验', () => {
  const base = (): GraphInput => ({ type: 'graph', algorithm: 'bfs', graph: defaultGraph(), start: 'A', end: null });

  it('合法输入通过', () => {
    expect(validateGraphInput(base())).toBeNull();
  });
  it('起点缺失被拒绝', () => {
    expect(validateGraphInput({ ...base(), start: null })).toContain('起点');
  });
  it('自环被拒绝', () => {
    const g = base();
    g.graph.edges.push({ id: 'zz', from: 'A', to: 'A', directed: false, weight: 3 });
    expect(validateGraphInput(g)).toContain('自环');
  });
  it('重复边被拒绝（无向双向视为重复）', () => {
    const g = base();
    g.graph.edges.push({ id: 'zz', from: 'B', to: 'A', directed: false, weight: 3 });
    expect(validateGraphInput(g)).toContain('重复边');
  });
  it('权重越界被拒绝', () => {
    const g = base();
    g.graph.edges.push({ id: 'zz', from: 'A', to: 'C', directed: false, weight: 100 });
    expect(validateGraphInput(g)).toContain('1–99');
  });
  it('节点超限被拒绝', () => {
    const g = base();
    g.graph.nodes = Array.from({ length: 13 }, (_, i) => ({ id: String(i), x: 0.1, y: 0.1 }));
    g.graph.edges = [];
    g.start = '0';
    expect(validateGraphInput(g)).toContain('12');
  });
});

describe('步骤完整性', () => {
  it.each(['bfs', 'dfs', 'dijkstra'])('%s 全程完整性', (id) => {
    const e = entry(id);
    const steps = collectSteps(e.run({ type: 'graph', algorithm: id as 'bfs', graph: fixedGraph(), start: 'A', end: null }));
    expect(checkStepIntegrity(steps, e.meta.pseudocode.length)).toEqual([]);
  });
});
