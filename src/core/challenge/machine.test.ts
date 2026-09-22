/**
 * Challenge 状态机测试：正确序列通关、错误操作反馈、重复操作、Restart、与真实算法一致性。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { allEntries } from '../algorithms';
import { registerAll } from '../registry';
import { CHALLENGE_DEFS, getChallengeDef } from './defs';
import { actionsEqual, createMachine, restartMachine, submitAction } from './machine';
import type { ChallengeAction } from './types';

beforeAll(() => {
  registerAll(allEntries);
});

describe('机器构造（期望序列提取）', () => {
  it('全部挑战至少 1 个可交互步骤，且动作与真实步骤对应', () => {
    for (const def of CHALLENGE_DEFS) {
      const m = createMachine(def);
      expect(m.interactive.length, `${def.id} 无可交互步骤`).toBeGreaterThan(0);
      expect(m.status).toBe('active');
      // takeActions 截断生效
      if (def.takeActions !== undefined) {
        expect(m.interactive.length).toBe(def.takeActions);
      }
    }
  });

  it('挑战动作与真实算法行为一致（通关序列 = 真实交互子序列）', () => {
    for (const def of CHALLENGE_DEFS) {
      const m = createMachine(def);
      // 依次提交期望动作应全部被接受
      let cur = m;
      for (let i = 0; i < m.interactive.length; i++) {
        const expected = cur.interactive[cur.cursor]!;
        const r = submitAction(cur, expected.action);
        expect(r.accepted, `${def.id} 第 ${i + 1} 步应被接受`).toBe(true);
        cur = r.machine;
      }
      expect(cur.status, `${def.id} 通关`).toBe('completed');
      expect(cur.mistakes).toBe(0);
    }
  });
});

describe('submitAction 行为', () => {
  it('错误动作被拒绝：cursor 不动、mistakes+1、反馈含教学提示', () => {
    const def = getChallengeDef('bubble-pass')!;
    let m = createMachine(def);
    // 第一步期望是 compare(0,1)；提交错误动作
    const wrong: ChallengeAction = { kind: 'compare', indices: [1, 2] };
    const r = submitAction(m, wrong);
    expect(r.accepted).toBe(false);
    expect(r.machine.cursor).toBe(0);
    expect(r.machine.mistakes).toBe(1);
    expect(r.feedback).toContain('应该先比较下标 0 和 1');
    expect(r.error?.expected).toBeDefined();
    m = r.machine;
    // 错误后仍可按正确动作前进
    const expected = m.interactive[0]!.action;
    const r2 = submitAction(m, expected);
    expect(r2.accepted).toBe(true);
    expect(r2.machine.cursor).toBe(1);
  });

  it('交换与比较的 indices 顺序无关（归一比较）', () => {
    expect(actionsEqual({ kind: 'compare', indices: [2, 5] }, { kind: 'compare', indices: [5, 2] })).toBe(true);
    expect(actionsEqual({ kind: 'swap', indices: [0, 3] }, { kind: 'swap', indices: [3, 0] })).toBe(true);
    expect(actionsEqual({ kind: 'compare', indices: [0, 1] }, { kind: 'swap', indices: [0, 1] })).toBe(false);
    expect(actionsEqual({ kind: 'pick', value: 'B' }, { kind: 'pick', value: 'B' })).toBe(true);
    expect(actionsEqual({ kind: 'pick', value: 'B' }, { kind: 'pick', value: 'C' })).toBe(false);
    expect(actionsEqual({ kind: 'op', op: 'push', value: 'x' }, { kind: 'op', op: 'push', value: 'x' })).toBe(true);
    expect(actionsEqual({ kind: 'op', op: 'push', value: 'x' }, { kind: 'op', op: 'push', value: 'y' })).toBe(false);
  });

  it('完成后忽略后续动作', () => {
    const def = getChallengeDef('binary-search')!;
    let m = createMachine(def);
    while (m.status === 'active') {
      m = submitAction(m, m.interactive[m.cursor]!.action).machine;
    }
    const r = submitAction(m, { kind: 'pick', value: '9' });
    expect(r.accepted).toBe(false);
    expect(r.machine).toBe(m);
  });

  it('重复错误动作累计 mistakes', () => {
    const def = getChallengeDef('stack-ops')!;
    const m = createMachine(def);
    const before = m.mistakes;
    const wrong: ChallengeAction = { kind: 'op', op: 'pop' };
    let r = submitAction(m, wrong);
    r = submitAction(r.machine, wrong);
    expect(r.machine.mistakes).toBe(before + 2);
  });

  it('restart 重置全部状态', () => {
    const def = getChallengeDef('selection-round')!;
    let m = createMachine(def);
    m = submitAction(m, m.interactive[0]!.action).machine;
    m = { ...m, mistakes: 3 };
    const r = restartMachine(m);
    expect(r.cursor).toBe(0);
    expect(r.mistakes).toBe(0);
    expect(r.status).toBe('active');
    expect(r.interactive.length).toBe(m.interactive.length);
  });
});

describe('各挑战专属校验', () => {
  it('bubble-pass：期望序列是 6 步（3 比较 + 3 交换）且交替', () => {
    const m = createMachine(getChallengeDef('bubble-pass')!);
    expect(m.interactive.map((s) => s.action.kind)).toEqual([
      'compare', 'swap', 'compare', 'swap', 'compare', 'swap',
    ]);
  });

  it('binary-search：期望是按值的 pick 序列（5 → 9）', () => {
    const m = createMachine(getChallengeDef('binary-search')!);
    expect(m.interactive.map((s) => (s.action.kind === 'pick' ? s.action.value : ''))).toEqual(['5', '9']);
  });

  it('bst-search：期望访问 8 → 3 → 6', () => {
    const m = createMachine(getChallengeDef('bst-search')!);
    expect(m.interactive.map((s) => (s.action.kind === 'pick' ? s.action.value : ''))).toEqual(['8', '3', '6']);
  });

  it('bfs-order：期望访问序从 A 开始且覆盖全部 6 节点', () => {
    const m = createMachine(getChallengeDef('bfs-order')!);
    const picks = m.interactive.map((s) => (s.action.kind === 'pick' ? s.action.value : ''));
    expect(picks[0]).toBe('A');
    expect(new Set(picks)).toHaveLength(6);
  });

  it('stack-ops / queue-ops：期望动作与目标操作序列一致', () => {
    const stack = createMachine(getChallengeDef('stack-ops')!);
    expect(stack.interactive.map((s) => (s.action.kind === 'op' ? `${s.action.op}${s.action.value ?? ''}` : ''))).toEqual([
      'pushx', 'pushy', 'pop',
    ]);
    const queue = createMachine(getChallengeDef('queue-ops')!);
    expect(queue.interactive.map((s) => (s.action.kind === 'op' ? `${s.action.op}${s.action.value ?? ''}` : ''))).toEqual([
      'enqueuep', 'enqueueq', 'dequeue',
    ]);
  });

  it('selection-round：期望 3 比较 + 1 交换，交换目标是 (0,3)', () => {
    const m = createMachine(getChallengeDef('selection-round')!);
    const kinds = m.interactive.map((s) => s.action.kind);
    expect(kinds).toEqual(['compare', 'compare', 'compare', 'swap']);
    const last = m.interactive[3]!.action;
    expect(last.kind === 'swap' && [...last.indices].sort().join(',')).toBe('0,3');
  });
});
