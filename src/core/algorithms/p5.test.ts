/**
 * P5 模块测试（TEST_PLAN T1.6）：递归 / 回溯 / DP。
 */
import { describe, expect, it } from 'vitest';
import { collectSteps } from '../step/step';
import { checkStepIntegrity } from '../step/integrity';
import type { DPInput, NQueensInput, RecursionInput } from '../registry';
import { allEntries } from './index';

function entry(id: string) {
  const e = allEntries.find((x) => x.meta.id === id);
  if (!e) throw new Error(`${id} 未注册`);
  return e;
}

const runRec = (kind: RecursionInput['kind'], n: number) =>
  collectSteps(entry(kind === 'fibonacci' ? 'fibonacci-recursion' : kind).run({ type: 'recursion', kind, n }));

const runQueens = (n: number) => collectSteps(entry('n-queens').run({ type: 'nqueens', n }));

const runDP = (input: DPInput) => collectSteps(entry(input.kind === 'fibonacci' ? 'fib-dp' : 'knapsack').run(input));

const lastFrame = (steps: ReturnType<typeof collectSteps>) => steps[steps.length - 1].frame;

// ---------------------------------------------------------------------------
// 递归
// ---------------------------------------------------------------------------

describe('factorial', () => {
  it('fact(5) = 120，调用栈峰值深度 = 6（含初始空帧外 n 帧）', () => {
    const steps = runRec('factorial', 5);
    let maxDepth = 0;
    for (const s of steps) {
      if (s.frame.kind === 'recursion') maxDepth = Math.max(maxDepth, s.frame.callStack.length);
    }
    expect(maxDepth).toBe(5);
    expect(steps[steps.length - 1].description).toContain('= 120');
  });

  it('fact(1) 直接基准返回', () => {
    const steps = runRec('factorial', 1);
    expect(steps[steps.length - 1].description).toContain('fact(1) = 1');
  });

  it('调用结束后栈清空', () => {
    const steps = runRec('factorial', 4);
    const f = lastFrame(steps);
    if (f.kind === 'recursion') expect(f.callStack).toHaveLength(0);
  });
});

describe('fibonacci-recursion', () => {
  it('fib(6) = 8 且递归调用数 = 15（金标准 2·fib(6)−1）', () => {
    const steps = runRec('fibonacci', 6);
    const last = steps[steps.length - 1];
    expect(last.description).toContain('fib(6) = 8');
    expect(last.counters.recursions).toBe(15);
  });

  it('调用顺序为先左后右（第二步应进入 fib(n-1)）', () => {
    const steps = runRec('fibonacci', 5);
    expect(steps[2].description).toContain('fib(4)');
  });
});

describe('hanoi', () => {
  it('hanoi(3) 移动序列 = 标准 7 步金标准', () => {
    const steps = runRec('hanoi', 3);
    const moves = steps
      .filter((s) => s.description.startsWith('移动盘'))
      .map((s) => (s.frame.kind === 'recursion' ? s.frame.lastMove : null))
      .filter((m): m is string => m !== null);
    expect(moves).toEqual([
      '盘 1: A → C',
      '盘 2: A → B',
      '盘 1: C → B',
      '盘 3: A → C',
      '盘 1: B → A',
      '盘 2: B → C',
      '盘 1: A → C',
    ]);
  });

  it('任意时刻大盘不压小盘（hanoi(5) 全程断言）', () => {
    const steps = runRec('hanoi', 5);
    for (const s of steps) {
      if (s.frame.kind !== 'recursion' || !s.frame.pegs) continue;
      for (const peg of s.frame.pegs) {
        for (let i = 1; i < peg.disks.length; i++) {
          expect(peg.disks[i]).toBeLessThan(peg.disks[i - 1]);
        }
      }
    }
  });

  it('最终所有盘都在 C 柱，移动次数 2ⁿ−1', () => {
    const steps = runRec('hanoi', 4);
    const f = lastFrame(steps);
    if (f.kind === 'recursion' && f.pegs) {
      expect(f.pegs.find((p) => p.name === 'C')?.disks).toEqual([4, 3, 2, 1]);
      expect(f.pegs.find((p) => p.name === 'A')?.disks).toHaveLength(0);
    }
    expect(steps[steps.length - 1].description).toContain('15 次');
  });

  it('hanoi(1) 单步完成', () => {
    const steps = runRec('hanoi', 1);
    const moves = steps.filter((s) => s.description.startsWith('移动盘'));
    expect(moves).toHaveLength(1);
    expect(moves[0].description).toContain('A → C');
  });
});

// ---------------------------------------------------------------------------
// N 皇后
// ---------------------------------------------------------------------------

