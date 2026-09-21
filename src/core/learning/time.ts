/**
 * 时间工具：学习数据统一使用 ISO 8601 字符串；学习天数使用本地时区 YYYY-MM-DD。
 */

/** 当前时刻的 ISO 8601 字符串 */
export function nowIso(): string {
  return new Date().toISOString();
}

/** 本地时区日期（YYYY-MM-DD），用于活动天数统计 */
export function todayLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 把日期并入升序去重列表（activityDays） */
export function mergeDay(sorted: string[], day: string): string[] {
  if (sorted.includes(day)) return sorted;
  const next = [...sorted, day].sort();
  return next;
}
