/**
 * 线性查找与二分查找。数组帧复用排序的可视化通道。
 */
import type { SearchInput } from '../../registry';
import { arrayFrame } from '../../step/frame';
import type { VizStep } from '../../step/step';
import type { StepSemantic } from '../../step/semantic';

/** 线性查找伪代码：
 * 0 procedure linearSearch(A, target)
 * 1   for i ← 0 to n-1 do
 * 2     if A[i] = target then
 * 3       return i          // 找到
 * 4   return -1             // 未找到
 * 5 end procedure
 */
export function* linearSearchGen(input: SearchInput): Generator<VizStep, void, void> {
  const arr = [...input.array];
  const target = input.target;
  const c = { comparisons: 0 };
  const emit = (
    description: string,
    pseudocodeLines: number[],
    extra: Parameters<typeof arrayFrame>[1] = {},
    semantic?: StepSemantic,
  ): VizStep => ({
    frame: arrayFrame(arr, { target, ...extra }),
    description,
    pseudocodeLines,
    counters: { ...c },
    ...(semantic ? { semantic } : {}),
  });

  yield emit(`初始状态：在数组中线性查找目标值 ${target}`, [0]);
  for (let i = 0; i < arr.length; i++) {
    c.comparisons++;
    yield emit(
      `检查 a[${i}]=${arr[i]} 是否等于目标值 ${target}`,
      [1, 2],
      { comparing: [i] },
      { type: 'compare', indices: [i], values: [arr[i]!], purpose: 'linear-scan' },
    );
    if (arr[i] === target) {
      yield emit(
        `a[${i}]=${target} 与目标值相等，查找成功！共比较 ${c.comparisons} 次`,
        [3],
        { found: i },
        { type: 'found', index: i, value: arr[i]!, target },
      );
      return;
    }
  }
  yield emit(`扫描完毕：数组中不存在 ${target}，查找失败（共比较 ${c.comparisons} 次）`, [4], {}, {
    type: 'not-found',
    target,
  });
}

/** 二分查找伪代码（A 升序）：
 * 0  procedure binarySearch(A, target)
 * 1    lo ← 0，hi ← n-1
 * 2    while lo ≤ hi do
 * 3      mid ← ⌊(lo+hi)/2⌋
 * 4      if A[mid] = target then
 * 5        return mid        // 找到
 * 6      else if A[mid] < target then
 * 7        lo ← mid+1        // 目标在右半
 * 8      else
 * 9        hi ← mid-1        // 目标在左半
 * 10   return -1             // 未找到
 * 11 end procedure
 */
export function* binarySearchGen(input: SearchInput): Generator<VizStep, void, void> {
  const arr = [...input.array];
  const target = input.target;
  const c = { comparisons: 0 };
  const emit = (
    description: string,
    pseudocodeLines: number[],
    extra: Parameters<typeof arrayFrame>[1] = {},
    semantic?: StepSemantic,
  ): VizStep => ({
    frame: arrayFrame(arr, { target, ...extra }),
    description,
    pseudocodeLines,
    counters: { ...c },
    ...(semantic ? { semantic } : {}),
  });

  const n = arr.length;
  yield emit(`初始状态：在升序数组中二分查找目标值 ${target}`, [0, 1]);
  if (n === 0) {
    yield emit(`数组为空，目标值 ${target} 不存在，查找失败`, [10], {}, { type: 'not-found', target });
    return;
  }
  let lo = 0;
  let hi = n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    c.comparisons++;
    yield emit(
      `当前搜索区间 [${lo}..${hi}]，取中点 mid=${mid}（a[${mid}]=${arr[mid]}）`,
      [2, 3],
      {
        range: [lo, hi],
        pointers: { lo, hi, mid },
        comparing: [mid],
      },
      { type: 'compare', indices: [mid], values: [arr[mid]!], purpose: 'binary-mid' },
    );
    if (arr[mid] === target) {
      yield emit(
        `a[${mid}]=${target} 正是目标值，查找成功！共比较 ${c.comparisons} 次`,
        [4, 5],
        {
          range: [lo, hi],
          found: mid,
          pointers: { lo, hi, mid },
        },
        { type: 'found', index: mid, value: arr[mid]!, target },
      );
      return;
    } else if (arr[mid] < target) {
      const from: [number, number] = [lo, hi];
      lo = mid + 1;
      yield emit(
        `a[${mid}]=${arr[mid]} < ${target}：目标只可能在右半，lo ← ${lo}`,
        [6, 7],
        {
          range: [lo, hi],
          pointers: { lo, hi },
        },
        { type: 'range-narrow', side: 'right', from, to: [lo, hi] },
      );
    } else {
      const from: [number, number] = [lo, hi];
      hi = mid - 1;
      yield emit(
        `a[${mid}]=${arr[mid]} > ${target}：目标只可能在左半，hi ← ${hi}`,
        [8, 9],
        {
          range: [lo, hi],
          pointers: { lo, hi },
        },
        { type: 'range-narrow', side: 'left', from, to: [lo, hi] },
      );
    }
  }
  yield emit(`搜索区间收缩为空（lo > hi），目标值 ${target} 不存在，查找失败`, [10], {}, {
    type: 'not-found',
    target,
  });
}
