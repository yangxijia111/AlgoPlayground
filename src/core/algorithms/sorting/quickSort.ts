/**
 * 快速排序：Lomuto 分区（pivot 取区间末元素），原地递归。不稳定，平均 O(n log n)/O(log n)。
 */
import type { SortInput } from '../../registry';
import type { VizStep } from '../../step/step';
import { makeSortEmitter, swapAt } from './common';

/** 伪代码：
 * 0  procedure quickSort(A, lo, hi)
 * 1    if lo ≥ hi then return
 * 2    p ← partition(A, lo, hi)
 * 3    quickSort(A, lo, p-1)
 * 4    quickSort(A, p+1, hi)
 * 5  procedure partition(A, lo, hi)
 * 6    pivot ← A[hi]
 * 7    i ← lo
 * 8    for j ← lo to hi-1 do
 * 9      if A[j] < pivot then
 * 10       swap A[i], A[j]
 * 11       i ← i + 1
 * 12   swap A[i], A[hi]    // pivot 落位
 * 13   return i
 * 14 end procedure
 */
export function* quickSortGen(input: SortInput): Generator<VizStep, void, void> {
  const arr = [...input.array];
  const n = arr.length;
  const sortedFlags: boolean[] = new Array(n).fill(false);
  const c = { comparisons: 0, swaps: 0, writes: 0 };
  const emit = makeSortEmitter(arr, sortedFlags, c);

  yield emit('初始状态，准备进行快速排序', [0]);
  if (n <= 1) {
    for (let i = 0; i < n; i++) sortedFlags[i] = true;
    yield emit(n === 0 ? '数组为空，无需排序' : '只有一个元素，数组天然有序', [1]);
    return;
  }

  yield* quickRec(arr, sortedFlags, c, emit, 0, n - 1);

  for (let i = 0; i < n; i++) sortedFlags[i] = true;
  yield emit('排序完成：数组已按升序排列', [0]);
}

function* quickRec(
  arr: number[],
  sortedFlags: boolean[],
  c: { comparisons: number; swaps: number; writes: number },
  emit: ReturnType<typeof makeSortEmitter>,
  lo: number,
  hi: number,
): Generator<VizStep, void, void> {
  if (lo > hi) return;
  if (lo === hi) {
    sortedFlags[lo] = true;
    yield emit(`区间 [${lo}..${hi}] 只剩一个元素，a[${lo}]=${arr[lo]} 已就位`, [1], {});
    return;
  }

  // partition(A, lo, hi)
  const pivot = arr[hi];
  let i = lo;
  yield emit(`对区间 [${lo}..${hi}] 分区：pivot = a[${hi}] = ${pivot}，i ← ${lo}`, [5, 6, 7], {
    pivot: hi,
    range: [lo, hi],
    pointers: { i, j: lo },
  });
  for (let j = lo; j < hi; j++) {
    c.comparisons++;
    yield emit(`比较 a[${j}]=${arr[j]} 与 pivot=${pivot}`, [8, 9], {
      pivot: hi,
      range: [lo, hi],
      comparing: [j],
      pointers: { i, j },
    });
    if (arr[j] < pivot) {
      if (i !== j) {
        const before = `${arr[i]} 与 ${arr[j]}`;
        swapAt(arr, i, j);
        c.swaps++;
        yield emit(`a[${j}] < pivot：交换 a[${i}] 与 a[${j}]（原值 ${before}），i ← ${i + 1}`, [10, 11], {
          pivot: hi,
          range: [lo, hi],
          swapping: [i, j],
          pointers: { i: i + 1, j },
        });
      } else {
        yield emit(`a[${j}] < pivot：已在 pivot 左侧，i ← ${i + 1}`, [10, 11], {
          pivot: hi,
          range: [lo, hi],
          comparing: [j],
          pointers: { i: i + 1, j },
        });
      }
      i++;
    }
  }
  if (i !== hi) {
    const before = `${arr[i]} 与 ${arr[hi]}`;
    swapAt(arr, i, hi);
    c.swaps++;
    sortedFlags[i] = true;
    yield emit(`扫描结束：pivot=${arr[i]} 与 a[${i}] 交换落位（原值 ${before}）`, [12, 13], {
      swapping: [i, hi],
      range: [lo, hi],
    });
  } else {
    sortedFlags[i] = true;
    yield emit(`扫描结束：pivot=${pivot} 本就在分界位置 ${i} 落位`, [12, 13], {
      pivot: hi,
      range: [lo, hi],
    });
  }

  yield* quickRec(arr, sortedFlags, c, emit, lo, i - 1);
  yield* quickRec(arr, sortedFlags, c, emit, i + 1, hi);
}
