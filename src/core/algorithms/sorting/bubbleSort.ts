/**
 * 冒泡排序：相邻比较交换，带 swapped 早停优化。稳定，O(n²)/O(1)。
 */
import type { SortInput } from '../../registry';
import type { VizStep } from '../../step/step';
import { makeSortEmitter, swapAt } from './common';

/** 伪代码（与步骤 pseudocodeLines 对应）：
 * 0 procedure bubbleSort(A)
 * 1   n ← length(A)
 * 2   repeat
 * 3     swapped ← false
 * 4     for i ← 0 to 未排序区末尾-1 do
 * 5       if A[i] > A[i+1] then
 * 6         swap A[i], A[i+1]
 * 7         swapped ← true
 * 8   until swapped = false
 * 9 end procedure
 */
export function* bubbleSortGen(input: SortInput): Generator<VizStep, void, void> {
  const arr = [...input.array];
  const n = arr.length;
  const sortedFlags: boolean[] = new Array(n).fill(false);
  const c = { comparisons: 0, swaps: 0, writes: 0 };
  const emit = makeSortEmitter(arr, sortedFlags, c);

  yield emit('初始状态，准备进行冒泡排序', [0, 1]);
  if (n <= 1) {
    for (let i = 0; i < n; i++) sortedFlags[i] = true;
    yield emit(n === 0 ? '数组为空，无需排序' : '只有一个元素，数组天然有序', [1, 8]);
    return;
  }

  let unsortedLen = n; // 未排序区长度 a[0..unsortedLen-1]
  while (unsortedLen > 1) {
    let swapped = false;
    yield emit(`开始新一轮扫描（未排序区 a[0..${unsortedLen - 1}]）`, [2, 3, 4]);
    for (let i = 0; i < unsortedLen - 1; i++) {
      c.comparisons++;
      yield emit(
        `比较 a[${i}]=${arr[i]} 与 a[${i + 1}]=${arr[i + 1]}`,
        [5],
        { comparing: [i, i + 1] },
        { type: 'compare', indices: [i, i + 1], values: [arr[i]!, arr[i + 1]!], purpose: 'bubble-adjacent' },
      );
      if (arr[i] > arr[i + 1]) {
        const before: [number, number] = [arr[i]!, arr[i + 1]!];
        swapAt(arr, i, i + 1);
        c.swaps++;
        swapped = true;
        yield emit(
          `因为 ${before[0]} 与 ${before[1]}（前者更大），交换 a[${i}] 与 a[${i + 1}]`,
          [6, 7],
          { swapping: [i, i + 1] },
          { type: 'swap', indices: [i, i + 1], values: before, reason: 'bubble-order' },
        );
      }
    }
    unsortedLen--;
    sortedFlags[unsortedLen] = true;
    if (!swapped) {
      yield emit('本轮扫描没有发生任何交换，说明剩余部分已有序，排序结束', [8]);
      break;
    }
    yield emit(`第 ${n - unsortedLen} 轮结束：最大值 ${arr[unsortedLen]} 冒泡到 a[${unsortedLen}] 并就位`, [8]);
  }

  for (let i = 0; i < n; i++) sortedFlags[i] = true;
  yield emit('排序完成：数组已按升序排列', [8]);
}
