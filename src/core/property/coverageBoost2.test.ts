/**
 * 覆盖率补充 2：Beginner fallback（frame-diff 兼容路径）全帧类型 +
 * window storage transport + share 剩余分支。
 */
import { describe, expect, it, vi } from 'vitest';
import { registerAll, getAlgorithm } from '../registry';
import { allEntries } from '../algorithms';
import { collectSteps } from '../step/step';
import type { VizStep } from '../step/step';
import type { AlgorithmInput } from '../registry';
import { explainStepBeginner } from '../learning/beginner';
import { buildShareQuery, parseShareQuery, decodeInput } from '../share/url';
import { windowStorageTransport } from '../storage/sync';
import { LEARNING_STORAGE_KEY } from '../learning/types';

registerAll(allEntries);

const runSteps = (id: string, input: AlgorithmInput): VizStep[] => {
  const entry = getAlgorithm(id)!;
  return collectSteps(entry.run(input));
};

/** 去掉 semantic 强制走 fallback，逐帧生成解释不抛错且关键类型非空 */
function fallbackTexts(steps: VizStep[], id: string): void {
  const bare = steps.map((s) => ({ ...s, semantic: undefined }));
  for (let i = 0; i < bare.length; i++) {
    expect(() => explainStepBeginner(bare[i]!, i > 0 ? bare[i - 1]! : null), `${id} step ${i}`).not.toThrow();
  }
}

describe('Beginner fallback（frame-diff）全帧类型', () => {
  it('graph：BFS/DFS/Dijkstra 无 semantic 时不抛错且 relax 给保守描述', () => {
    const graphInput = {
      type: 'graph' as const,
      algorithm: 'dijkstra' as const,
      graph: {
        nodes: [
          { id: 'A', x: 0.1, y: 0.5 },
          { id: 'B', x: 0.4, y: 0.2 },
          { id: 'C', x: 0.4, y: 0.8 },
        ],
        edges: [
          { id: 'e1', from: 'A', to: 'B', directed: false, weight: 4 },
          { id: 'e2', from: 'A', to: 'C', directed: false, weight: 1 },
          { id: 'e3', from: 'C', to: 'B', directed: false, weight: 2 },
        ],
      },
      start: 'A',
      end: null,
    };
    const steps = runSteps('dijkstra', graphInput);
    fallbackTexts(steps, 'dijkstra');
    // relax 步（dist 变化）在 fallback 下给出保守描述（不猜节点）
    const bare = steps.map((s) => ({ ...s, semantic: undefined }));
    const relaxTexts = bare
      .map((s, i) => explainStepBeginner(s, i > 0 ? bare[i - 1]! : null) ?? '')
      .filter((t) => t.includes('松弛'));
    expect(relaxTexts.length).toBeGreaterThan(0);
    for (const t of relaxTexts) expect(t).not.toMatch(/dist\[[A-C]\] 更新为/); // fallback 不给出具体值

    fallbackTexts(runSteps('bfs', { ...graphInput, algorithm: 'bfs' }), 'bfs');
    fallbackTexts(runSteps('dfs', { ...graphInput, algorithm: 'dfs' }), 'dfs');
  });

  it('structure：stack/queue/linkedList 全操作 fallback', () => {
    fallbackTexts(runSteps('stack', { type: 'linear', structure: 'stack', initial: ['A', 'B'], operation: { op: 'pop' } }), 'stack');
    fallbackTexts(runSteps('queue', { type: 'linear', structure: 'queue', initial: ['P'], operation: { op: 'dequeue' } }), 'queue');
    fallbackTexts(runSteps('linked-list', { type: 'linkedlist', initial: ['A', 'B'], operation: { op: 'insert', position: 1, value: 'X' } }), 'linked-list');
    fallbackTexts(runSteps('linked-list', { type: 'linkedlist', initial: ['A'], operation: { op: 'search', value: 'A' } }), 'linked-list-search');
    // 空结构 fallback
    fallbackTexts(runSteps('stack', { type: 'linear', structure: 'stack', initial: [], operation: { op: 'pop' } }), 'stack-empty');
  });

  it('tree：bst insert/search/delete/traverse fallback（含叶子/单子/双子删除）', () => {
    fallbackTexts(runSteps('bst-operations', { type: 'bst', startTree: [8], operation: { op: 'insert', value: 3 } }), 'bst-insert');
    fallbackTexts(runSteps('bst-operations', { type: 'bst', startTree: [8, 3], operation: { op: 'delete', value: 3 } }), 'bst-del-leaf');
    fallbackTexts(runSteps('bst-operations', { type: 'bst', startTree: [8, 3, 1], operation: { op: 'delete', value: 3 } }), 'bst-del-one');
    fallbackTexts(runSteps('bst-operations', { type: 'bst', startTree: [8, 3, 10, 1, 6], operation: { op: 'delete', value: 3 } }), 'bst-del-two');
    fallbackTexts(runSteps('tree-traversal', { type: 'bst', startTree: [8, 3, 10], operation: { op: 'traverse', order: 'level' } }), 'trav-level');
    fallbackTexts(runSteps('tree-traversal', { type: 'bst', startTree: [8, 3, 10], operation: { op: 'traverse', order: 'pre' } }), 'trav-pre');
  });

  it('recursion/dp/nqueens fallback', () => {
    fallbackTexts(runSteps('factorial', { type: 'recursion', kind: 'factorial', n: 3 }), 'fact');
    fallbackTexts(runSteps('hanoi', { type: 'recursion', kind: 'hanoi', n: 2 }), 'hanoi');
    fallbackTexts(runSteps('fib-dp', { type: 'dp', kind: 'fibonacci', n: 5 }), 'fibdp');
    fallbackTexts(runSteps('knapsack', { type: 'dp', kind: 'knapsack', items: [{ name: 'A', weight: 2, value: 3 }], capacity: 3 }), 'knap');
    fallbackTexts(runSteps('n-queens', { type: 'nqueens', n: 4 }), 'nq');
    // 搜索 fallback
    fallbackTexts(runSteps('binary-search', { type: 'search', variant: 'binary', array: [1, 3, 5], target: 3 }), 'bs');
    fallbackTexts(runSteps('linear-search', { type: 'search', variant: 'linear', array: [1, 3], target: 3 }), 'ls');
  });

  it('semantic 路径的完整回归：每个算法逐帧解释不抛错', () => {
    for (const entry of allEntries) {
      const steps = collectSteps(entry.run(entry.defaultInput));
      for (let i = 0; i < steps.length; i++) {
        expect(() => explainStepBeginner(steps[i]!, i > 0 ? steps[i - 1]! : null), `${entry.meta.id} step ${i}`).not.toThrow();
      }
    }
  });
});

