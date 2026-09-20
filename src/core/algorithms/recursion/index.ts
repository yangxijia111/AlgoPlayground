/**
 * 递归模块注册条目：阶乘 / 斐波那契（朴素递归）/ 汉诺塔。
 */
import type { AlgorithmEntry, AlgorithmInput, RecursionInput } from '../../registry';
import { factorialGen, fibonacciGen, hanoiGen } from './recursions';

export const RECURSION_LIMITS: Record<RecursionInput['kind'], { min: number; max: number }> = {
  factorial: { min: 1, max: 12 },
  fibonacci: { min: 1, max: 12 },
  hanoi: { min: 1, max: 8 },
};

export function validateRecursionInput(input: AlgorithmInput): string | null {
  if (input.type !== 'recursion') return '输入类型错误';
  const lim = RECURSION_LIMITS[input.kind];
  if (!Number.isInteger(input.n)) return 'n 必须是整数';
  if (input.n < lim.min || input.n > lim.max) return `n 必须在 ${lim.min}–${lim.max} 之间`;
  return null;
}

function recursionEntry(kind: RecursionInput['kind'], meta: AlgorithmEntry['meta']): AlgorithmEntry {
  const runners = {
    factorial: factorialGen,
    fibonacci: fibonacciGen,
    hanoi: hanoiGen,
  } as const;
  const defaultN = kind === 'hanoi' ? 3 : 5;
  return {
    meta,
    defaultInput: { type: 'recursion', kind, n: defaultN },
    validate: validateRecursionInput,
    // validateRecursionInput 已保证 input.type === 'recursion'
    run: (input) => runners[kind]((input as RecursionInput).n),
  };
}

const entries: AlgorithmEntry[] = [
  recursionEntry('factorial', {
    id: 'factorial',
    name: '阶乘（递归）',
    enName: 'Factorial',
    category: 'recursion',
    purpose: '用递归计算 n!，演示最基本的"基准情形 + 递归调用"结构。',
    coreIdea: 'fact(n) = n × fact(n-1)，基准 fact(1)=1。调用时逐层压栈挂起，到达基准后逐层返回相乘——观察调用栈的消长即可理解递归。',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)（调用栈深度）',
    pseudocode: [
      'procedure fact(n)',
      '  if n ≤ 1 then return 1',
      '  return n × fact(n-1)',
      'end procedure',
    ],
  }),
  recursionEntry('fibonacci', {
    id: 'fibonacci-recursion',
    name: '斐波那契（朴素递归）',
    enName: 'Fibonacci (Naive Recursion)',
    category: 'recursion',
    purpose: '用朴素双递归计算斐波那契数，直观感受重复子问题导致的指数级调用。',
    coreIdea: 'fib(n) = fib(n-1) + fib(n-2)，基准 fib(1)=fib(2)=1。每个调用分裂出两个子调用，同一子问题被反复计算——这也是引出动态规划的动机。',
    timeComplexity: 'O(φⁿ)（指数级）',
    spaceComplexity: 'O(n)（调用栈深度）',
    pseudocode: [
      'procedure fib(n)',
      '  if n ≤ 2 then return 1',
      '  return fib(n-1) + fib(n-2)',
      'end procedure',
    ],
  }),
  recursionEntry('hanoi', {
    id: 'hanoi',
    name: '汉诺塔',
    enName: 'Tower of Hanoi',
    category: 'recursion',
    purpose: '把 n 个盘从 A 柱移到 C 柱（大盘不压小盘），经典递归分解问题。',
    coreIdea: '把"移 n 个盘"分解为三步：先把上面 n-1 个盘移到中转柱，再把最大盘移到目标柱，最后把 n-1 个盘从中转柱移到目标柱；移动次数 2ⁿ−1。',
    timeComplexity: 'O(2ⁿ)',
    spaceComplexity: 'O(n)（调用栈深度）',
    pseudocode: [
      'procedure hanoi(k, from, to, via)',
      '  if k = 0 then return',
      '  hanoi(k-1, from, via, to)   // 上面的 k-1 个盘先到中转柱',
      '  移动盘 k：from → to',
      '  hanoi(k-1, via, to, from)   // k-1 个盘从中转柱到目标柱',
      'end procedure',
    ],
  }),
];

export default entries;
