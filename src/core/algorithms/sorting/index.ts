/**
 * 排序算法注册条目（6 种）。
 */
import type { AlgorithmEntry, AlgorithmInput, AlgorithmMeta, SortInput } from '../../registry';
import type { VizStep } from '../../step/step';
import { bubbleSortGen } from './bubbleSort';
import { selectionSortGen } from './selectionSort';
import { insertionSortGen } from './insertionSort';
import { mergeSortGen } from './mergeSort';
import { quickSortGen } from './quickSort';
import { heapSortGen } from './heapSort';

const DEFAULT_ARRAY = [10, 3, 7, 1, 8, 2, 9, 4, 6, 5];

/** 排序输入校验：长度 ≤ 60，整数取值 -99–999（允许空数组与单元素，测试与教学都需要） */
export function validateSortInput(input: AlgorithmInput): string | null {
  if (input.type !== 'sort') return '输入类型错误';
  if (input.array.length > 60) return '数组长度不能超过 60';
  for (let i = 0; i < input.array.length; i++) {
    const v = input.array[i];
    if (!Number.isInteger(v)) return `第 ${i + 1} 项必须是整数`;
    if (v < -99 || v > 999) return `第 ${i + 1} 项超出取值范围 -99–999`;
  }
  return null;
}

function sortEntry(partial: {
  meta: AlgorithmMeta;
  run: (input: SortInput) => Generator<VizStep, void, void>;
}): AlgorithmEntry {
  return {
    meta: partial.meta,
    defaultInput: { type: 'sort', array: [...DEFAULT_ARRAY] } satisfies SortInput,
    validate: validateSortInput,
    // validateSortInput 已保证 input.type === 'sort'，此处集中收窄
    run: (input) => partial.run(input as SortInput),
    compareGroup: 'sorting',
  };
}