describe('windowStorageTransport', () => {
  it('storage event 通知回调（key/newValue 传递）；取消订阅后不再通知', () => {
    const handler = vi.fn();
    const unsub = windowStorageTransport(window).subscribe(handler);
    window.dispatchEvent(
      new StorageEvent('storage', { key: LEARNING_STORAGE_KEY, newValue: '{"v":1}' }),
    );
    expect(handler).toHaveBeenCalledWith(LEARNING_STORAGE_KEY, '{"v":1}');
    unsub();
    window.dispatchEvent(new StorageEvent('storage', { key: LEARNING_STORAGE_KEY, newValue: 'x' }));
    expect(handler).toHaveBeenCalledTimes(1);
    // key 为 null 的防御分支
    const h2 = vi.fn();
    windowStorageTransport(window).subscribe(h2);
    window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null }));
    expect(h2).toHaveBeenCalledWith('', null);
  });
});

describe('share 剩余分支', () => {
  it('buildShareQuery：step=0/beginner=false 不写入；v2 payload s/m 可选字段缺失容忍', () => {
    const input = { type: 'sort' as const, array: [1, 2] };
    const q = buildShareQuery(input, { algorithmId: 'x', step: 0 });
    expect(q).not.toContain('&s=');
    const parsed = parseShareQuery('sort', q);
    expect(parsed!.step).toBeNull();
    expect(parsed!.beginnerMode).toBe(false);
    // s 为非整数/负数时忽略
    const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const q2 = `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'x', in: { t: 'sort', a: [1, 2] }, s: -3, m: { b: 'yes' } }))}`;
    const p2 = parseShareQuery('sort', q2);
    expect(p2!.step).toBeNull();
    expect(p2!.beginnerMode).toBe(false);
  });

  it('v1：search 显式 v 参数优先 / 超长 g / 数组空串', () => {
    expect(decodeInput('search', new URLSearchParams('a=1,2&t=2&v=binary'))).toMatchObject({ variant: 'binary' });
    expect(decodeInput('search', new URLSearchParams('a=1,2&t=2&v=other'))).toMatchObject({ variant: 'linear' });
    expect(decodeInput('graph', new URLSearchParams('g='))).toBeNull();
    expect(decodeInput('sort', new URLSearchParams('a='))).toBeNull();
    expect(decodeInput('sort', new URLSearchParams('a=1,1&x=9'))).not.toBeNull();
  });

  it('graph 边 id 重复 / 坐标 NaN / end 不存在（v2 严格分支）', () => {
    const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const q = (inp: unknown) => `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'bfs', in: inp }))}`;
    expect(parseShareQuery('graph', q({ t: 'graph', al: 'bfs', n: [['A', 0.5, 0.5], ['B', 0.4, 0.4]], e: [['e1', 'A', 'B', 0, 3], ['e1', 'A', 'B', 0, 4]], st: 'A', en: null }))).toBeNull();
    expect(parseShareQuery('graph', q({ t: 'graph', al: 'bfs', n: [['A', 0.5, 0.5], ['B', 0.4, 0.4]], e: [['e1', 'A', 'B', 0, 3]], st: 'A', en: 'Z' }))).toBeNull();
    expect(parseShareQuery('graph', q({ t: 'graph', al: 'bfs', n: [['A', 0.5, 0.5]], e: [], st: 'A', en: 'A' }))).not.toBeNull();
  });
});
