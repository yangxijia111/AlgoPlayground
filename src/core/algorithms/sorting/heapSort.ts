/**
 * 堆排序：原地建大顶堆，逐个将堆顶（最大值）换到末尾并修复堆。不稳定，O(n log n)/O(1)。
 */
import type { SortInput } from '../../registry';
import type { VizStep } from '../../step/step';
import { makeSortEmitter, swapAt } from './common';

/** 伪代码：
 * 0  procedure heapSort(A)
 * 1    n ← length(A)
 * 2    buildMaxHeap(A)              // 自底向上建大顶堆
 * 3    for end ← n-1 downto 1 do
 * 4      swap A[0], A[end]          // 堆顶最大值放到末尾
 * 5      siftDown(A, 0, end-1)
 * 6  procedure siftDown(A, i, end)
 * 7    child ← i 与其子节点中较大孩子的下标
 * 8    if A[child] > A[i] then
 * 9      swap A[i], A[child]
 * 10     继续下沉 child
 * 11   else 下沉结束
 * 12 end procedure
 */
export function* heapSortGen(input: SortInput): Generator<VizStep, void, void> {
  const arr = [...input.array];
  const n = arr.length;
  const sortedFlags: boolean[] = new Array(n).fill(false);
  const c = { comparisons: 0, swaps: 0, writes: 0 };
  const emit = makeSortEmitter(arr, sortedFlags, c);

  yield emit('初始状态，准备进行堆排序', [0, 1]);
  if (n <= 1) {
    for (let i = 0; i < n; i++) sortedFlags[i] = true;
    yield emit(n === 0 ? '数组为空，无需排序' : '只有一个元素，数组天然有序', [1, 12]);
    return;
  }

  // 建堆：从最后一个非叶子节点开始下沉
  yield emit(`建堆阶段：从最后一个非叶子节点 ${((n >> 1) - 1)} 开始，自底向上执行下沉`, [2], {});
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    yield emit(`对节点 a[${i}]=${arr[i]} 执行下沉（siftDown）`, [2, 6], {});
    yield* siftDown(arr, c, emit, i, n - 1);
  }
  yield emit('建堆完成：整个数组构成大顶堆（a[0] 为最大值）', [2], {});

  // 排序：反复取堆顶
  for (let end = n - 1; end >= 1; end--) {
    const top = arr[0];
    swapAt(arr, 0, end);
    c.swaps++;
    sortedFlags[end] = true;
    yield emit(`堆顶最大值 ${top} 与 a[${end}]=${arr[0]} 交换，a[${end}] 就位`, [3, 4], {
      swapping: [0, end],
    });
    if (end - 1 >= 1) {
      yield* siftDown(arr, c, emit, 0, end - 1);
    }
  }
  sortedFlags[0] = true;
  yield emit('排序完成：数组已按升序排列', [12]);
}

function* siftDown(
  arr: number[],
  c: { comparisons: number; swaps: number; writes: number },
  emit: ReturnType<typeof makeSortEmitter>,
  start: number,
  end: number,
): Generator<VizStep, void, void> {
  let i = start;
  while (true) {
    const left = 2 * i + 1;
    if (left > end) {
      yield emit(`节点 a[${i}] 没有子节点（叶子），下沉结束`, [11], {});
      return;
    }
    let child = left;
    if (left + 1 <= end) {
      c.comparisons++;
      yield emit(`比较两个孩子 a[${left}]=${arr[left]} 与 a[${left + 1}]=${arr[left + 1]}`, [7], {
        comparing: [left, left + 1],
      });
      if (arr[left + 1] > arr[left]) child = left + 1;
    }
    c.comparisons++;
    yield emit(`比较 a[${i}]=${arr[i]} 与较大孩子 a[${child}]=${arr[child]}`, [7, 8], {
      comparing: [i, child],
    });
    if (arr[child] > arr[i]) {
      const before = `${arr[i]} 与 ${arr[child]}`;
      swapAt(arr, i, child);
      c.swaps++;
      yield emit(`孩子更大：交换 a[${i}] 与 a[${child}]（原值 ${before}），继续下沉`, [9, 10], {
        swapping: [i, child],
      });
      i = child;
    } else {
      yield emit(`a[${i}]=${arr[i]} 不小于孩子，堆性质满足，下沉结束`, [11], {
        comparing: [i],
      });
      return;
    }
  }
}
