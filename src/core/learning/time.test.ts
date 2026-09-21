/**
 * 时间工具测试。
 */
import { describe, expect, it } from 'vitest';
import { mergeDay, nowIso, todayLocalDate } from './time';

describe('时间工具', () => {
  it('nowIso 返回可解析的 ISO 8601 字符串', () => {
    const s = nowIso();
    expect(Number.isNaN(Date.parse(s))).toBe(false);
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('todayLocalDate 使用本地时区格式化', () => {
    expect(todayLocalDate(new Date(2026, 8, 22, 15, 30))).toBe('2026-09-22');
    expect(todayLocalDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(todayLocalDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('mergeDay 升序去重合并', () => {
    expect(mergeDay([], '2026-09-22')).toEqual(['2026-09-22']);
    expect(mergeDay(['2026-09-21'], '2026-09-22')).toEqual(['2026-09-21', '2026-09-22']);
    expect(mergeDay(['2026-09-22'], '2026-09-22')).toEqual(['2026-09-22']);
    expect(mergeDay(['2026-09-21', '2026-09-23'], '2026-09-22')).toEqual(['2026-09-21', '2026-09-22', '2026-09-23']);
  });
});
