/**
 * 步骤完整性检查器的"失败分支"测试：checker 的核心价值在于发现坏步骤序列。
 * 此前只测试过通过情形（T2 扫描），这里逐条验证每一类问题都能被捕获。
 */
import { describe, expect, it } from 'vitest';
import { checkStepIntegrity } from './integrity';
import { arrayFrame } from './frame';
import type { VizStep } from './step';

function step(overrides: Partial<VizStep> = {}): VizStep {
  return {
    frame: arrayFrame([1, 2]),
    description: '正常步骤',
    pseudocodeLines: [0],
    counters: { comparisons: 0 },
    ...overrides,
  };
}

describe('checkStepIntegrity 失败分支', () => {
  const PSEUDO_LEN = 3;

  it('步骤数 < 2 直接报告', () => {
    const issues = checkStepIntegrity([step()], PSEUDO_LEN);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('至少');
  });

  it('空序列报告', () => {
    expect(checkStepIntegrity([], PSEUDO_LEN)).toHaveLength(1);
  });

  it('空 description 被捕获并指出步骤下标', () => {
    const issues = checkStepIntegrity([step(), step({ description: '  ' })], PSEUDO_LEN);
    expect(issues).toContainEqual({ stepIndex: 1, message: 'description 为空' });
  });

  it('伪代码行下标越界/负数被捕获', () => {
    const issues = checkStepIntegrity(
      [step({ pseudocodeLines: [5] }), step({ pseudocodeLines: [-1] })],
      PSEUDO_LEN,
    );
    expect(issues).toHaveLength(2);
    expect(issues[0].message).toContain('越界');
    expect(issues[1].message).toContain('越界');
  });

  it('counters 键集不一致被捕获', () => {
    const issues = checkStepIntegrity([step(), step({ counters: { swaps: 1 } })], PSEUDO_LEN);
    expect(issues.some((i) => i.message.includes('键集不一致'))).toBe(true);
  });

  it('计数器回退被捕获', () => {
    const issues = checkStepIntegrity(
      [step({ counters: { comparisons: 5 } }), step({ counters: { comparisons: 2 } })],
      PSEUDO_LEN,
    );
    expect(issues.some((i) => i.message.includes('回退'))).toBe(true);
  });

  it('合法序列零问题', () => {
    const issues = checkStepIntegrity(
      [
        step({ counters: { comparisons: 0, swaps: 0 } }),
        step({ counters: { comparisons: 2, swaps: 1 }, pseudocodeLines: [0, 1] }),
      ],
      PSEUDO_LEN,
    );
    expect(issues).toEqual([]);
  });
});
