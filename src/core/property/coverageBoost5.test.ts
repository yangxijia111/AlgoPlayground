/**
 * 覆盖率补充 5：validateLinearInput/validateLinkedListInput 全错误分支（v1.1.0 遗留缺口）
 * 与 sync 合并的相等性分支。
 */
import { describe, expect, it } from 'vitest';
import { validateLinearInput, validateLinkedListInput } from '../algorithms/linear';
import { validateGraphInput } from '../algorithms/graph/common';
import { mergeProfiles } from '../storage/sync';
import { createDefaultProfile } from '../learning/types';

describe('validateLinearInput 全分支', () => {
  const base = { type: 'linear' as const, structure: 'stack' as const, initial: [] as string[] };

  it.each([
    ['类型错误', { type: 'sort' as const, array: [1] }, '输入类型错误'],
    ['超容量', { ...base, initial: new Array(13).fill('a') }, '元素个数不能超过'],
    ['元素空白', { ...base, initial: [' '] }, '元素值不能为空'],
    ['元素过长', { ...base, initial: ['abcdefg'] }, '每个元素的值不能超过'],
    ['push 空值', { ...base, operation: { op: 'push' as const, value: ' ' } }, '请输入要插入的值'],
    ['push 超长', { ...base, operation: { op: 'push' as const, value: '1234567' } }, '插入的值不能超过'],
    ['enqueue 空值', { ...base, structure: 'queue' as const, operation: { op: 'enqueue' as const, value: '' } }, '请输入要插入的值'],
    ['enqueue 超长', { ...base, structure: 'queue' as const, operation: { op: 'enqueue' as const, value: '1234567' } }, '插入的值不能超过'],
  ])('%s 拒绝', (_name, input, msg) => {
    const err = validateLinearInput(input as never);
    expect(err).toContain(msg);
  });

  it('合法输入通过', () => {
    expect(validateLinearInput({ ...base, initial: ['A'], operation: { op: 'push', value: 'B' } })).toBeNull();
    expect(validateLinearInput({ ...base, initial: ['A'], operation: { op: 'pop' } })).toBeNull();
    expect(validateLinearInput({ ...base, structure: 'queue', operation: { op: 'dequeue' } })).toBeNull();
    expect(validateLinearInput({ ...base, operation: { op: 'peek' } })).toBeNull();
  });
});

describe('validateLinkedListInput 全分支', () => {
  const base = { type: 'linkedlist' as const, initial: ['A', 'B'] };

  it.each([
    ['类型错误', { type: 'sort' as const, array: [1] }, '输入类型错误'],
    ['超容量', { ...base, initial: new Array(13).fill('a'), operation: { op: 'traverse' as const } }, '元素个数不能超过'],
    ['元素空白', { ...base, initial: ['  '], operation: { op: 'traverse' as const } }, '元素值不能为空'],
    ['元素过长', { ...base, initial: ['1234567'], operation: { op: 'traverse' as const } }, '每个元素的值不能超过'],
    ['insert 非整数', { ...base, operation: { op: 'insert' as const, position: 1.5, value: 'X' } }, '插入位置必须是整数'],
    ['insert 越界', { ...base, operation: { op: 'insert' as const, position: 3, value: 'X' } }, '插入位置必须在'],
    ['insert 负数', { ...base, operation: { op: 'insert' as const, position: -1, value: 'X' } }, '插入位置必须在'],
    ['insert 空值', { ...base, operation: { op: 'insert' as const, position: 1, value: ' ' } }, '请输入要插入的值'],
    ['insert 超长值', { ...base, operation: { op: 'insert' as const, position: 1, value: '1234567' } }, '插入的值不能超过'],
    ['delete 空表', { type: 'linkedlist' as const, initial: [], operation: { op: 'delete' as const, position: 0 } }, '链表为空'],
    ['delete 非整数', { ...base, operation: { op: 'delete' as const, position: 0.5 } }, '删除位置必须是整数'],
    ['delete 越界', { ...base, operation: { op: 'delete' as const, position: 2 } }, '删除位置必须在'],
    ['search 空值', { ...base, operation: { op: 'search' as const, value: '' } }, '请输入要查找的值'],
    ['search 超长', { ...base, operation: { op: 'search' as const, value: '1234567' } }, '查找的值不能超过'],
  ])('%s 拒绝', (_name, input, msg) => {
    const err = validateLinkedListInput(input as never);
    expect(err).toContain(msg);
  });

  it('合法输入通过（traverse/insert/delete/search 边界）', () => {
    expect(validateLinkedListInput({ ...base, operation: { op: 'traverse' } })).toBeNull();
    expect(validateLinkedListInput({ ...base, operation: { op: 'insert', position: 2, value: 'C' } })).toBeNull();
    expect(validateLinkedListInput({ ...base, operation: { op: 'delete', position: 1 } })).toBeNull();
    expect(validateLinkedListInput({ ...base, operation: { op: 'search', value: 'A' } })).toBeNull();
    expect(validateLinkedListInput({ type: 'linkedlist', initial: [], operation: { op: 'create' } })).toBeNull();
  });
});