const entries: AlgorithmEntry[] = [
  sortEntry({
    run: bubbleSortGen,
    meta: {
      id: 'bubble-sort',
      name: '冒泡排序',
      enName: 'Bubble Sort',
      category: 'sorting',
      purpose: '将无序数组按升序排列，是最直观的入门排序算法。',
      coreIdea: '反复扫描数组，比较相邻两个元素，顺序错误就交换；每一轮都把当前未排序区的最大值"冒泡"到末尾，若某轮没有发生交换则提前结束。',
      timeComplexity: 'O(n²)（最好 O(n)，带早停）',
      spaceComplexity: 'O(1)',
      stability: '稳定',
      pseudocode: [
        'procedure bubbleSort(A)',
        '  n ← length(A)',
        '  repeat',
        '    swapped ← false',
        '    for i ← 0 to 未排序区末尾-1 do',
        '      if A[i] > A[i+1] then',
        '        swap A[i], A[i+1]',
        '        swapped ← true',
        '  until swapped = false',
        'end procedure',
      ],
    },
  }),
  sortEntry({
    run: selectionSortGen,
    meta: {
      id: 'selection-sort',
      name: '选择排序',
      enName: 'Selection Sort',
      category: 'sorting',
      purpose: '将无序数组按升序排列，交换次数最少的简单排序。',
      coreIdea: '每一轮从未排序区中选出最小值，与未排序区的第一个元素交换，使已排序区向前扩展一个位置；无论输入如何，比较次数固定为 n(n-1)/2。',
      timeComplexity: 'O(n²)',
      spaceComplexity: 'O(1)',
      stability: '不稳定',
      pseudocode: [
        'procedure selectionSort(A)',
        '  n ← length(A)',
        '  for i ← 0 to n-2 do',
        '    min ← i',
        '    for j ← i+1 to n-1 do',
        '      if A[j] < A[min] then',
        '        min ← j',
        '    if min ≠ i then',
        '      swap A[i], A[min]',
        'end procedure',
      ],
    },
  }),
  sortEntry({
    run: insertionSortGen,
    meta: {
      id: 'insertion-sort',
      name: '插入排序',
      enName: 'Insertion Sort',
      category: 'sorting',
      purpose: '将无序数组按升序排列，对几乎有序的数据非常高效。',
      coreIdea: '像整理扑克牌：逐个取出元素（key），在左侧已排序区中从右向左比较，把更大的元素依次后移，直到找到 key 的位置插入。',
      timeComplexity: 'O(n²)（几乎有序时接近 O(n)）',
      spaceComplexity: 'O(1)',
      stability: '稳定',
      pseudocode: [
        'procedure insertionSort(A)',
        '  n ← length(A)',
        '  for i ← 1 to n-1 do',
        '    key ← A[i]',
        '    j ← i - 1',
        '    while j ≥ 0 and A[j] > key do',
        '      A[j+1] ← A[j]    // 后移',
        '      j ← j - 1',
        '    A[j+1] ← key       // 插入',
        'end procedure',
      ],
    },
  }),
  sortEntry({
    run: mergeSortGen,
    meta: {
      id: 'merge-sort',
      name: '归并排序',
      enName: 'Merge Sort',
      category: 'sorting',
      purpose: '将无序数组按升序排列，性能稳定保证 O(n log n)。',
      coreIdea: '分治：不断把数组对半分解到单元素（天然有序），再逐层把两个有序区间合并为一个更大的有序区间，合并时用辅助副本依次取较小者写回。',
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
      stability: '稳定',
      pseudocode: [
        'procedure mergeSort(A, lo, hi)',
        '  if lo ≥ hi then return',
        '  mid ← ⌊(lo+hi)/2⌋',
        '  mergeSort(A, lo, mid)',
        '  mergeSort(A, mid+1, hi)',
        '  merge(A, lo, mid, hi)',
        'procedure merge(A, lo, mid, hi)',
        '  B ← A[lo..hi] 的副本，i ← lo，j ← mid+1',
        '  while i ≤ mid 且 j ≤ hi do',
        '    比较 B左[i] 与 B右[j]',
        '    较小者（左）写入 A[k]，i++',
        '  else',
        '    较小者（右）写入 A[k]，j++',
        '  复制某一侧剩余元素，k++',
        'end procedure',
      ],
    },
  }),
  sortEntry({
    run: quickSortGen,
    meta: {
      id: 'quick-sort',
      name: '快速排序',
      enName: 'Quick Sort',
      category: 'sorting',
      purpose: '将无序数组按升序排列，平均性能最好的通用排序之一。',
      coreIdea: '分治：选定区间末元素为 pivot，用 Lomuto 分区把小于 pivot 的元素换到左侧，pivot 落位后其位置即最终位置；再对左右两个子区间递归处理。',
      timeComplexity: '平均 O(n log n)，最坏 O(n²)',
      spaceComplexity: 'O(log n)（递归栈）',
      stability: '不稳定',
      pseudocode: [
        'procedure quickSort(A, lo, hi)',
        '  if lo ≥ hi then return',
        '  p ← partition(A, lo, hi)',
        '  quickSort(A, lo, p-1)',
        '  quickSort(A, p+1, hi)',
        'procedure partition(A, lo, hi)',
        '  pivot ← A[hi]',
        '  i ← lo',
        '  for j ← lo to hi-1 do',
        '    if A[j] < pivot then',
        '      swap A[i], A[j]',
        '      i ← i + 1',
        '  swap A[i], A[hi]    // pivot 落位',
        '  return i',
        'end procedure',
      ],
    },
  }),
  sortEntry({
    run: heapSortGen,
    meta: {
      id: 'heap-sort',
      name: '堆排序',
      enName: 'Heap Sort',
      category: 'sorting',
      purpose: '将无序数组按升序排列，最坏情况也保证 O(n log n) 且原地完成。',
      coreIdea: '把数组视为完全二叉树，先自底向上建大顶堆（父节点 ≥ 子节点）；随后反复把堆顶最大值与堆尾交换、堆缩小一位并对新堆顶执行下沉修复。',
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(1)',
      stability: '不稳定',
      pseudocode: [
        'procedure heapSort(A)',
        '  n ← length(A)',
        '  buildMaxHeap(A)              // 自底向上建大顶堆',
        '  for end ← n-1 downto 1 do',
        '    swap A[0], A[end]          // 堆顶最大值放到末尾',
        '    siftDown(A, 0, end-1)',
        '  procedure siftDown(A, i, end)',
        '    child ← i 的较大孩子下标',
        '    if A[child] > A[i] then',
        '      swap A[i], A[child]',
        '      继续下沉 child',
        '    else 下沉结束',
        '  end procedure',
      ],
    },
  }),
];

export default entries;
