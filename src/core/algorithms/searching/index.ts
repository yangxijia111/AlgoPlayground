/**
 * 搜索算法注册条目：线性查找、二分查找。
 */
import type { AlgorithmEntry, AlgorithmInput, SearchInput } from '../../registry';
import { isSortedAsc } from '../../validation';
import { binarySearchGen, linearSearchGen } from './searches';

const DEFAULT_ARRAY = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];

export function validateSearchInput(input: AlgorithmInput): string | null {
  if (input.type !== 'search') return '输入类型错误';
  if (input.array.length > 60) return '数组长度不能超过 60';
  for (let i = 0; i < input.array.length; i++) {
    const v = input.array[i];
    if (!Number.isInteger(v)) return `第 ${i + 1} 项必须是整数`;
    if (v < -99 || v > 999) return `第 ${i + 1} 项超出取值范围 -99–999`;
  }
  if (!Number.isInteger(input.target)) return '目标值必须是整数';
  if (input.target < -999 || input.target > 999) return '目标值超出取值范围 -999–999';
  if (input.variant === 'binary' && !isSortedAsc(input.array)) {
    return '二分查找要求数组已按升序排列';
  }
  return null;
}

function searchEntry(partial: {
  meta: AlgorithmEntry['meta'];
  variant: 'linear' | 'binary';
  run: (input: SearchInput) => Generator<import('../../step/step').VizStep, void, void>;
}): AlgorithmEntry {
  return {
    meta: partial.meta,
    defaultInput: { type: 'search', variant: partial.variant, array: [...DEFAULT_ARRAY], target: 23 },
    validate: validateSearchInput,
    // validateSearchInput 已保证 input.type === 'search'，此处集中收窄
    run: (input) => partial.run(input as SearchInput),
  };
}

const entries: AlgorithmEntry[] = [
  searchEntry({
    variant: 'linear',
    run: linearSearchGen,
    meta: {
      id: 'linear-search',
      name: '线性查找',
      enName: 'Linear Search',
      category: 'searching',
      purpose: '在无序数组中查找目标值的位置。',
      coreIdea: '从第一个元素开始逐个检查，一旦某个元素等于目标值就返回其下标；扫描完仍未找到则报告失败。不要求数组有序。',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      pseudocode: [
        'procedure linearSearch(A, target)',
        '  for i ← 0 to n-1 do',
        '    if A[i] = target then',
        '      return i          // 找到',
        '  return -1             // 未找到',
        'end procedure',
      ],
    },
  }),
  searchEntry({
    variant: 'binary',
    run: binarySearchGen,
    meta: {
      id: 'binary-search',
      name: '二分查找',
      enName: 'Binary Search',
      category: 'searching',
      purpose: '在有序数组中快速查找目标值的位置。',
      coreIdea: '利用升序性质：比较区间中点与目标值，若中点更小则目标只可能在右半，否则在左半；每比较一次搜索区间减半。要求数组升序。',
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1)',
      pseudocode: [
        'procedure binarySearch(A, target)   // A 升序',
        '  lo ← 0，hi ← n-1',
        '  while lo ≤ hi do',
        '    mid ← ⌊(lo+hi)/2⌋',
        '    if A[mid] = target then',
        '      return mid        // 找到',
        '    else if A[mid] < target then',
        '      lo ← mid+1        // 目标在右半',
        '    else',
        '      hi ← mid-1        // 目标在左半',
        '  return -1             // 未找到',
        'end procedure',
      ],
    },
  }),
];

export default entries;
