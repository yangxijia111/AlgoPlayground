/**
 * 回溯模块注册条目：N 皇后。
 */
import type { AlgorithmEntry, AlgorithmInput, NQueensInput } from '../../registry';
import { nQueensGen } from './nQueens';

export function validateNQueensInput(input: AlgorithmInput): string | null {
  if (input.type !== 'nqueens') return '输入类型错误';
  if (!Number.isInteger(input.n)) return 'n 必须是整数';
  if (input.n < 4 || input.n > 8) return 'n 必须在 4–8 之间';
  return null;
}

const entries: AlgorithmEntry[] = [
  {
    meta: {
      id: 'n-queens',
      name: 'N 皇后',
      enName: 'N-Queens',
      category: 'backtracking',
      purpose: '在 n×n 棋盘上放置 n 个皇后使两两互不攻击，回溯算法的教科书案例。',
      coreIdea: '逐行放置皇后：每一行从左到右尝试列，若与已有皇后同列或同对角线则放弃该列；一行无列可放就回退到上一行换列。找到完整放置即得到一个解。',
      timeComplexity: 'O(n!) 量级（带剪枝）',
      spaceComplexity: 'O(n)',
      pseudocode: [
        'procedure solve(row)',
        '  if row = n then 记录一个解并返回',
        '  for col ← 0 to n-1 do',
        '    检查 (row, col) 是否与已有皇后冲突',
        '    冲突 → 尝试下一列',
        '    放置皇后，递归 solve(row+1)',
        '    移除皇后（回退），尝试下一列',
        '  end for',
        'end procedure',
      ],
    },
    defaultInput: { type: 'nqueens', n: 6 },
    validate: validateNQueensInput,
    run: (input) => nQueensGen(input as NQueensInput),
  },
];

export default entries;
