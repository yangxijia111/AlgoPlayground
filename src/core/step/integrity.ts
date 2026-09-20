/**
 * 步骤完整性校验：对任意算法产出的步骤序列做统一硬性检查。
 * 详见 docs/ALGORITHM_SPEC.md §步骤完整性硬性约定（测试 T2 复用）。
 */
import type { VizStep } from './step';

export interface IntegrityIssue {
  stepIndex: number;
  message: string;
}

/**
 * 检查步骤序列的结构完整性，返回问题列表（空数组 = 通过）：
 * - 至少 2 步（初始态 + 完成态）
 * - 每步 description 非空
 * - pseudocodeLines 均为合法下标
 * - counters 键集全程一致且数值单调不减
 */
export function checkStepIntegrity(steps: VizStep[], pseudocodeLen: number): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  if (steps.length < 2) {
    issues.push({ stepIndex: -1, message: `步骤数 ${steps.length} < 2（至少需要初始态与完成态）` });
    return issues;
  }
  let keySet: string[] | null = null;
  let prevCounters: Record<string, number> | null = null;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.description.trim() === '') {
      issues.push({ stepIndex: i, message: 'description 为空' });
    }
    for (const line of s.pseudocodeLines) {
      if (!Number.isInteger(line) || line < 0 || line >= pseudocodeLen) {
        issues.push({ stepIndex: i, message: `伪代码行下标越界：${line}（共 ${pseudocodeLen} 行）` });
      }
    }
    const keys = Object.keys(s.counters).sort();
    if (keySet === null) {
      keySet = keys;
    } else if (keys.join(',') !== keySet.join(',')) {
      issues.push({ stepIndex: i, message: `counters 键集不一致：${keys.join(',')} ≠ ${keySet.join(',')}` });
    }
    if (prevCounters !== null) {
      for (const [k, v] of Object.entries(s.counters)) {
        if (v < prevCounters[k]) {
          issues.push({ stepIndex: i, message: `计数器 ${k} 回退：${v} < ${prevCounters[k]}` });
        }
      }
    }
    prevCounters = { ...s.counters };
  }
  return issues;
}
