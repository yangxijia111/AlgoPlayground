/**
 * 排序算法正确性与步骤完整性测试（TEST_PLAN T1.1 + T2 排序部分）。
 */
import { describe, expect, it } from 'vitest';
import { generateArray } from '../data';
import type { SortInput } from '../../registry';
import { collectSteps } from '../../step/step';
import { checkStepIntegrity } from '../../step/integrity';
import entries from './index';

const sortEntries = entries.map((e) => ({
  id: e.meta.id,
  pseudocodeLen: e.meta.pseudocode.length,
  run: (array: number[]) => collectSteps(e.run({ type: 'sort', array } as SortInput)),
}));

/** 排序正确性输入集（TEST_PLAN T1.1） */
const CASES: { name: string; array: number[] }[] = [
  { name: '空数组', array: [] },
  { name: '单元素', array: [1] },
  { name: '两元素逆序', array: [2, 1] },
  { name: '已有序', array: [1, 2, 3] },
  { name: '逆序', array: [3, 2, 1] },
  { name: '含重复', array: [2, 2, 1] },
  { name: '全相同', array: [5, 5, 5, 5] },
  { name: '含负数', array: [-3, 0, -7, 2] },
  { name: '随机 n=10', array: generateArray('random', 10, 42) },
  { name: '随机 n=30', array: generateArray('random', 30, 7) },
  { name: '随机 n=60 带重复', array: generateArray('fewUnique', 60, 99) },
];

const reference = (arr: number[]) => [...arr].sort((a, b) => a - b);

describe.each(sortEntries)('$id 排序正确性', ({ pseudocodeLen, run }) => {
  it.each(CASES)('$name → 与标准排序一致', ({ array }) => {
    const steps = run(array);
    const finalFrame = steps[steps.length - 1].frame;
    expect(finalFrame.kind).toBe('array');
    if (finalFrame.kind !== 'array') return;
    expect(finalFrame.values).toEqual(reference(array));
  });

  it('首个步骤为初始状态（与输入一致）', () => {
    const array = [4, 2, 9, 1];
    const steps = run(array);
    const first = steps[0].frame;
    if (first.kind === 'array') expect(first.values).toEqual(array);
  });

  it('counters 单调不减 + 伪代码行合法 + description 非空（完整性 T2）', () => {
    const steps = run(generateArray('random', 25, 3));
    expect(checkStepIntegrity(steps, pseudocodeLen)).toEqual([]);
  });

  it('counters 键集一致（完整性 T2）', () => {
    const steps = run(generateArray('nearlySorted', 20, 5));
    const keys = Object.keys(steps[0].counters).sort().join(',');
    expect(keys).toBe('comparisons,swaps,writes');
    for (let i = 1; i < steps.length; i++) {
      expect(Object.keys(steps[i].counters).sort().join(',')).toBe(keys);
    }
  });

  it('首步与末步 description 非空', () => {
    const steps = run(generateArray('reversed', 12, 8));
    expect(steps[0].description.trim()).not.toBe('');
    expect(steps[steps.length - 1].description.trim()).not.toBe('');
  });
});

describe('排序已知计数（防止计数器虚假）', () => {
  it('bubble-sort 对 [3,2,1]：3 次比较、3 次交换', () => {
    const entry = entries.find((e) => e.meta.id === 'bubble-sort');
    if (!entry) throw new Error('bubble-sort 未注册');
    const steps = collectSteps(entry.run({ type: 'sort', array: [3, 2, 1] }));
    const last = steps[steps.length - 1].counters;
    expect(last.comparisons).toBe(3);
    expect(last.swaps).toBe(3);
  });

  it('selection-sort 对 [3,2,1]：3 次比较、1 次交换', () => {
    const entry = entries.find((e) => e.meta.id === 'selection-sort');
    if (!entry) throw new Error('selection-sort 未注册');
    const steps = collectSteps(entry.run({ type: 'sort', array: [3, 2, 1] }));
    const last = steps[steps.length - 1].counters;
    expect(last.comparisons).toBe(3);
    expect(last.swaps).toBe(1);
  });
});

describe('排序边界行为', () => {
  it.each(sortEntries)('$id：空数组产出初始态+完成态且 ≥ 2 步', ({ run }) => {
    const steps = run([]);
    expect(steps.length).toBeGreaterThanOrEqual(2);
    const final = steps[steps.length - 1].frame;
    if (final.kind === 'array') {
      expect(final.values).toEqual([]);
      expect(final.sorted).toEqual([]);
    }
  });

  it.each(sortEntries)('$id：最终帧所有下标标记为已排序', ({ run }) => {
    const steps = run([5, 3, 8, 1, 9, 2]);
    const final = steps[steps.length - 1].frame;
    if (final.kind === 'array') {
      expect(final.sorted).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });
});
