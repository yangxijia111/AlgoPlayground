/**
 * 覆盖率补充 3：Predict frame-diff 兼容函数的直接测试。
 * semantic-first 后这些 fallback 只在 semantic 缺失/不出题时走到，
 * 用手工构造的无 semantic 帧对直接驱动各分支。
 */
import { describe, expect, it } from 'vitest';
import type { VizStep } from '../step/step';
import { generatePredictQuestion, gradePredict } from '../predict/engine';

/** 无 semantic 的步骤对 */
function pair(curFrame: VizStep['frame'], nextFrame: VizStep['frame']): VizStep[] {
  const base = { description: 'd', pseudocodeLines: [0], counters: {} };
  return [
    { ...base, frame: curFrame } as VizStep,
    { ...base, frame: nextFrame } as VizStep,
  ];
}

describe('Predict 兼容 fallback（frame-diff）', () => {
  it('graph visit：current 变化出 next-visit', () => {
    const g = (current: string | null, frontier: string[]) => ({
      kind: 'graph' as const,
      nodes: [
        { id: 'A', x: 0.1, y: 0.5, state: 'normal' as const, distance: null, predecessor: null },
        { id: 'B', x: 0.4, y: 0.2, state: 'normal' as const, distance: null, predecessor: null },
        { id: 'C', x: 0.8, y: 0.5, state: 'normal' as const, distance: null, predecessor: null },
        { id: 'D', x: 0.2, y: 0.8, state: 'normal' as const, distance: null, predecessor: null },
        { id: 'E', x: 0.6, y: 0.9, state: 'normal' as const, distance: null, predecessor: null },
      ],
      edges: [],
      current,
      frontier: frontier.map((id) => ({ id, state: 'special' as const })),
      frontierKind: 'queue' as const,
      message: '',
    });
    const q = generatePredictQuestion(pair(g('A', ['B', 'C']), g('B', ['C'])), 0);
    expect(q).not.toBeNull();
    expect(q!.kind).toBe('next-visit');
    expect(q!.options[q!.answerIndex]).toBe('B');
  });

  it('graph relax：恰好一个节点 dist 变化出 next-relax；多个变化时保守跳过', () => {
    const g = (dist: [number | null, number | null, number | null]) => ({
      kind: 'graph' as const,
      nodes: [
        { id: 'A', x: 0.1, y: 0.5, state: 'normal' as const, distance: dist[0], predecessor: null },
        { id: 'B', x: 0.4, y: 0.2, state: 'normal' as const, distance: dist[1], predecessor: dist[1] === null ? null : 'A' },
        { id: 'C', x: 0.8, y: 0.5, state: 'normal' as const, distance: dist[2], predecessor: null },
      ],
      edges: [],
      current: 'A',
      frontier: [],
      frontierKind: 'queue' as const,
      message: '',
    });
    const one = generatePredictQuestion(pair(g([0, null, null]), g([0, 5, null])), 0);
    expect(one?.kind).toBe('next-relax');
    expect(one!.options[one!.answerIndex]).toBe('5');
    const multi = generatePredictQuestion(pair(g([0, null, null]), g([0, 5, 7])), 0);
    expect(multi).toBeNull(); // 多目标无法确知 → 不出题（v1.1.0 曾猜错）
  });

  it('graph frontier-add：队列增长出题', () => {
    const g = (frontier: string[]) => ({
      kind: 'graph' as const,
      nodes: [
        { id: 'A', x: 0.1, y: 0.5, state: 'normal' as const, distance: 0, predecessor: null },
        { id: 'B', x: 0.4, y: 0.2, state: 'normal' as const, distance: null, predecessor: null },
        { id: 'C', x: 0.8, y: 0.5, state: 'normal' as const, distance: null, predecessor: null },
      ],
      edges: [],
      current: null,
      frontier: frontier.map((id) => ({ id, state: 'special' as const })),
      frontierKind: 'queue' as const,
      message: '',
    });
    const q = generatePredictQuestion(pair(g(['A']), g(['A', 'B'])), 0);
    expect(q?.kind).toBe('next-frontier-add');
    expect(q!.options[q!.answerIndex]).toBe('B');
  });

  it('structure：入栈/出队 fallback 出题', () => {
    const s = (nodes: { id: string; value: string }[], layout: 'stack' | 'queue') => ({
      kind: 'structure' as const,
      layout,
      nodes: nodes.map((n) => ({ ...n, state: 'normal' as const })),
      pointers: {},
      message: '',
    });
    const push = generatePredictQuestion(
      pair(s([{ id: 'a', value: 'A' }, { id: 'z', value: 'Z' }], 'stack'), s([{ id: 'a', value: 'A' }, { id: 'z', value: 'Z' }, { id: 'b', value: 'B' }], 'stack')),
      0,
    );
    expect(push?.kind).toBe('next-push');
    expect(push!.options[push!.answerIndex]).toBe('B');
    const pop = generatePredictQuestion(
      pair(
        s([{ id: 'a', value: 'A' }, { id: 'z', value: 'Z' }, { id: 'y', value: 'Y' }], 'stack'),
        s([{ id: 'a', value: 'A' }, { id: 'z', value: 'Z' }], 'stack'),
      ),
      0,
    );
    expect(pop?.kind).toBe('next-pop');
    expect(pop!.options[pop!.answerIndex]).toBe('Y');
    const deq = generatePredictQuestion(
      pair(
        s([{ id: 'a', value: 'A' }, { id: 'b', value: 'B' }, { id: 'c', value: 'C' }], 'queue'),
        s([{ id: 'b', value: 'B' }, { id: 'c', value: 'C' }], 'queue'),
      ),
      0,
    );
    expect(deq?.kind).toBe('next-dequeue');
    expect(deq!.options[deq!.answerIndex]).toBe('A');
    // 无变化不出题
    expect(generatePredictQuestion(pair(s([], 'stack'), s([], 'stack')), 0)).toBeNull();
  });

  it('tree：newlyActive 出 next-tree-node；无新 active 不出题', () => {
    const t = (activeIds: number[]) => ({
      kind: 'tree' as const,
      nodes: [
        { id: 1, value: 8, x: 0.5, y: 0.2, state: (activeIds.includes(1) ? 'active' : 'normal') as 'active' | 'normal' },
        { id: 2, value: 3, x: 0.3, y: 0.6, state: (activeIds.includes(2) ? 'active' : 'normal') as 'active' | 'normal' },
        { id: 3, value: 10, x: 0.7, y: 0.6, state: (activeIds.includes(3) ? 'active' : 'normal') as 'active' | 'normal' },
      ],
      edges: [],
      highlight: [],
      output: [],
      message: '',
    });
    const q = generatePredictQuestion(pair(t([1]), t([1, 2])), 0);
    expect(q?.kind).toBe('next-tree-node');
    expect(q!.options[q!.answerIndex]).toBe('3');
    expect(generatePredictQuestion(pair(t([1]), t([1])), 0)).toBeNull();
  });

  it('dp：下一格值 fallback 出题', () => {
    const d = (current: number | null, cells: (number | null)[]) => ({
      kind: 'dp' as const,
      rowHeaders: ['dp'],
      colHeaders: ['1', '2', '3'],
      cells,
      current,
      dependencies: current === 2 ? [0, 1] : [],
      message: '',
      extras: { label: '', items: [] },
    });
    const q = generatePredictQuestion(pair(d(1, [1, 1, null]), d(2, [1, 1, 2])), 0);
    expect(q?.kind).toBe('next-dp-cell');
    expect(q!.options[q!.answerIndex]).toBe('2');
    expect(generatePredictQuestion(pair(d(null, [1, null]), d(null, [1, null])), 0)).toBeNull();
  });

  it('recursion：调用栈增长出 next-call', () => {
    const r = (stack: string[]) => ({
      kind: 'recursion' as const,
      callStack: stack.map((label) => ({ id: label, label, state: 'active' as const, returnValue: null })),
      pegs: null,
      lastMove: null,
      memo: null,
      message: '',
    });
    const q = generatePredictQuestion(pair(r(['f(4)', 'f(3)']), r(['f(4)', 'f(3)', 'f(2)'])), 0);
    expect(q?.kind).toBe('next-call');
    expect(q!.options[q!.answerIndex]).toBe('f(2)');
    // 栈收缩（return）不出 call 题
    expect(generatePredictQuestion(pair(r(['f(3)', 'f(2)']), r(['f(3)'])), 0)).toBeNull();
  });

  it('gradePredict 判分', () => {
    const q = generatePredictQuestion(
      pair(
        { kind: 'structure', layout: 'stack', nodes: [{ id: 'a', value: 'A', state: 'normal' }, { id: 'z', value: 'Z', state: 'normal' }], pointers: {}, message: '' },
        { kind: 'structure', layout: 'stack', nodes: [{ id: 'a', value: 'A', state: 'normal' }, { id: 'z', value: 'Z', state: 'normal' }, { id: 'b', value: 'B', state: 'normal' }], pointers: {}, message: '' },
      ),
      0,
    )!;
    expect(gradePredict(q, q.answerIndex)).toBe(true);
    expect(gradePredict(q, (q.answerIndex + 1) % q.options.length)).toBe(false);
  });

  it('索引越界防御', () => {
    const steps = pair(
      { kind: 'structure', layout: 'stack', nodes: [], pointers: {}, message: '' },
      { kind: 'structure', layout: 'stack', nodes: [], pointers: {}, message: '' },
    );
    expect(generatePredictQuestion(steps, -1)).toBeNull();
    expect(generatePredictQuestion(steps, 1)).toBeNull(); // index+1 越界
    expect(generatePredictQuestion([], 0)).toBeNull();
  });
});
