/**
 * 选择排序：每轮从未排序区选出最小值，与未排序区首位交换。不稳定，O(n²)/O(1)。
 */
import type { SortInput } from '../../registry';
import type { VizStep } from '../../step/step';
import { makeSortEmitter, swapAt } from './common';

/** 伪代码：
 * 0 procedure selectionSort(A)
 * 1   n ← length(A)
 * 2   for i ← 0 to n-2 do
 * 3     min ← i
 * 4     for j ← i+1 to n-1 do
 * 5       if A[j] < A[min] then
 * 6         min ← j
 * 7     if min ≠ i then
 * 8       swap A[i], A[min]
 * 9 end procedure
 */
export function* selectionSortGen(input: SortInput): Generator<VizStep, void, void> {
  const arr = [...input.array];
  const n = arr.length;
  const sortedFlags: boolean[] = new Array(n).fill(false);
  const c = { comparisons: 0, swaps: 0, writes: 0 };
  const emit = makeSortEmitter(arr, sortedFlags, c);

  yield emit('初始状态，准备进行选择排序', [0, 1]);
  if (n <= 1) {
    for (let i = 0; i < n; i++) sortedFlags[i] = true;
    yield emit(n === 0 ? '数组为空，无需排序' : '只有一个元素，数组天然有序', [1, 9]);
    return;
  }

  for (let i = 0; i < n - 1; i++) {
    let min = i;
    yield emit(`第 ${i + 1} 轮：在未排序区 a[${i}..${n - 1}] 中寻找最小值，先假设 min=${i}`, [2, 3], {
      range: [i, n - 1],
      pointers: { min },
    });
    for (let j = i + 1; j < n; j++) {
      c.comparisons++;
      yield emit(
        `比较 a[${j}]=${arr[j]} 与当前最小值 a[${min}]=${arr[min]}`,
        [4, 5],
        {
          range: [i, n - 1],
          comparing: [j, min],
          pointers: { min, j },
        },
        { type: 'compare', indices: [j, min], values: [arr[j]!, arr[min]!], purpose: 'selection-min' },
      );
      if (arr[j] < arr[min]) {
        min = j;
        yield emit(`a[${j}]=${arr[j]} 更小，更新 min=${j}`, [6], {
          range: [i, n - 1],
          pointers: { min, j },
        });
      }
    }
    if (min !== i) {
      const before: [number, number] = [arr[i]!, arr[min]!];
      swapAt(arr, i, min);
      c.swaps++;
      yield emit(
        `本轮最小值为 ${arr[i]}，交换 a[${i}] 与 a[${min}]（原值 ${before[0]} 与 ${before[1]}）`,
        [7, 8],
        {
          swapping: [i, min],
          range: [i, n - 1],
        },
        { type: 'swap', indices: [i, min], values: before, reason: 'selection-place-min' },
      );
    } else {
      yield emit(`a[${i}]=${arr[i]} 本就是未排序区最小值，无需交换`, [7], {
        range: [i, n - 1],
      });
    }
    sortedFlags[i] = true;
    yield emit(`a[${i}]=${arr[i]} 已就位`, [2]);
  }

  sortedFlags[n - 1] = true;
  yield emit('排序完成：数组已按升序排列', [9]);
}
