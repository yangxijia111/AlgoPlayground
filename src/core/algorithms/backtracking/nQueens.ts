/**
 * N 皇后回溯可视化生成器：逐行放置，冲突检测、回退、解收集。
 */
import type { NQueensInput } from '../../registry';
import type { VizStep } from '../../step/step';

/** N 皇后伪代码：
 * 0 procedure solve(row)
 * 1   if row = n then 记录一个解并返回
 * 2   for col ← 0 to n-1 do
 * 3     检查 (row, col) 是否与已有皇后冲突
 * 4     冲突 → 尝试下一列
 * 5     放置皇后，递归 solve(row+1)
 * 6     移除皇后（回退），尝试下一列
 * 7 end procedure
 */

export function* nQueensGen(input: NQueensInput): Generator<VizStep, void, void> {
  const n = input.n;
  const queens: number[] = new Array(n).fill(-1);
  const solutions: number[][] = [];
  const counters = { recursions: 0, backtracks: 0, solutions: 0 };

  const emit = (tryingRow: number, tryingCol: number, attacking: boolean, message: string, lines: number[]): VizStep => ({
    frame: {
      kind: 'nqueens',
      n,
      queens: [...queens],
      tryingRow,
      tryingCol,
      attacking,
      solutions: solutions.map((s) => [...s]),
      message,
    },
    description: message,
    pseudocodeLines: lines,
    counters: { ...counters },
  });

  const conflictWith = (row: number, col: number): string | null => {
    for (let r = 0; r < row; r++) {
      const c = queens[r];
      if (c === -1) continue;
      if (c === col) return `与第 ${r + 1} 行皇后同列`;
      if (Math.abs(r - row) === Math.abs(c - col)) return `与第 ${r + 1} 行皇后同对角线`;
    }
    return null;
  };

  yield emit(-1, -1, false, `初始状态：${n}×${n} 棋盘，从第 1 行开始逐行放置皇后`, [0]);

  function* solve(row: number): Generator<VizStep, void, void> {
    counters.recursions++;
    if (row === n) {
      solutions.push([...queens]);
      counters.solutions = solutions.length;
      yield emit(-1, -1, false, `第 ${n} 行放置完成，找到一个解（第 ${solutions.length} 个）：[${queens.map((c) => c + 1).join(', ')}]`, [1]);
      return;
    }
    for (let col = 0; col < n; col++) {
      const why = conflictWith(row, col);
      yield emit(row, col, why !== null, why !== null ? `尝试 (${row + 1}, ${col + 1})：冲突！${why}` : `尝试 (${row + 1}, ${col + 1})：安全`, [3, 4]);
      if (why !== null) continue;
      queens[row] = col;
      yield emit(row, col, false, `在第 ${row + 1} 行第 ${col + 1} 列放置皇后，递归处理第 ${row + 2} 行`, [5]);
      yield* solve(row + 1);
      queens[row] = -1;
      counters.backtracks++;
      if (row < n - 1) {
        yield emit(row, col, false, `回退：移除第 ${row + 1} 行的皇后（第 ${col + 1} 列），尝试该行其他列`, [6]);
      }
    }
    if (row > 0) {
      yield emit(row - 1, queens[row - 1], false, `第 ${row + 1} 行所有列都试过，回溯到第 ${row} 行`, [6]);
    }
  }

  yield* solve(0);
  yield emit(-1, -1, false, `搜索完成：${n} 皇后共有 ${solutions.length} 个解`, [1]);
}
