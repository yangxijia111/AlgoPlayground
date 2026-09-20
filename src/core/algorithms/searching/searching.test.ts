/**
 * 搜索算法测试（TEST_PLAN T1.2）。
 */
import { describe, expect, it } from 'vitest';
import { collectSteps } from '../../step/step';
import { checkStepIntegrity } from '../../step/integrity';
import entries from './index';

function run(id: string, array: number[], target: number) {
  const entry = entries.find((e) => e.meta.id === id);
  if (!entry) throw new Error(`${id} 未注册`);
  return collectSteps(entry.run({ type: 'search', variant: id === 'binary-search' ? 'binary' : 'linear', array, target }));
}

const lastFrameValues = (steps: ReturnType<typeof run>) => {
  const f = steps[steps.length - 1].frame;
  if (f.kind !== 'array') throw new Error('帧类型错误');
  return f;
};

describe('linear-search', () => {
  it.each([
    { name: '命中首元素', array: [4, 8, 15], target: 4, found: 0 },
    { name: '命中中元素', array: [4, 8, 15], target: 8, found: 1 },
    { name: '命中末元素', array: [4, 8, 15], target: 15, found: 2 },
    { name: '未找到', array: [4, 8, 15], target: 9, found: null },
    { name: '空数组', array: [], target: 1, found: null },
    { name: '单元素命中', array: [7], target: 7, found: 0 },
    { name: '单元素不命中', array: [7], target: 3, found: null },
    { name: '重复值取首个', array: [5, 5, 5], target: 5, found: 0 },
  ])('$name', ({ array, target, found }) => {
    const steps = run('linear-search', array, target);
    const f = lastFrameValues(steps);
    expect(f.found).toBe(found);
  });

  it('比较次数 = 命中下标 + 1（或数组长度）', () => {
    expect(run('linear-search', [4, 8, 15], 15)[0].counters.comparisons).toBe(0);
    const steps = run('linear-search', [4, 8, 15], 15);
    expect(steps[steps.length - 1].counters.comparisons).toBe(3);
  });

  it('步骤完整性', () => {
    const entry = entries.find((e) => e.meta.id === 'linear-search');
    const steps = run('linear-search', [3, 1, 2], 2);
    expect(checkStepIntegrity(steps, (entry?.meta.pseudocode.length ?? 0))).toEqual([]);
  });
});

describe('binary-search', () => {
  const SORTED = [-5, -1, 0, 3, 7, 7, 9];

  it.each([
    { name: '命中首元素', target: -5, found: 0 },
    { name: '命中末元素', target: 9, found: 6 },
    { name: '命中中间', target: 3, found: 3 },
    { name: '重复值命中其一', target: 7, found: 5 },
    { name: '不存在（小于全部）', target: -9, found: null },
    { name: '不存在（夹缝）', target: 4, found: null },
    { name: '不存在（大于全部）', target: 100, found: null },
  ])('$name', ({ target, found }) => {
    const steps = run('binary-search', SORTED, target);
    const f = lastFrameValues(steps);
    expect(f.found).toBe(found);
  });

  it('空数组直接报告未找到', () => {
    const steps = run('binary-search', [], 5);
    expect(steps.length).toBe(2);
    expect(lastFrameValues(steps).found).toBeNull();
  });

  it('单元素命中/不命中', () => {
    expect(lastFrameValues(run('binary-search', [5], 5)).found).toBe(0);
    expect(lastFrameValues(run('binary-search', [5], 6)).found).toBeNull();
  });

  it('比较次数上界符合 O(log n)：n=7 时 ≤ 3 次', () => {
    const steps = run('binary-search', SORTED, 100);
    expect(steps[steps.length - 1].counters.comparisons).toBeLessThanOrEqual(3);
  });

  it('每步都有 range 区间且逐步收缩（非递增）', () => {
    const steps = run('binary-search', SORTED, 100);
    const ranges: number[] = [];
    for (const s of steps) {
      const f = s.frame;
      if (f.kind === 'array' && f.range) ranges.push(f.range[1] - f.range[0]);
    }
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i]).toBeLessThanOrEqual(ranges[i - 1]);
    }
    expect(ranges[ranges.length - 1]).toBeLessThan(ranges[0]);
  });

  it('步骤完整性', () => {
    const entry = entries.find((e) => e.meta.id === 'binary-search');
    const steps = run('binary-search', SORTED, 4);
    expect(checkStepIntegrity(steps, entry?.meta.pseudocode.length ?? 0)).toEqual([]);
  });
});

describe('搜索输入校验', () => {
  const entry = entries.find((e) => e.meta.id === 'binary-search');
  it('无序数组被拒绝并给出中文提示', () => {
    const err = entry?.validate({ type: 'search', variant: 'binary', array: [3, 1, 2], target: 1 });
    expect(err).toContain('升序');
  });
  it('目标值非整数被拒绝', () => {
    const e2 = entries.find((x) => x.meta.id === 'linear-search');
    const err = e2?.validate({ type: 'search', variant: 'linear', array: [1, 2], target: 1.5 });
    expect(err).toContain('整数');
  });
  it('一键排序后通过校验', () => {
    const sorted = [...[3, 1, 2]].sort((a, b) => a - b);
    const err = entry?.validate({ type: 'search', variant: 'binary', array: sorted, target: 1 });
    expect(err).toBeNull();
  });
});
