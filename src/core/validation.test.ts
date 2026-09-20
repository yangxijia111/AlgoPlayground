/**
 * 输入校验工具测试（TEST_PLAN T4 通用部分）。
 */
import { describe, expect, it } from 'vitest';
import { parseIntArray, isSortedAsc } from './validation';

describe('parseIntArray', () => {
  const opts = { minLen: 1, maxLen: 60, minVal: -99, maxVal: 999 };

  it('合法输入（中英文逗号与空白混排）', () => {
    const r = parseIntArray('5, 3，1  8', opts);
    expect(r).toEqual({ ok: true, values: [5, 3, 1, 8] });
  });

  it('空输入报错', () => {
    const r = parseIntArray('   ', opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('请输入数组内容');
  });

  it('非整数报错', () => {
    const r = parseIntArray('1, 2.5, 3', opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('不是整数');
  });

  it('非数字报错', () => {
    const r = parseIntArray('1, abc', opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('不是整数');
  });

  it('长度越界报错', () => {
    const r = parseIntArray('1, 2, 3', { ...opts, minLen: 4 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('数组长度必须');
  });

  it('取值越界报错并指出第几项', () => {
    const r = parseIntArray('1, 2, 1000', opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('第 3 项');
  });
});

describe('isSortedAsc', () => {
  it('空/单元素/升序/带重复升序为 true', () => {
    expect(isSortedAsc([])).toBe(true);
    expect(isSortedAsc([1])).toBe(true);
    expect(isSortedAsc([1, 2, 3])).toBe(true);
    expect(isSortedAsc([1, 2, 2, 3])).toBe(true);
  });
  it('降序为 false', () => {
    expect(isSortedAsc([3, 2, 1])).toBe(false);
  });
});
