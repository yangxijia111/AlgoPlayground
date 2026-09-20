/**
 * 数据生成器测试：确定性、取值范围、模式特征。
 */
import { describe, expect, it } from 'vitest';
import { generateArray, mulberry32 } from './data';

describe('mulberry32', () => {
  it('相同种子产生相同序列（可复现）', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('不同种子产生不同序列', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });
});

describe('generateArray', () => {
  it('random：长度正确、值在 5–100 内、同种子可复现', () => {
    const a = generateArray('random', 30, 42);
    const b = generateArray('random', 30, 42);
    expect(a).toEqual(b);
    expect(a).toHaveLength(30);
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('reversed：严格递减', () => {
    const a = generateArray('reversed', 12, 1);
    for (let i = 1; i < a.length; i++) {
      expect(a[i]).toBeLessThan(a[i - 1]);
    }
  });

  it('fewUnique：不同取值不超过 4 种', () => {
    const a = generateArray('fewUnique', 50, 3);
    expect(new Set(a).size).toBeLessThanOrEqual(4);
  });

  it('nearlySorted：几乎有序（逆序对很少）', () => {
    const a = generateArray('nearlySorted', 30, 42);
    let inversions = 0;
    for (let i = 1; i < a.length; i++) {
      if (a[i] < a[i - 1]) inversions++;
    }
    expect(inversions).toBeGreaterThanOrEqual(1);
    expect(inversions).toBeLessThanOrEqual(10);
  });

  it('size < 1 时按 1 处理', () => {
    expect(generateArray('random', 0, 1)).toHaveLength(1);
  });
});
