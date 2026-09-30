/**
 * 拓扑排序（Kahn）与 Prim 最小生成树的 Generator 单测：
 * 金标准步骤序列（手工推演）、环检测、平局确定性、validate 新规则、确定性重放。
 */
import { describe, expect, it } from 'vitest';
import { collectSteps } from '../../step/step';
import { topoSortGen } from './topoSort';
import { primGen } from './primMst';
import { validateGraphInput } from './common';
import { defaultTopoGraph, defaultPrimGraph } from './presets';
import type { GraphInput, GraphModel } from '../../registry';
import type { StepSemantic } from '../../step/semantic';
import type { GraphFrame } from '../../step/frame';

const topoInput = (): GraphInput => ({ type: 'graph', algorithm: 'topo-sort', graph: defaultTopoGraph(), start: null, end: null });
const primInput = (): GraphInput => ({ type: 'graph', algorithm: 'prim', graph: defaultPrimGraph(), start: 'A', end: null });

/** 有向图快捷构造 */
function dag(edges: [string, string][], nodeIds: string[]): GraphModel {
  return {
    nodes: nodeIds.map((id, i) => ({ id, x: 0.1 + (i * 0.8) / Math.max(1, nodeIds.length - 1), y: 0.5 })),
    edges: edges.map(([from, to], i) => ({ id: `e${i + 1}`, from, to, directed: true, weight: 1 })),
  };
}

describe('topo-sort Generator', () => {
  it('默认 DAG：拓扑序为 A,B,C,D,E，语义序列完整', () => {
    const steps = collectSteps(topoSortGen(topoInput()));
    const semantics = steps.map((s) => s.semantic).filter((s): s is StepSemantic => s !== undefined);
    const visits = semantics.filter((s) => s.type === 'visit-node').map((s) => (s as { nodeId: string }).nodeId);
    expect(visits).toEqual(['A', 'B', 'C', 'D', 'E']);
    // 初始 frontier-add（A 入队）+ 5 次 visit + 5 次 degree-dec（每条边一次）
    expect(semantics.filter((s) => s.type === 'frontier-add')).toHaveLength(1);
    expect(semantics.filter((s) => s.type === 'graph-degree-dec')).toHaveLength(5);
    expect(steps[steps.length - 1]!.description).toContain('拓扑排序完成');
    expect(steps[steps.length - 1]!.description).toContain('A → B → C → D → E');
  });

  it('入度徽标（distance 通道）在初始帧即为真实入度', () => {
    const steps = collectSteps(topoSortGen(topoInput()));
    const first = steps[0]!.frame as GraphFrame;
    const distById = Object.fromEntries(first.nodes.map((n) => [n.id, n.distance]));
    expect(distById).toEqual({ A: 0, B: 1, C: 1, D: 2, E: 1 });
  });

  it('degree-dec 语义携带 before/after，归零后节点出现在队列', () => {
    const steps = collectSteps(topoSortGen(topoInput()));
    const decs = steps.map((s) => s.semantic).filter((s) => s?.type === 'graph-degree-dec') as Extract<StepSemantic, { type: 'graph-degree-dec' }>[];
    // A→B：1→0（归零入队）；A→C：1→0；B→D：2→1；C→D：1→0；D→E：1→0
    expect(decs.map((d) => [d.from, d.to, d.before, d.after])).toEqual([
      ['A', 'B', 1, 0],
      ['A', 'C', 1, 0],
      ['B', 'D', 2, 1],
      ['C', 'D', 1, 0],
      ['D', 'E', 1, 0],
    ]);
    // C→D 归零帧的 frontier 中包含 D
    const cdFrame = steps.find((s) => s.semantic?.type === 'graph-degree-dec' && (s.semantic as { to: string }).to === 'D' && (s.semantic as { from: string }).from === 'C')!.frame as GraphFrame;
    expect(cdFrame.frontier.map((f) => f.id)).toContain('D');
  });

  it('部分环图：输出无环节点后 cycle-detected，剩余节点 danger', () => {
    const input: GraphInput = {
      type: 'graph',
      algorithm: 'topo-sort',
      graph: dag([['A', 'B'], ['B', 'A']], ['A', 'B', 'C', 'D']),
      start: null,
      end: null,
    };
    const steps = collectSteps(topoSortGen(input));
    const visits = steps.map((s) => s.semantic).filter((s) => s?.type === 'visit-node').map((s) => (s as { nodeId: string }).nodeId);
    expect(visits).toEqual(['C', 'D']); // 入度 0 按字母序：C、D 先入队输出
    const last = steps[steps.length - 1]!;
    expect(last.semantic).toEqual({ type: 'cycle-detected', remaining: ['A', 'B'] });
    const frame = last.frame as GraphFrame;
    expect(frame.nodes.find((n) => n.id === 'A')?.state).toBe('danger');
    expect(frame.nodes.find((n) => n.id === 'C')?.state).toBe('success');
    expect(last.description).toContain('检测到环');
  });

  it('全环节点：无入度 0 节点，frontier-add 空列表后立即检测环', () => {
    const input: GraphInput = {
      type: 'graph',
      algorithm: 'topo-sort',
      graph: dag([['A', 'B'], ['B', 'C'], ['C', 'A']], ['A', 'B', 'C']),
      start: null,
      end: null,
    };
    const steps = collectSteps(topoSortGen(input));
    expect(steps[1]!.semantic).toEqual({ type: 'frontier-add', nodeIds: [], container: 'queue' });
    expect(steps[steps.length - 1]!.semantic).toEqual({ type: 'cycle-detected', remaining: ['A', 'B', 'C'] });
  });

  it('单节点无边：直接输出', () => {
    const input: GraphInput = { type: 'graph', algorithm: 'topo-sort', graph: dag([], ['A']), start: null, end: null };
    const steps = collectSteps(topoSortGen(input));
    const visits = steps.map((s) => s.semantic).filter((s) => s?.type === 'visit-node').map((s) => (s as { nodeId: string }).nodeId);
    expect(visits).toEqual(['A']);
    expect(steps[steps.length - 1]!.description).toContain('拓扑排序完成');
  });

  it('多源 DAG 平局：同轮多个入度 0 节点按字母序输出', () => {
    const input: GraphInput = {
      type: 'graph',
      algorithm: 'topo-sort',
      graph: dag([['B', 'D'], ['C', 'D']], ['D', 'C', 'B', 'A']), // 节点数组乱序，输出仍按字母序
      start: null,
      end: null,
    };
    const steps = collectSteps(topoSortGen(input));
    const visits = steps.map((s) => s.semantic).filter((s) => s?.type === 'visit-node').map((s) => (s as { nodeId: string }).nodeId);
    expect(visits).toEqual(['A', 'B', 'C', 'D']);
  });

  it('确定性：同输入两次运行 deepEqual', () => {
    const a = collectSteps(topoSortGen(topoInput()));
    const b = collectSteps(topoSortGen(topoInput()));
    expect(a).toEqual(b);
  });
});

