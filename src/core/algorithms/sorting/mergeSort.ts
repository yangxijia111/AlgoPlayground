/**
 * 归并排序：自顶向下二分 + 辅助数组归并写回。稳定，O(n log n)/O(n)。
 * 可视化策略：归并前复制区间为辅助副本 B，从 B 读取、winner 直接写回主数组，
 * 使合并区间逐步呈现有序（正确性不受写回影响，因为读取只来自 B）。
 */
import type { SortInput } from '../../registry';
import type { VizStep } from '../../step/step';
import { makeSortEmitter } from './common';

/** 伪代码：
 * 0  procedure mergeSort(A, lo, hi)
 * 1    if lo ≥ hi then return
 * 2    mid ← ⌊(lo+hi)/2⌋
 * 3    mergeSort(A, lo, mid)
 * 4    mergeSort(A, mid+1, hi)
 * 5    merge(A, lo, mid, hi)
 * 6  procedure merge(A, lo, mid, hi)
 * 7    B ← A[lo..hi] 的副本，i ← lo，j ← mid+1
 * 8    while i ≤ mid 且 j ≤ hi do
 * 9      比较 B左[i] 与 B右[j]
 * 10     较小者（左）写入 A[k]，i++
 * 11   else
 * 12     较小者（右）写入 A[k]，j++
 * 13   复制某一侧剩余元素，k++
 * 14 end procedure
 */
export function* mergeSortGen(input: SortInput): Generator<VizStep, void, void> {
  const arr = [...input.array];
  const n = arr.length;
  const sortedFlags: boolean[] = new Array(n).fill(false);
  const c = { comparisons: 0, swaps: 0, writes: 0 };
  const emit = makeSortEmitter(arr, sortedFlags, c);

  yield emit('初始状态，准备进行归并排序', [0]);
  if (n <= 1) {
    for (let i = 0; i < n; i++) sortedFlags[i] = true;
    yield emit(n === 0 ? '数组为空，无需排序' : '只有一个元素，数组天然有序', [1]);
    return;
  }

  yield* mergeSortRec(arr, sortedFlags, c, emit, 0, n - 1);

  for (let i = 0; i < n; i++) sortedFlags[i] = true;
  yield emit('排序完成：数组已按升序排列', [0]);
}

type Ctx = {
  arr: number[];
  sortedFlags: boolean[];
  c: { comparisons: number; swaps: number; writes: number };
  emit: ReturnType<typeof makeSortEmitter>;
};

function* mergeSortRec(
  arr: number[],
  sortedFlags: boolean[],
  c: Ctx['c'],
  emit: Ctx['emit'],
  lo: number,
  hi: number,
): Generator<VizStep, void, void> {
  if (lo >= hi) {
    if (lo === hi) {
      yield emit(`区间 [${lo}..${hi}] 只有一个元素，天然有序，直接返回`, [1], { range: [lo, hi] });
    }
    return;
  }
  const mid = (lo + hi) >> 1;
  yield emit(`分解区间 [${lo}..${hi}]：mid=${mid}，分为 [${lo}..${mid}] 与 [${mid + 1}..${hi}]`, [2], {
    range: [lo, hi],
  });
  yield* mergeSortRec(arr, sortedFlags, c, emit, lo, mid);
  yield* mergeSortRec(arr, sortedFlags, c, emit, mid + 1, hi);
  yield* mergeRange(arr, c, emit, lo, mid, hi);
}

function* mergeRange(
  arr: number[],
  c: Ctx['c'],
  emit: Ctx['emit'],
  lo: number,
  mid: number,
  hi: number,
): Generator<VizStep, void, void> {
  const aux = arr.slice(lo, hi + 1);
  let i = lo;
  let j = mid + 1;
  yield emit(`合并 [${lo}..${mid}] 与 [${mid + 1}..${hi}]（两侧各自有序）`, [6, 7], {
    range: [lo, hi],
    pointers: { i, j },
  });
  let k = lo;
  while (i <= mid && j <= hi) {
    const lv = aux[i - lo]!;
    const rv = aux[j - lo]!;
    c.comparisons++;
    yield emit(
      `比较左半 a[${i}]=${lv} 与右半 a[${j}]=${rv}`,
      [8, 9],
      {
        range: [lo, hi],
        comparing: [i, j],
        pointers: { i, j, write: k },
      },
      { type: 'compare', indices: [i, j], values: [lv, rv], purpose: 'merge-sides' },
    );
    if (lv <= rv) {
      arr[k] = lv;
      c.writes++;
      yield emit(
        `${arr[k]}（左半）较小，写入位置 ${k}，i++`,
        [10],
        {
          range: [lo, hi],
          pointers: { i: i + 1, j, write: k },
        },
        { type: 'write', index: k, value: lv, source: 'merge-left' },
      );
      i++;
    } else {
      arr[k] = rv;
      c.writes++;
      yield emit(
        `${arr[k]}（右半）较小，写入位置 ${k}，j++`,
        [12],
        {
          range: [lo, hi],
          pointers: { i, j: j + 1, write: k },
        },
        { type: 'write', index: k, value: rv, source: 'merge-right' },
      );
      j++;
    }
    k++;
  }
  while (i <= mid) {
    arr[k] = aux[i - lo]!;
    c.writes++;
    yield emit(
      `左半剩余元素 ${arr[k]} 写入位置 ${k}`,
      [13],
      {
        range: [lo, hi],
        pointers: { i, write: k },
      },
      { type: 'write', index: k, value: aux[i - lo]!, source: 'merge-left' },
    );
    i++;
    k++;
  }
  while (j <= hi) {
    arr[k] = aux[j - lo]!;
    c.writes++;
    yield emit(
      `右半剩余元素 ${arr[k]} 写入位置 ${k}`,
      [13],
      {
        range: [lo, hi],
        pointers: { j, write: k },
      },
      { type: 'write', index: k, value: aux[j - lo]!, source: 'merge-right' },
    );
    j++;
    k++;
  }
  yield emit(`区间 [${lo}..${hi}] 合并完成，已有序`, [6], { range: [lo, hi] });
}
