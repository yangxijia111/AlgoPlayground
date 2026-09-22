/**
 * 动态规划可视化生成器：斐波那契 DP（一维表）与 0/1 背包（二维表）。
 */
import type { DPFrame } from '../../step/frame';
import type { VizStep } from '../../step/step';
import type { StepSemantic } from '../../step/semantic';

const makeEmit = (
  rowHeaders: string[],
  colHeaders: string[],
  counters: Record<string, number>,
  extras: { label: string; items: string[] },
) =>
  (
    cells: (number | null)[],
    current: number | null,
    dependencies: number[],
    message: string,
    lines: number[],
    transition?: DPFrame['transition'],
    semantic?: StepSemantic,
  ): VizStep => {
    const frame: DPFrame = {
      kind: 'dp',
      rowHeaders,
      colHeaders,
      cells: [...cells],
      current,
      dependencies: [...dependencies],
      message,
      extras: { label: extras.label, items: [...extras.items] },
      ...(transition ? { transition } : {}),
    };
    return {
      frame,
      description: message,
      pseudocodeLines: lines,
      counters: { ...counters },
      ...(semantic ? { semantic } : {}),
    };
  };

// ---------------------------------------------------------------------------
// 斐波那契 DP
// 伪代码：
// 0 procedure fibDP(n)
// 1   dp[1] ← 1，dp[2] ← 1        // 基准
// 2   for i ← 3 to n do
// 3     dp[i] ← dp[i-1] + dp[i-2]  // 自底向上填表
// 4   return dp[n]
// ---------------------------------------------------------------------------

export function* fibDPGen(n: number): Generator<VizStep, void, void> {
  const colHeaders = Array.from({ length: n }, (_, i) => String(i + 1));
  const counters = { fills: 0 };
  const extras = { label: '说明', items: ['自底向上：从小问题逐步填到大问题'] };
  const emit = makeEmit(['dp'], colHeaders, counters, extras);
  const cells: (number | null)[] = new Array(n).fill(null);

  const idx = (i: number) => i - 1; // 1-based → 0-based

  yield emit(cells, null, [], `初始状态：长度 ${n} 的 DP 表，从左到右填充`, [0]);
  cells[idx(1)] = 1;
  counters.fills++;
  yield emit(cells, idx(1), [], `基准：dp[1] = 1`, [1], undefined, {
    type: 'dp-fill',
    cell: idx(1),
    row: 0,
    col: idx(1),
    dependencies: [],
    value: 1,
    choice: 'base',
  });
  if (n >= 2) {
    cells[idx(2)] = 1;
    counters.fills++;
    yield emit(cells, idx(2), [], `基准：dp[2] = 1`, [1], undefined, {
      type: 'dp-fill',
      cell: idx(2),
      row: 0,
      col: idx(2),
      dependencies: [],
      value: 1,
      choice: 'base',
    });
    for (let i = 3; i <= n; i++) {
      const dep = [idx(i - 1), idx(i - 2)];
      cells[idx(i)] = (cells[idx(i - 1)] as number) + (cells[idx(i - 2)] as number);
      counters.fills++;
      yield emit(
        cells, idx(i), dep,
        `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${cells[idx(i - 1)]} + ${cells[idx(i - 2)]} = ${cells[idx(i)]}`,
        [2, 3],
        {
          formula: 'dp[i] = dp[i-1] + dp[i-2]',
          candidates: [
            { label: `dp[${i - 1}]`, value: cells[idx(i - 1)] as number },
            { label: `dp[${i - 2}]`, value: cells[idx(i - 2)] as number },
          ],
          chosen: '两者相加：当前值由最近两个子问题唯一确定',
        },
        {
          type: 'dp-fill',
          cell: idx(i),
          row: 0,
          col: idx(i),
          dependencies: dep,
          value: cells[idx(i)]!,
          choice: 'sum',
        },
      );
    }
  }
  yield emit(cells, idx(n), [], `完成：dp[${n}] = ${cells[idx(n)]}（对照朴素递归，填表只需 ${Math.max(0, n - 2)} 次加法）`, [4]);
}

