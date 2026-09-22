/**
 * 插入排序：像整理扑克牌，把当前元素插入到左侧有序区的正确位置。稳定，O(n²)/O(1)。
 * 注意：sortedFlags 表示"当前有序前缀"（局部有序，教学惯例），并非全部最终落位。
 */
import type { SortInput } from '../../registry';
import type { VizStep } from '../../step/step';
import { makeSortEmitter } from './common';

/** 伪代码：
 * 0 procedure insertionSort(A)
 * 1   n ← length(A)
 * 2   for i ← 1 to n-1 do
 * 3     key ← A[i]
 * 4     j ← i - 1
 * 5     while j ≥ 0 and A[j] > key do
 * 6       A[j+1] ← A[j]    // 后移
 * 7       j ← j - 1
 * 8     A[j+1] ← key       // 插入
 * 9 end procedure
 */
export function* insertionSortGen(input: SortInput): Generator<VizStep, void, void> {
  const arr = [...input.array];
  const n = arr.length;
  const sortedFlags: boolean[] = new Array(n).fill(false);
  const c = { comparisons: 0, swaps: 0, writes: 0 };
  const emit = makeSortEmitter(arr, sortedFlags, c);

  yield emit('初始状态，准备进行插入排序', [0, 1]);
  if (n <= 1) {
    for (let i = 0; i < n; i++) sortedFlags[i] = true;
    yield emit(n === 0 ? '数组为空，无需排序' : '只有一个元素，数组天然有序', [1, 9]);
    return;
  }

  sortedFlags[0] = true;
  yield emit('认为 a[0] 已构成有序前缀，从 a[1] 开始逐个插入', [1, 2]);

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    yield emit(`取出 a[${i}]=${key} 作为待插入的 key，在有序前缀 a[0..${i - 1}] 中寻找位置`, [2, 3, 4], {
      range: [0, i],
      pointers: { key: i, j },
    });
    let placed = false;
    while (j >= 0) {
      c.comparisons++;
      yield emit(
        `比较 a[${j}]=${arr[j]} 与 key=${key}`,
        [5],
        {
          range: [0, i],
          comparing: [j],
          pointers: { key: i, j },
        },
        { type: 'compare', indices: [j], values: [arr[j]!], purpose: 'insertion-shift' },
      );
      if (arr[j] > key) {
        arr[j + 1] = arr[j];
        c.writes++;
        const writtenTo = j + 1; // 写入位置（原 j+1）
        const writtenValue = arr[writtenTo]!;
        j--;
        yield emit(
          `a[${writtenTo}]=${writtenValue} > key=${key}，将它后移一位，j ← ${j}`,
          [6, 7],
          {
            range: [0, i],
            swapping: [j + 1, j + 2],
            pointers: { key: i, j },
          },
          { type: 'write', index: writtenTo, value: writtenValue, source: 'insertion-shift' },
        );
      } else {
        yield emit(`a[${j}]=${arr[j]} ≤ key=${key}，后移结束`, [5], {
          range: [0, i],
          comparing: [j],
        });
        placed = true;
        break;
      }
    }
    arr[j + 1] = key;
    c.writes++;
    sortedFlags[i] = true;
    if (!placed) {
      yield emit(
        `key=${key} 比有序前缀中所有元素都小，插入到位置 0`,
        [8],
        {
          range: [0, i],
          pointers: { key: 0 },
        },
        { type: 'write', index: 0, value: key, source: 'insertion-place' },
      );
    } else {
      yield emit(
        `将 key=${key} 插入位置 ${j + 1}，有序前缀扩展为 a[0..${i}]`,
        [8],
        {
          pointers: { key: j + 1 },
        },
        { type: 'write', index: j + 1, value: key, source: 'insertion-place' },
      );
    }
  }

  yield emit('排序完成：数组已按升序排列', [9]);
}