describe('prim Generator', () => {
  it('默认图：MST 总权重 14，接受序列 B,C,E,D 与连入边一致', () => {
    const steps = collectSteps(primGen(primInput()));
    const semantics = steps.map((s) => s.semantic).filter((s): s is StepSemantic => s !== undefined);
    const accepts = semantics.filter((s) => s.type === 'mst-accept') as Extract<StepSemantic, { type: 'mst-accept' }>[];
    expect(accepts.map((a) => [a.nodeId, a.via, a.weight])).toEqual([
      ['B', 'A', 3],
      ['C', 'B', 5],
      ['E', 'C', 4],
      ['D', 'E', 2],
    ]);
    expect(accepts[accepts.length - 1]!.totalWeight).toBe(14);
    const last = steps[steps.length - 1]!;
    expect(last.description).toContain('总权重 = 14');
    expect(last.description).toContain('4 条边');
  });

  it('key 徽标初始帧：起点 0，其余 ∞（null）', () => {
    const steps = collectSteps(primGen(primInput()));
    const first = steps[0]!.frame as GraphFrame;
    const distById = Object.fromEntries(first.nodes.map((n) => [n.id, n.distance]));
    expect(distById).toEqual({ A: 0, B: null, C: null, D: null, E: null });
  });

  it('mst-relax：只比较单边权重不累加；mst-examine 在已有更小 key 时出现', () => {
    const input: GraphInput = {
      type: 'graph',
      algorithm: 'prim',
      // A 连 C：先经 B—C(2) 给 C key=2，再看 A—C(5) ≥ 2 → examine
      graph: {
        nodes: [
          { id: 'A', x: 0.15, y: 0.5 },
          { id: 'B', x: 0.5, y: 0.2 },
          { id: 'C', x: 0.85, y: 0.5 },
        ],
        edges: [
          { id: 'e1', from: 'A', to: 'B', directed: false, weight: 1 },
          { id: 'e2', from: 'B', to: 'C', directed: false, weight: 2 },
          { id: 'e3', from: 'A', to: 'C', directed: false, weight: 5 },
        ],
      },
      start: 'A',
      end: null,
    };
    const steps = collectSteps(primGen(input));
    const relaxes = steps.map((s) => s.semantic).filter((s) => s?.type === 'mst-relax') as Extract<StepSemantic, { type: 'mst-relax' }>[];
    // A 起步：relax B(1)、C(5)；B 入树后：relax C 5→2
    expect(relaxes.map((r) => [r.from, r.to, r.oldKey, r.newKey])).toEqual([
      ['A', 'B', null, 1],
      ['A', 'C', null, 5],
      ['B', 'C', 5, 2],
    ]);
    // C 入树（key=2, via B）后考察 A—C(5)：A 已在树，跳过——故本例无 examine；
    // examine 场景：候选 ≥ 当前 key 且目标未入树
    const input2: GraphInput = {
      type: 'graph',
      algorithm: 'prim',
      graph: {
        nodes: [
          { id: 'A', x: 0.15, y: 0.5 },
          { id: 'B', x: 0.5, y: 0.2 },
          { id: 'C', x: 0.85, y: 0.5 },
          { id: 'D', x: 0.5, y: 0.85 },
        ],
        edges: [
          { id: 'e1', from: 'A', to: 'B', directed: false, weight: 1 },
          { id: 'e2', from: 'A', to: 'C', directed: false, weight: 3 },
          { id: 'e3', from: 'B', to: 'C', directed: false, weight: 5 },
          { id: 'e4', from: 'B', to: 'D', directed: false, weight: 6 },
        ],
      },
      start: 'A',
      end: null,
    };
    const steps2 = collectSteps(primGen(input2));
    const examines = steps2.map((s) => s.semantic).filter((s) => s?.type === 'mst-examine') as Extract<StepSemantic, { type: 'mst-examine' }>[];
    // A 起步给 C key=3；B 入树后考察 B—C(5) ≥ 3 → examine
    expect(examines.map((e) => [e.from, e.to, e.weight, e.currentKey])).toEqual([['B', 'C', 5, 3]]);
  });

  it('非连通图：覆盖可达部分，正常结束', () => {
    const input: GraphInput = {
      type: 'graph',
      algorithm: 'prim',
      graph: {
        nodes: [
          { id: 'A', x: 0.2, y: 0.3 },
          { id: 'B', x: 0.4, y: 0.3 },
          { id: 'C', x: 0.7, y: 0.7 },
          { id: 'D', x: 0.9, y: 0.7 },
        ],
        edges: [
          { id: 'e1', from: 'A', to: 'B', directed: false, weight: 2 },
          { id: 'e2', from: 'C', to: 'D', directed: false, weight: 3 },
        ],
      },
      start: 'A',
      end: null,
    };
    const steps = collectSteps(primGen(input));
    const last = steps[steps.length - 1]!;
    expect(last.description).toContain('2/4');
    expect(last.description).toContain('不连通');
  });

  it('确定性：同输入两次运行 deepEqual', () => {
    const a = collectSteps(primGen(primInput()));
    const b = collectSteps(primGen(primInput()));
    expect(a).toEqual(b);
  });
});

