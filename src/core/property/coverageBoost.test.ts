/**
 * 覆盖率补充：防御分支与兼容 fallback 的直接测试
 * （share 解码各 null 分支、semantic 工具、sync 合并边界、reducer 拒绝路径、
 *  strict 校验错误分支、Beginner/Predict fallback）。
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { registerAll, getAlgorithm } from '../registry';
import { allEntries } from '../algorithms';
import type { AlgorithmInput } from '../registry';
import { collectSteps } from '../step/step';
import type { VizStep } from '../step/step';
import { assertNeverSemantic, semanticTypeOf } from '../step/semantic';
import type { StepSemantic } from '../step/semantic';
import { applyLinearOperation, applyLinkedListOperation, applyBSTOperation, deleteFromSequence } from '../editors/structureState';
import { explainStepBeginner } from '../learning/beginner';
import { generatePredictQuestion } from '../predict/engine';
import { decodeInput, encodeInput, parseShareQuery } from '../share/url';
import { mergeProfiles } from '../storage/sync';
import { strictValidateProfile } from '../storage/migrate';
import { createDefaultProfile } from '../learning/types';
import { LearningStore } from '../storage/store';

registerAll(allEntries);

// ---------------------------------------------------------------------------
// semantic 工具
// ---------------------------------------------------------------------------

describe('semantic 工具函数', () => {
  it('semanticTypeOf 返回判别字段', () => {
    expect(semanticTypeOf({ type: 'push', value: 'A' })).toBe('push');
    expect(semanticTypeOf({ type: 'compare', indices: [0], values: [1], purpose: 'linear-scan' })).toBe('compare');
  });

  it('assertNeverSemantic 对未知类型抛错', () => {
    expect(() => assertNeverSemantic({ type: 'future-type' } as never)).toThrow('未处理的 StepSemantic 类型');
  });
});

// ---------------------------------------------------------------------------
// reducer 拒绝路径与辅助函数
// ---------------------------------------------------------------------------

describe('structureState 拒绝/辅助路径', () => {
  it('linear 满员 push 拒绝 / 队列空 dequeue 拒绝', () => {
    const full = new Array(12).fill('x');
    expect(applyLinearOperation(full, 'stack', { op: 'push', value: 'Y' })).toMatchObject({ rejected: true, removed: null });
    expect(applyLinearOperation([], 'queue', { op: 'dequeue' })).toMatchObject({ rejected: true });
    expect(applyLinearOperation([], 'stack', { op: 'pop' }).removed).toBeNull();
  });

  it('linkedlist 越界 insert / 空表 delete / search 不变', () => {
    expect(applyLinkedListOperation([], { op: 'insert', position: 5, value: 'A' }).rejected).toBe(true);
    expect(applyLinkedListOperation(new Array(12).fill('a'), { op: 'insert', position: 5, value: 'A' }).rejected).toBe(true);
    expect(applyLinkedListOperation([], { op: 'delete', position: 0 }).rejected).toBe(true);
    expect(applyLinkedListOperation(['a'], { op: 'search', value: 'a' }).next).toEqual(['a']);
    expect(applyLinkedListOperation(['a'], { op: 'traverse' }).next).toEqual(['a']);
  });

  it('bst insert 重复拒绝 / search、traverse 不变 / deleteFromSequence', () => {
    expect(applyBSTOperation([8, 3], { op: 'insert', value: 8 }).rejected).toBe(true);
    expect(applyBSTOperation([8, 3], { op: 'search', value: 3 }).next).toEqual([8, 3]);
    expect(applyBSTOperation([8, 3], { op: 'traverse', order: 'in' }).next).toEqual([8, 3]);
    expect(applyBSTOperation([8, 3], { op: 'build', values: [3, 8, 1] }).next).toEqual([3, 1, 8]);
    expect(deleteFromSequence([8, 3], 8)).toEqual([3]);
    expect(deleteFromSequence([8, 3], 99)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// share 解码防御分支（v1 各类型非法输入 + v2 损坏）
// ---------------------------------------------------------------------------

describe('share 解码防御分支', () => {
  const P = (s: string) => new URLSearchParams(s);

  it('v1 linear/linkedlist/bst 非法 op 与超限', () => {
    expect(decodeInput('linear', P('st=other&i=A&op=pop'))).toBeNull();
    expect(decodeInput('linear', P('st=stack&op=push:'))).toBeNull();
    expect(decodeInput('linear', P('st=stack&op=unknown'))).toBeNull();
    expect(decodeInput('linear', P('st=stack&i=' + 'a,'.repeat(13) + '&op=pop'))).toBeNull();
    expect(decodeInput('linkedlist', P('i=A&op=insert:99:X'))).toBeNull();
    expect(decodeInput('linkedlist', P('i=A&op=delete:99'))).toBeNull();
    expect(decodeInput('linkedlist', P('i=A&op=search:'))).toBeNull();
    expect(decodeInput('linkedlist', P('i=A&op=unknown'))).toBeNull();
    expect(decodeInput('bst', P('tree=8&op=build:x'))).toBeNull();
    expect(decodeInput('bst', P('tree=8&op=insert'))).toBeNull();
    expect(decodeInput('bst', P('tree=8&op=traverse:bad'))).toBeNull();
    expect(decodeInput('bst', P('tree=8&op=unknown'))).toBeNull();
  });

  it('v1 graph/dp/recursion 非法', () => {
    expect(decodeInput('graph', P('g=' + 'a'.repeat(20001)))).toBeNull();
    expect(decodeInput('recursion', P('k=other&n=3'))).toBeNull();
    expect(decodeInput('recursion', P('k=hanoi'))).toBeNull();
    expect(decodeInput('dp', P('k=other'))).toBeNull();
    expect(decodeInput('dp', P('k=knapsack&it=A:1:3'))).toBeNull(); // 缺 cap
    expect(decodeInput('dp', P('k=knapsack&cap=5'))).toBeNull(); // 缺 it
    expect(decodeInput('dp', P('k=fibonacci'))).toBeNull(); // 缺 n
    expect(decodeInput('dp', P('k=knapsack&it=A:100:3&cap=5'))).toBeNull(); // 权重越界
    expect(decodeInput('dp', P('k=knapsack&it=:2:3&cap=5'))).toBeNull(); // 名字空
  });

  it('v2 损坏 payload 各分支', () => {
    const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(parseShareQuery('sort', `v=2&d=${b64('{not json')}`)).toBeNull();
    expect(parseShareQuery('sort', `v=2&d=${b64('[]')}`)).toBeNull();
    expect(parseShareQuery('sort', `v=2&d=${b64(JSON.stringify({ v: 3 }))}`)).toBeNull();
    expect(parseShareQuery('sort', `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'a' }))}`)).toBeNull(); // in 缺失
    expect(parseShareQuery('sort', `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'a', in: { t: 'unknown' } }))}`)).toBeNull();
    // type 与路由不符
    expect(parseShareQuery('sort', `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'a', in: { t: 'graph', al: 'bfs', n: [['A', 0.5, 0.5]], e: [], st: 'A', en: null } }))}`)).toBeNull();
    // graph 自环 / 非法字段
    expect(parseShareQuery('graph', `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'bfs', in: { t: 'graph', al: 'bfs', n: [['A', 0.5, 0.5]], e: [['e', 'A', 'A', 0, 3]], st: 'A', en: null } }))}`)).toBeNull();
    expect(parseShareQuery('graph', `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'bfs', in: { t: 'graph', al: 'bfs', n: [['A', 1.5, 0.5]], e: [], st: 'A', en: null } }))}`)).toBeNull();
    expect(parseShareQuery('graph', `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'bfs', in: { t: 'graph', al: 'bfs', n: [['A', 0.5, 0.5]], e: [], st: 'B', en: null } }))}`)).toBeNull();
    // s/m 非法类型被忽略
    const ok = parseShareQuery('sort', `v=2&d=${b64(JSON.stringify({ v: 2, algo: 's', in: { t: 'sort', a: [1, 2] }, s: 'x', m: {} }))}`);
    expect(ok).not.toBeNull();
    expect(ok!.step).toBeNull();
    expect(ok!.beginnerMode).toBe(false);
  });

  it('v2 各类型非法字段', () => {
    const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const q = (payload: unknown, type: AlgorithmInput['type']) =>
      parseShareQuery(type, `v=2&d=${b64(JSON.stringify({ v: 2, algo: 'x', in: payload }))}`);
    expect(q({ t: 'sort', a: [1.5] }, 'sort')).toBeNull();
    expect(q({ t: 'search', v: 'other', a: [1], g: 1 }, 'search')).toBeNull();
    expect(q({ t: 'search', v: 'linear', a: [1], g: 1.5 }, 'search')).toBeNull();
    expect(q({ t: 'linear', st: 'other', i: [], op: 'pop' }, 'linear')).toBeNull();
    expect(q({ t: 'linear', st: 'stack', i: ['a'], op: 'unknown' }, 'linear')).toBeNull();
    expect(q({ t: 'linear', st: 'stack', i: [123], op: 'pop' }, 'linear')).toBeNull();
    expect(q({ t: 'linkedlist', i: ['a'], op: 'unknown' }, 'linkedlist')).toBeNull();
    expect(q({ t: 'bst', tree: [8], op: 'unknown:x' }, 'bst')).toBeNull();
    expect(q({ t: 'bst', tree: 'x', op: 'traverse:in' }, 'bst')).toBeNull();
    expect(q({ t: 'graph', al: 'other', n: [], e: [], st: 'A', en: null }, 'graph')).toBeNull();
    expect(q({ t: 'graph', al: 'bfs', n: [], e: [], st: 'A', en: null }, 'graph')).toBeNull();
    expect(q({ t: 'graph', al: 'bfs', n: [['A', 0.5, 0.5, 9]], e: [], st: 'A', en: null }, 'graph')).toBeNull();
    expect(q({ t: 'graph', al: 'bfs', n: [['A', 0.5, 0.5]], e: [['e', 'A', 'A', 2, 3]], st: 'A', en: null }, 'graph')).toBeNull();
    expect(q({ t: 'recursion', k: 'other', n: 3 }, 'recursion')).toBeNull();
    expect(q({ t: 'recursion', k: 'hanoi', n: 99 }, 'recursion')).toBeNull();
    expect(q({ t: 'nqueens', n: 99 }, 'nqueens')).toBeNull();
    expect(q({ t: 'dpf', n: 99 }, 'dp')).toBeNull();
    expect(q({ t: 'dpk', it: [['A', 0, 3]], cap: 5 }, 'dp')).toBeNull();
    expect(q({ t: 'dpk', it: [['A', 2, 3]], cap: 99 }, 'dp')).toBeNull();
    expect(q({ t: 'dpk', it: [['A', 2, 3, 4]], cap: 5 }, 'dp')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sync 合并边界
// ---------------------------------------------------------------------------

describe('sync 合并边界', () => {
  it('空 profile 与空 profile 合并 / 一侧全空', () => {
    const d = createDefaultProfile();
    expect(mergeProfiles(d, d)).toEqual(d);
  });

  it('notes 冲突取 updatedAt 新；bookmarks 冲突取 addedAt 新', () => {
    const a = createDefaultProfile();
    a.notes['x'] = { content: '旧', updatedAt: '2026-01-01T00:00:00.000Z' };
    a.bookmarks = [{ targetId: 'bfs', addedAt: '2026-01-01T00:00:00.000Z' }];
    const b = createDefaultProfile();
    b.notes['x'] = { content: '新', updatedAt: '2026-02-01T00:00:00.000Z' };
    b.bookmarks = [{ targetId: 'bfs', addedAt: '2026-03-01T00:00:00.000Z' }];
    const m = mergeProfiles(a, b);
    expect(m.notes['x']?.content).toBe('新');
    expect(m.bookmarks[0]?.addedAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('challenge/predict 域合并取并集语义', () => {
    const a = createDefaultProfile();
    a.progress['dfs'] = {
      animationWatched: true,
      viewCount: 2,
      lastViewedAt: null,
      quiz: {},
      predict: { total: 4, correct: 3, recent: [{ at: '2026-01-01T00:00:00.000Z', stepIndex: 0, stepType: 'compare', correct: true }] },
      challenge: { c1: { completed: true, bestMistakes: 2, attempts: 1, lastCompletedAt: '2026-01-02T00:00:00.000Z' } },
    };
    const b = createDefaultProfile();
    b.progress['dfs'] = {
      animationWatched: false,
      viewCount: 5,
      lastViewedAt: '2026-01-05T00:00:00.000Z',
      quiz: {},
      predict: { total: 2, correct: 2, recent: [{ at: '2026-01-03T00:00:00.000Z', stepIndex: 1, stepType: 'swap', correct: false }] },
      challenge: { c1: { completed: false, bestMistakes: 1, attempts: 3, lastCompletedAt: null } },
    };
    const m = mergeProfiles(a, b);
    const p = m.progress['dfs']!;
    expect(p.viewCount).toBe(5);
    expect(p.lastViewedAt).toBe('2026-01-05T00:00:00.000Z');
    expect(p.predict.total).toBe(4);
    expect(p.predict.recent.length).toBe(2);
    const c = p.challenge['c1']!;
    expect(c.completed).toBe(true);
    expect(c.bestMistakes).toBe(1);
    expect(c.attempts).toBe(3);
    expect(c.lastCompletedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// strict 校验错误分支
// ---------------------------------------------------------------------------

describe('strict 校验错误分支', () => {
  it('结构类型错误', () => {
    expect(strictValidateProfile('x').ok).toBe(false);
    expect(strictValidateProfile({ progress: 'x' }).ok).toBe(false);
    expect(strictValidateProfile({ progress: { a: 'x' } }).ok).toBe(false);
    expect(strictValidateProfile({ bookmarks: 'x' }).ok).toBe(false);
    expect(strictValidateProfile({ bookmarks: [{}] }).ok).toBe(false);
    expect(strictValidateProfile({ notes: 'x' }).ok).toBe(false);
    expect(strictValidateProfile({ notes: { a: {} } }).ok).toBe(false);
    expect(strictValidateProfile({ savedGraphs: 'x' }).ok).toBe(false);
    expect(strictValidateProfile({ savedGraphs: [{}] }).ok).toBe(false);
    expect(strictValidateProfile({ settings: 'x' }).ok).toBe(false);
    expect(strictValidateProfile({ settings: { beginnerMode: 1, welcomeDone: false } }).ok).toBe(false);
    expect(strictValidateProfile({ settings: { beginnerMode: false, welcomeDone: 'x' } }).ok).toBe(false);
  });

  it('progress 子域类型错误', () => {
    expect(strictValidateProfile({ progress: { a: { quiz: 'x' } } }).ok).toBe(false);
    expect(strictValidateProfile({ progress: { a: { quiz: { q: 'x' } } } }).ok).toBe(false);
    expect(strictValidateProfile({ progress: { a: { predict: 'x' } } }).ok).toBe(false);
    expect(strictValidateProfile({ progress: { a: { predict: { total: 1, correct: 0, recent: 'x' } } } }).ok).toBe(false);
    expect(strictValidateProfile({ progress: { a: { challenge: 'x' } } }).ok).toBe(false);
    expect(strictValidateProfile({ progress: { a: { animationWatched: 1 } } }).ok).toBe(false);
    expect(strictValidateProfile({ progress: { a: { viewCount: -1 } } }).ok).toBe(false);
    expect(
      strictValidateProfile({
        progress: { a: { challenge: { c: { completed: true, bestMistakes: 0, attempts: 1, lastCompletedAt: 'x' } } } },
      }).ok,
    ).toBe(false);
    expect(
      strictValidateProfile({
        progress: { a: { quiz: { q: { attemptCount: 1, correctCount: 0, lastCorrect: true, lastAnsweredAt: 'x' } } } },
      }).ok,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Beginner semantic 全类型 & Predict fallback
// ---------------------------------------------------------------------------

/** 逐个 semantic 类型生成解释，全部不抛错 */
describe('Beginner semantic 全类型安全', () => {
  const sampleSemantics: StepSemantic[] = [
    { type: 'write', index: 0, value: 1, source: 'insertion-place' },
    { type: 'write', index: 0, value: 1, source: 'merge-right' },
    { type: 'not-found', target: 9 },
    { type: 'pop', value: null, rejected: true },
    { type: 'pop', value: 'A' },
    { type: 'push', value: 'A', rejected: true },
    { type: 'enqueue', value: 'A', rejected: true },
    { type: 'dequeue', value: null, rejected: true },
    { type: 'dequeue', value: 'P' },
    { type: 'peek', value: null },
    { type: 'peek', value: 'A' },
    { type: 'front', value: null },
    { type: 'front', value: 'P' },
    { type: 'list-node-create', value: 'A' },
    { type: 'list-visit', index: 0, value: 'A' },
    { type: 'list-insert', position: 1, value: 'X' },
    { type: 'list-delete', position: 1, value: 'B' },
    { type: 'list-compare', index: 0, value: 'A', target: 'B', equal: false },
    { type: 'list-compare', index: 0, value: 'A', target: 'A', equal: true },
    { type: 'tree-descend', nodeId: 1, nodeValue: 8, query: 6, direction: 'hit' },
    { type: 'tree-descend', nodeId: 1, nodeValue: 8, query: 9, direction: 'root' },
    { type: 'tree-insert-place', nodeId: 9, value: 6 },
    { type: 'tree-delete', value: 8, caseType: 'leaf' },
    { type: 'tree-delete', value: 8, caseType: 'one-child' },
    { type: 'tree-delete', value: 8, caseType: 'two-children', successorValue: 10 },
    { type: 'tree-output', nodeId: 1, value: 8, order: 'post' },
    { type: 'tree-enqueue', value: 8 },
    { type: 'visit-node', nodeId: 'A', algorithm: 'dfs' },
    { type: 'frontier-add', nodeIds: ['B', 'C'], container: 'set' },
    { type: 'graph-examine', from: 'A', to: 'B', weight: 3, oldDistance: 5, candidate: 8 },
    { type: 'graph-finalize', nodeId: 'A', distance: 0 },
    { type: 'call', label: 'f(1)', note: '基准情形' },
    { type: 'return', label: 'f(1)', value: '1' },
    { type: 'return', label: 'h(1,A→C)', value: '完成' },
    { type: 'move', disk: 1, from: 'A', to: 'C' },
    { type: 'dp-fill', cell: 0, row: 0, col: 0, dependencies: [], value: 0, choice: 'base' },
    { type: 'dp-fill', cell: 1, row: 0, col: 1, dependencies: [0], value: 1, choice: 'sum' },
    { type: 'dp-fill', cell: 2, row: 1, col: 0, dependencies: [0], value: 3, choice: 'take' },
    { type: 'dp-fill', cell: 3, row: 1, col: 1, dependencies: [1], value: 3, choice: 'skip' },
    { type: 'dp-fill', cell: 4, row: 2, col: 0, dependencies: [2], value: 3, choice: 'copy' },
    { type: 'try-place', row: 0, col: 0, conflict: true, reason: '同列' },
    { type: 'try-place', row: 0, col: 1, conflict: false },
    { type: 'place', row: 0, col: 1 },
    { type: 'remove', row: 0, col: 1 },
    { type: 'backtrack', fromRow: 1, toRow: 0 },
    { type: 'solution-found', solution: [0, 1] },
  ];

  it.each(sampleSemantics.map((s) => [s.type, s] as const))('%s 生成解释不抛错', (_type, s) => {
    const step = {
      frame: {
        kind: 'array',
        values: [1, 2],
        comparing: [],
        swapping: [],
        sorted: [],
        pivot: null,
        range: null,
        pointers: {},
        target: 5,
        found: null,
        note: null,
      },
      description: 'x',
      pseudocodeLines: [0],
      counters: {},
      semantic: s,
    } as VizStep;
    expect(() => explainStepBeginner(step, null)).not.toThrow();
  });

  it('数组帧 semantic 与帧不匹配的防御（insertion-shift 无 pointers.key）', () => {
    const step = {
      frame: {
        kind: 'array',
        values: [1, 2],
        comparing: [0],
        swapping: [],
        sorted: [],
        pivot: null,
        range: null,
        pointers: {},
        target: null,
        found: null,
        note: null,
      },
      description: 'x',
      pseudocodeLines: [0],
      counters: {},
      semantic: { type: 'compare', indices: [0], values: [1], purpose: 'insertion-shift' },
    } as VizStep;
    expect(() => explainStepBeginner(step, null)).not.toThrow();
  });
});