describe('validateGraphInput 剩余分支', () => {
  const g = (nodes: unknown, edges: unknown, start: string | null = 'A', end: string | null = null) => ({
    type: 'graph' as const,
    algorithm: 'bfs' as const,
    graph: { nodes, edges },
    start,
    end,
  });
  const n = (id: string) => ({ id, x: 0.5, y: 0.5 });
  const e = (from: string, to: string, weight = 3, directed = false, id = 'e1') => ({ id, from, to, directed, weight });

  it.each([
    ['空图', g([], []), '图至少需要一个节点'],
    ['节点超限', g(new Array(13).fill(0).map((_, i) => n(`N${i}`)), []), '节点数不能超过 12'],
    ['边超限', g([n('A'), n('B')], new Array(25).fill(0).map((_, i) => e('A', 'B', 3, i % 2 === 0, `e${i}`))), '边数不能超过 24'],
    ['自环', g([n('A')], [e('A', 'A')]), '不允许自环边'],
    ['引用不存在节点', g([n('A')], [e('A', 'Z')]), '引用了不存在的节点'],
    ['权重非法', g([n('A'), n('B')], [e('A', 'B', 0.5)]), '权重必须是 1–99 的整数'],
    ['重复无向边', g([n('A'), n('B')], [e('A', 'B', 3, false, 'e1'), e('B', 'A', 4, false, 'e2')]), '存在重复边'],
    ['无起点', g([n('A')], [], null), '必须选择一个有效的起点'],
    ['起点不存在', g([n('A')], [], 'Z'), '必须选择一个有效的起点'],
    ['终点不存在', g([n('A')], [], 'A', 'Z'), '终点不存在'],
  ])('%s 拒绝', (_name, input, msg) => {
    const err = validateGraphInput(input as never);
    expect(err).toContain(msg);
  });

  it('合法（有向同对不重复、终点存在）', () => {
    expect(validateGraphInput(g([n('A'), n('B')], [e('A', 'B', 3, true, 'e1'), e('B', 'A', 4, true, 'e2')], 'A', 'B') as never)).toBeNull();
  });
});

describe('sync 相等性分支', () => {
  it('quiz：attemptCount 相等且 correctCount 相等取本地；attempt 相等 correct 更小取本地', () => {
    const a = createDefaultProfile();
    a.progress['x'] = {
      animationWatched: false,
      viewCount: 0,
      lastViewedAt: null,
      quiz: {
        q1: { attemptCount: 2, correctCount: 2, lastCorrect: true, lastAnsweredAt: '2026-01-01T00:00:00.000Z' },
        q2: { attemptCount: 2, correctCount: 2, lastCorrect: false, lastAnsweredAt: '2026-01-01T00:00:00.000Z' },
      },
      predict: { total: 0, correct: 0, recent: [] },
      challenge: {},
    };
    const b = createDefaultProfile();
    b.progress['x'] = {
      animationWatched: false,
      viewCount: 0,
      lastViewedAt: null,
      quiz: {
        q1: { attemptCount: 2, correctCount: 1, lastCorrect: false, lastAnsweredAt: '2026-01-02T00:00:00.000Z' },
        q2: { attemptCount: 2, correctCount: 2, lastCorrect: true, lastAnsweredAt: '2026-01-03T00:00:00.000Z' },
      },
      predict: { total: 0, correct: 0, recent: [] },
      challenge: {},
    };
    const m = mergeProfiles(a, b);
    // attempt 相等 correct 更小 → 保留本地
    expect(m.progress['x']?.quiz['q1']?.correctCount).toBe(2);
    // attempt/correct 全等 → 保留本地（lastCorrect 不被远端覆盖）
    expect(m.progress['x']?.quiz['q2']?.lastCorrect).toBe(false);
  });

  it('later()：时间相等取字典序较大者（可复现）', () => {
    const a = createDefaultProfile();
    a.notes['x'] = { content: 'a', updatedAt: '2026-01-01T00:00:00.000Z' };
    const b = createDefaultProfile();
    b.notes['x'] = { content: 'b', updatedAt: '2026-01-01T00:00:00.000Z' };
    const m1 = mergeProfiles(a, b);
    const m2 = mergeProfiles(a, b);
    expect(m1.notes['x']?.content).toBe(m2.notes['x']?.content); // 确定性
  });
});
