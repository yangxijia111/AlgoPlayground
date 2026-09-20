/**
 * 通用输入校验工具。统一约定：返回 string | null，null 表示通过，否则为中文错误消息。
 * 详见 docs/STATE_SPEC.md §6。
 */

export interface IntArrayOptions {
  minLen: number;
  maxLen: number;
  minVal: number;
  maxVal: number;
}

/** 解析"5, 3, 1"形式的整数数组文本；任何一项非法都返回中文错误 */
export function parseIntArray(text: string, opts: IntArrayOptions): { ok: true; values: number[] } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, error: '请输入数组内容，例如：5, 3, 1' };
  }
  const parts = trimmed.split(/[,，\s]+/).filter((p) => p !== '');
  if (parts.length < opts.minLen || parts.length > opts.maxLen) {
    return { ok: false, error: `数组长度必须在 ${opts.minLen}–${opts.maxLen} 之间` };
  }
  const values: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const n = Number(parts[i]);
    if (!Number.isInteger(n)) {
      return { ok: false, error: `第 ${i + 1} 项"${parts[i]}"不是整数` };
    }
    if (n < opts.minVal || n > opts.maxVal) {
      return { ok: false, error: `第 ${i + 1} 项超出数值范围 ${opts.minVal}–${opts.maxVal}` };
    }
    values.push(n);
  }
  return { ok: true, values };
}

/** 校验单个整数是否在范围内 */
export function checkInt(value: number, name: string, min: number, max: number): string | null {
  if (!Number.isInteger(value)) return `${name}必须是整数`;
  if (value < min || value > max) return `${name}必须在 ${min}–${max} 之间`;
  return null;
}

/** 数组是否按升序排列（允许重复） */
export function isSortedAsc(arr: readonly number[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

/** 数值显示：null 显示 ∞（用于距离等） */
export function formatDistance(d: number | null): string {
  return d === null ? '∞' : String(d);
}