describe('Predict fallback 与防御分支', () => {
  it('无 semantic 的兼容出题路径（frame-diff）', () => {
    // 冒泡 [3,1]：步骤 2 是 compare、步骤 3 是 swap（0/1 为 init/transition）
    const steps = collectSteps(getAlgorithm('bubble-sort')!.run({ type: 'sort', array: [3, 1] }));
    const q = generatePredictQuestion(steps, 1);
    expect(q).not.toBeNull(); // 语义路径
    expect(q!.kind).toBe('next-compare');
    // 手工去掉 semantic 强制走 frame-diff
    const bare = steps.map((s) => ({ ...s, semantic: undefined }));
    const q2 = generatePredictQuestion(bare, 1);
    expect(q2).not.toBeNull();
    expect(q2!.kind).toBe('next-compare');
    const q3 = generatePredictQuestion(bare, 2);
    expect(q3?.kind).toBe('next-swap');
  });

  it('pop semantic 与帧不一致时放弃出题（防御）', () => {
    const cur = {
      frame: { kind: 'structure', layout: 'stack', nodes: [{ id: 'n0-A', value: 'A', state: 'normal' }], pointers: {}, message: '' },
      description: '',
      pseudocodeLines: [],
      counters: {},
    } as unknown as VizStep;
    const next = {
      frame: { kind: 'structure', layout: 'stack', nodes: [], pointers: {}, message: '' },
      description: '',
      pseudocodeLines: [],
      counters: {},
      semantic: { type: 'pop', value: 'B' },
    } as unknown as VizStep;
    expect(generatePredictQuestion([cur, next], 0)).toBeNull();
  });

  it('binary-mid 出题：mid 来自 semantic payload（无 range 也可出题）', () => {
    const cur = {
      frame: { kind: 'array', values: [1, 2, 3], comparing: [], swapping: [], sorted: [], pivot: null, range: null, pointers: {}, target: 2, found: null, note: null },
      description: '',
      pseudocodeLines: [],
      counters: {},
    } as unknown as VizStep;
    const next = {
      frame: { kind: 'array', values: [1, 2, 3], comparing: [1], swapping: [], sorted: [], pivot: null, range: null, pointers: { mid: 1 }, target: 2, found: null, note: null },
      description: '',
      pseudocodeLines: [],
      counters: {},
      semantic: { type: 'compare', indices: [1], values: [2], purpose: 'binary-mid' },
    } as unknown as VizStep;
    const q = generatePredictQuestion([cur, next], 0);
    expect(q).not.toBeNull();
    expect(q!.options[q!.answerIndex]).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// store 杂项分支
// ---------------------------------------------------------------------------

describe('store 杂项', () => {
  it('dispose 取消同步订阅；isPersistent / getRevision / takeNotice 一次性', () => {
    const s = {
      data: new Map<string, string>(),
      getItem: () => null,
      setItem: () => void 0,
      removeItem: () => void 0,
    };
    const store = new LearningStore(s as never, () => new Date(), null);
    expect(store.isPersistent()).toBe(true);
    expect(store.getRevision()).toBe(0);
    expect(store.takeNotice()).toBe('fresh');
    expect(store.takeNotice()).toBeNull();
    store.dispose();
    expect(store.getProfile()).toBeDefined();
  });

  it('graph preset 保存超限截尾（>20）', () => {
    const s = {
      data: new Map<string, string>(),
      getItem: () => null,
      setItem: () => void 0,
      removeItem: () => void 0,
    };
    const store = new LearningStore(s as never, () => new Date('2026-09-22T10:00:00Z'), null);
    const g = { nodes: [{ id: 'A', x: 0.5, y: 0.5 }], edges: [] };
    for (let i = 0; i < 22; i++) store.saveGraphPreset(`p${i}`, g);
    store.flush();
    expect(store.getProfile().savedGraphs.length).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// v1 encode 全类型快检（decodeInput 各 case 的 happy path 已覆盖，encode 分支补齐）
// ---------------------------------------------------------------------------

describe('v1 encode 分支', () => {
  it('linkedlist delete/search、bst delete 编码可往返', () => {
    const cases: AlgorithmInput[] = [
      { type: 'linkedlist', initial: ['a'], operation: { op: 'delete', position: 0 } },
      { type: 'linkedlist', initial: ['a'], operation: { op: 'search', value: 'a' } },
      { type: 'bst', startTree: [8], operation: { op: 'delete', value: 8 } },
      { type: 'linear', structure: 'queue', initial: [], operation: { op: 'dequeue' } },
    ];
    for (const input of cases) {
      const decoded = decodeInput(input.type, new URLSearchParams(encodeInput(input)));
      expect(decoded, JSON.stringify(input)).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// 属性：stack/queue 快速回归（大容量序列）
// ---------------------------------------------------------------------------

describe('大容量序列（属性补强）', () => {
  it('push 满后继续 push 稳定拒绝', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), (extraPushes) => {
        let state: string[] = [];
        for (let i = 0; i < 12; i++) {
          state = applyLinearOperation(state, 'stack', { op: 'push', value: `v${i}` }).next;
        }
        for (let i = 0; i < extraPushes; i++) {
          const r = applyLinearOperation(state, 'stack', { op: 'push', value: 'x' });
          expect(r.rejected).toBe(true);
          expect(r.next).toBe(state);
        }
      }),
      { numRuns: 20 },
    );
  });
});