// ---------------------------------------------------------------------------
// 0/1 背包
// 伪代码：
// 0 procedure knapsack(items, W)
// 1   dp[0][*] ← 0                          // 不放任何物品
// 2   for i ← 1 to n do                     // 逐个考虑物品 i
// 3     for w ← 0 to W do
// 4       dp[i][w] ← dp[i-1][w]              // 不选物品 i
// 5       if w ≥ wt[i] 且 dp[i-1][w-wt[i]] + val[i] > dp[i][w] then
// 6         dp[i][w] ← dp[i-1][w-wt[i]] + val[i]   // 选物品 i
// 7   return dp[n][W]
// ---------------------------------------------------------------------------

export function* knapsackGen(items: { name: string; weight: number; value: number }[], capacity: number): Generator<VizStep, void, void> {
  const n = items.length;
  const W = capacity;
  const rowCount = n + 1;
  const colCount = W + 1;
  const colHeaders = Array.from({ length: colCount }, (_, w) => String(w));
  const rowHeaders = Array.from({ length: rowCount }, (_, i) => (i === 0 ? '无物品' : items[i - 1].name));
  const counters = { fills: 0, comparisons: 0 };
  const extras = {
    label: '物品清单（重量/价值）',
    items: items.map((it) => `${it.name}: w=${it.weight}, v=${it.value}`),
  };
  const emit = makeEmit(rowHeaders, colHeaders, counters, extras);
  const cells: (number | null)[] = new Array(rowCount * colCount).fill(null);
  const idx = (i: number, w: number) => i * colCount + w;

  yield emit(cells, null, [], `初始状态：DP 表 ${rowCount} 行 × ${colCount} 列（行=物品，列=容量）`, [0]);
  for (let w = 0; w <= W; w++) {
    cells[idx(0, w)] = 0;
  }
  counters.fills += colCount;
  yield emit(
    cells,
    idx(0, W),
    [],
    `边界：不放任何物品时，任意容量下的最大价值都是 0（第 0 行填 0）`,
    [1],
  );

  for (let i = 1; i <= n; i++) {
    const it = items[i - 1];
    for (let w = 0; w <= W; w++) {
      const notTake = cells[idx(i - 1, w)] as number;
      let best = notTake;
      let take = null as number | null;
      if (w >= it.weight) {
        take = (cells[idx(i - 1, w - it.weight)] as number) + it.value;
        counters.comparisons++;
        if (take > best) best = take;
      }
      cells[idx(i, w)] = best;
      counters.fills++;
      const deps = [idx(i - 1, w), ...(take !== null ? [idx(i - 1, w - it.weight)] : [])];
      const explain =
        take === null
          ? `容量不足，只能不选 → dp = ${notTake}`
          : take > notTake
            ? `不选 = ${notTake}，选 = ${take} → 选更优，dp = ${take}`
            : `不选 = ${notTake}，选 = ${take} → 不选更优（或相同），dp = ${notTake}`;
      const candidates: { label: string; value: number }[] = [{ label: '不选', value: notTake }];
      if (take !== null) candidates.push({ label: `选 ${it.name}`, value: take });
      yield emit(
        cells, idx(i, w), deps,
        `计算 dp[${i}][${w}]（考虑物品 ${it.name}，w=${it.weight}, v=${it.value}）：${explain}`,
        [4, 5, 6],
        {
          formula: 'dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt[i]] + val[i])',
          candidates,
          chosen: take === null ? '容量不足，只能不选该物品' : take > notTake ? `选 ${it.name} 更优` : '不选更优（或相同）',
        },
        {
          type: 'dp-fill',
          cell: idx(i, w),
          row: i,
          col: w,
          dependencies: deps,
          value: best,
          choice: take !== null && take > notTake ? 'take' : 'skip',
        },
      );
    }
  }
  const answer = cells[idx(n, W)] as number;
  yield emit(cells, idx(n, W), [], `完成：容量 ${W} 下能获得的最大价值为 dp[${n}][${W}] = ${answer}`, [7]);
}