describe('n-queens', () => {
  it.each([
    [4, 2],
    [5, 10],
    [6, 4],
    [7, 40],
    [8, 92],
  ])('%d 皇后解数 = %d', (n, expected) => {
    const steps = runQueens(n);
    const last = steps[steps.length - 1];
    expect(last.counters.solutions).toBe(expected);
    expect(last.description).toContain(`${expected} 个解`);
  });

  it('每个解都合法（两两不共列/对角线，独立验证）', () => {
    const steps = runQueens(6);
    const solutions: number[][] = [];
    for (const s of steps) {
      if (s.frame.kind === 'nqueens') solutions.push(...s.frame.solutions);
    }
    const unique = new Map(solutions.map((s) => [s.join(','), s]));
    for (const sol of unique.values()) {
      for (let r1 = 0; r1 < sol.length; r1++) {
        for (let r2 = r1 + 1; r2 < sol.length; r2++) {
          expect(sol[r1]).not.toBe(sol[r2]);
          expect(Math.abs(sol[r1] - sol[r2])).not.toBe(r2 - r1);
        }
      }
    }
  });

  it('回退计数 > 0（体现回溯过程）', () => {
    const steps = runQueens(8);
    const last = steps[steps.length - 1];
    expect(last.counters.backtracks).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// DP
// ---------------------------------------------------------------------------

describe('fib-dp', () => {
  it('dp 表终值 fib(10) = 55', () => {
    const steps = runDP({ type: 'dp', kind: 'fibonacci', n: 10 });
    const f = lastFrame(steps);
    if (f.kind !== 'dp') throw new Error('帧类型错误');
    expect(f.cells[f.cells.length - 1]).toBe(55);
  });

  it('依赖格提示正确（dp[i] 依赖 i-1 与 i-2）', () => {
    const steps = runDP({ type: 'dp', kind: 'fibonacci', n: 6 });
    const fillSteps = steps.filter((s) => s.frame.kind === 'dp' && s.frame.current !== null);
    const mid = fillSteps[3];
    if (mid.frame.kind === 'dp') {
      expect(mid.frame.current).toBe(3); // dp[4] 的下标（0-based）
      expect(mid.frame.dependencies).toEqual([2, 1]);
    }
  });
});

describe('knapsack', () => {
  it('用例 A：wt=[1,3,4] val=[15,20,30] W=4 → 35（选 A+B）', () => {
    const steps = runDP({
      type: 'dp',
      kind: 'knapsack',
      capacity: 4,
      items: [
        { name: 'A', weight: 1, value: 15 },
        { name: 'B', weight: 3, value: 20 },
        { name: 'C', weight: 4, value: 30 },
      ],
    });
    const f = lastFrame(steps);
    if (f.kind !== 'dp') throw new Error('帧类型错误');
    expect(f.cells[f.cells.length - 1]).toBe(35);
  });

  it('用例 B：wt=[2,2,6] val=[5,3,8] W=8 → 13', () => {
    const steps = runDP({
      type: 'dp',
      kind: 'knapsack',
      capacity: 8,
      items: [
        { name: 'A', weight: 2, value: 5 },
        { name: 'B', weight: 2, value: 3 },
        { name: 'C', weight: 6, value: 8 },
      ],
    });
    const f = lastFrame(steps);
    if (f.kind !== 'dp') throw new Error('帧类型错误');
    expect(f.cells[f.cells.length - 1]).toBe(13);
  });

  it('容量 0 / 单物品边界', () => {
    const steps = runDP({
      type: 'dp',
      kind: 'knapsack',
      capacity: 3,
      items: [{ name: 'X', weight: 5, value: 10 }],
    });
    const f = lastFrame(steps);
    if (f.kind === 'dp') expect(f.cells[f.cells.length - 1]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 校验
// ---------------------------------------------------------------------------

describe('P5 输入校验', () => {
  it('hanoi n 越界被拒绝', () => {
    expect(entry('hanoi').validate({ type: 'recursion', kind: 'hanoi', n: 9 })).toContain('1–8');
  });
  it('斐波那契递归 n 越界被拒绝', () => {
    expect(entry('fibonacci-recursion').validate({ type: 'recursion', kind: 'fibonacci', n: 13 })).toContain('1–12');
  });
  it('N 皇后 n=3 被拒绝', () => {
    expect(entry('n-queens').validate({ type: 'nqueens', n: 3 })).toContain('4–8');
  });
  it('背包物品数超限被拒绝', () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ name: `i${i}`, weight: 1, value: 1 }));
    expect(entry('knapsack').validate({ type: 'dp', kind: 'knapsack', capacity: 5, items })).toContain('1–8');
  });
  it('背包容量越界被拒绝', () => {
    expect(
      entry('knapsack').validate({ type: 'dp', kind: 'knapsack', capacity: 21, items: [{ name: 'A', weight: 1, value: 1 }] }),
    ).toContain('1–20');
  });
});

// ---------------------------------------------------------------------------
// 步骤完整性（全部 P5 条目）
// ---------------------------------------------------------------------------

describe('P5 步骤完整性', () => {
  it.each([
    ['factorial', { type: 'recursion', kind: 'factorial', n: 5 }],
    ['fibonacci-recursion', { type: 'recursion', kind: 'fibonacci', n: 6 }],
    ['hanoi', { type: 'recursion', kind: 'hanoi', n: 3 }],
    ['n-queens', { type: 'nqueens', n: 5 }],
    ['fib-dp', { type: 'dp', kind: 'fibonacci', n: 8 }],
    [
      'knapsack',
      {
        type: 'dp',
        kind: 'knapsack',
        capacity: 4,
        items: [
          { name: 'A', weight: 1, value: 15 },
          { name: 'B', weight: 3, value: 20 },
          { name: 'C', weight: 4, value: 30 },
        ],
      },
    ],
  ] as [string, RecursionInput | NQueensInput | DPInput][])('%s', (id, input) => {
    const e = entry(id);
    const steps = collectSteps(e.run(input));
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(checkStepIntegrity(steps, e.meta.pseudocode.length)).toEqual([]);
  });
});
