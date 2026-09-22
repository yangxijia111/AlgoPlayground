/**
 * 排序算法共享工具：计数器与步骤发射器。
 * 约定：所有排序算法的 counters 键集固定为 { comparisons, swaps, writes }。
 * P11：发射器支持携带 StepSemantic（SEMANTIC_STEP_SPEC）。
 */
import { arrayFrame } from '../../step/frame';
import type { ArrayFrame } from '../../step/frame';
import type { VizStep } from '../../step/step';
import type { StepSemantic } from '../../step/semantic';

export interface SortCounters {
  comparisons: number;
  swaps: number;
  writes: number;
}

export interface SortEmit {
  (description: string, pseudocodeLines: number[], extra?: Partial<ArrayFrame>, semantic?: StepSemantic): VizStep;
}

/**
 * 构造排序步骤发射器：快照当前数组、已就绪标记与计数器。
 * sortedFlags[j]=true 的下标在帧中以 success 呈现。
 */
export function makeSortEmitter(
  arr: number[],
  sortedFlags: boolean[],
  counters: SortCounters,
): SortEmit {
  return (description, pseudocodeLines, extra = {}, semantic) => {
    const sorted: number[] = [];
    for (let i = 0; i < sortedFlags.length; i++) {
      if (sortedFlags[i]) sorted.push(i);
    }
    return {
      frame: arrayFrame(arr, { sorted, ...extra }),
      description,
      pseudocodeLines,
      counters: { ...counters },
      ...(semantic ? { semantic } : {}),
    };
  };
}

/** 交换数组两个位置 */
export function swapAt(arr: number[], i: number, j: number): void {
  const t = arr[i];
  arr[i] = arr[j];
  arr[j] = t;
}
