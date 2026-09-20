/**
 * 动态规划模块注册条目：斐波那契 DP、0/1 背包。
 */
import type { AlgorithmEntry, AlgorithmInput, DPInput } from '../../registry';
import { fibDPGen, knapsackGen } from './dpAlgos';

export function validateDPInput(input: AlgorithmInput): string | null {
  if (input.type !== 'dp') return '输入类型错误';
  if (input.kind === 'fibonacci') {
    if (!Number.isInteger(input.n) || input.n < 3 || input.n > 12) return 'n 必须在 3–12 之间';
    return null;
  }
  if (input.items.length < 1 || input.items.length > 8) return '物品数量必须在 1–8 之间';
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 20) {
    return '背包容量必须在 1–20 之间';
  }
  for (const it of input.items) {
    if (it.name.trim() === '') return '物品名称不能为空';
    if (it.name.length > 6) return '物品名称不能超过 6 个字符';
    if (!Number.isInteger(it.weight) || it.weight < 1 || it.weight > 99) return `${it.name} 的重量必须是 1–99 的整数`;
    if (!Number.isInteger(it.value) || it.value < 1 || it.value > 99) return `${it.name} 的价值必须是 1–99 的整数`;
  }
  return null;
}

const entries: AlgorithmEntry[] = [
  {
    meta: {
      id: 'fib-dp',
      name: '斐波那契 DP',
      enName: 'Fibonacci (DP)',
      category: 'dp',
      purpose: '用自底向上填表法计算斐波那契数，消除朴素递归的重复计算。',
      coreIdea: '从基准 dp[1]=dp[2]=1 出发，按 i 从小到大依次填 dp[i] = dp[i-1] + dp[i-2]；每个子问题只计算一次，把指数级调用降为线性填表。',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)（可优化到 O(1)）',
      pseudocode: [
        'procedure fibDP(n)',
        '  dp[1] ← 1，dp[2] ← 1        // 基准',
        '  for i ← 3 to n do',
        '    dp[i] ← dp[i-1] + dp[i-2]  // 自底向上填表',
        '  end for',
        '  return dp[n]',
        'end procedure',
      ],
    },
    defaultInput: { type: 'dp', kind: 'fibonacci', n: 8 },
    validate: validateDPInput,
    run: (input) => fibDPGen((input as Extract<DPInput, { kind: 'fibonacci' }>).n),
  },
  {
    meta: {
      id: 'knapsack',
      name: '0/1 背包',
      enName: '0/1 Knapsack',
      category: 'dp',
      purpose: '在容量限制下选择物品使总价值最大（每件物品要么拿要么不拿）。',
      coreIdea: 'dp[i][w] 表示"只考虑前 i 件物品、容量为 w 时的最大价值"：不选第 i 件则 dp[i][w]=dp[i-1][w]；选则 dp[i-1][w-wt]+val（容量够时）。两者取大，逐格填满二维表。',
      timeComplexity: 'O(n × W)',
      spaceComplexity: 'O(n × W)（可滚动数组优化）',
      pseudocode: [
        'procedure knapsack(items, W)',
        '  dp[0][*] ← 0                          // 不放任何物品',
        '  for i ← 1 to n do                     // 逐个考虑物品 i',
        '    for w ← 0 to W do',
        '      dp[i][w] ← dp[i-1][w]              // 不选物品 i',
        '      if w ≥ wt[i] 且 dp[i-1][w-wt[i]] + val[i] > dp[i][w] then',
        '        dp[i][w] ← dp[i-1][w-wt[i]] + val[i]   // 选物品 i',
        '  return dp[n][W]',
        'end procedure',
      ],
    },
    defaultInput: {
      type: 'dp',
      kind: 'knapsack',
      capacity: 4,
      items: [
        { name: '物品A', weight: 1, value: 15 },
        { name: '物品B', weight: 3, value: 20 },
        { name: '物品C', weight: 4, value: 30 },
      ],
    },
    validate: validateDPInput,
    run: (input) => {
      const dp = input as DPInput;
      return dp.kind === 'knapsack' ? knapsackGen(dp.items, dp.capacity) : fibDPGen(8);
    },
  },
];

export default entries;