describe('图 validate 新规则', () => {
  const undirected: GraphModel = {
    nodes: [{ id: 'A', x: 0.3, y: 0.3 }, { id: 'B', x: 0.7, y: 0.7 }],
    edges: [{ id: 'e1', from: 'A', to: 'B', directed: false, weight: 1 }],
  };
  const directed: GraphModel = {
    nodes: [{ id: 'A', x: 0.3, y: 0.3 }, { id: 'B', x: 0.7, y: 0.7 }],
    edges: [{ id: 'e1', from: 'A', to: 'B', directed: true, weight: 1 }],
  };

  it('topo-sort：start 允许 null；无向边拒绝；end 拒绝', () => {
    expect(validateGraphInput({ type: 'graph', algorithm: 'topo-sort', graph: directed, start: null, end: null })).toBeNull();
    expect(validateGraphInput({ type: 'graph', algorithm: 'topo-sort', graph: undirected, start: null, end: null })).toContain('有向图');
    expect(validateGraphInput({ type: 'graph', algorithm: 'topo-sort', graph: directed, start: 'X', end: null })).toContain('起点不存在');
    expect(validateGraphInput({ type: 'graph', algorithm: 'topo-sort', graph: directed, start: null, end: 'A' })).toContain('终点');
  });

  it('prim：start 仍必选', () => {
    expect(validateGraphInput({ type: 'graph', algorithm: 'prim', graph: undirected, start: null, end: null })).toContain('起点');
    expect(validateGraphInput({ type: 'graph', algorithm: 'prim', graph: undirected, start: 'A', end: null })).toBeNull();
  });
});
