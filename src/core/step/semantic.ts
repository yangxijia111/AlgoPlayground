/**
 * StepSemantic：VizStep 的一等语义层（SEMANTIC_STEP_SPEC）。
 * 职责分离：
 * - semantic = 这一步发生了什么、为什么（机器可判读，消费者禁止再靠 frame diff 反推）
 * - frame    = 现在画什么（完整快照）
 * - description = 给用户看的中文解说
 *
 * 约束：
 * 1. discriminated union：`type` 字面量判别，禁止 `type: string` + `payload: any`。
 * 2. payload 轻量：只存语义必需字段，不复制整个 frame。
 * 3. 消费者必须 exhaustive switch（用 assertNever），default 静默吞未知类型是禁止的；
 *    显式 fallback 分支（frame-diff 兼容）除外。
 */

/** 比较目的（决定 Beginner 如何解释这次比较「为什么发生」） */
export type ComparePurpose =
  | 'bubble-adjacent' // 冒泡：相邻对比较
  | 'selection-min' // 选择：候选与当前最小值比较
  | 'insertion-shift' // 插入：有序前缀与 key 比较
  | 'heap-child' // 堆：父与（较大）孩子比较（含二选一）
  | 'merge-sides' // 归并：左右半区候选比较
  | 'quick-scan' // 快排：扫描元素与 pivot 比较
  | 'binary-mid' // 二分：mid 与目标比较
  | 'linear-scan'; // 线性查找：逐个检查

/** 交换原因（决定 Beginner 如何解释这次交换「为什么发生」） */
export type SwapReason =
  | 'bubble-order' // 冒泡：相邻逆序，大者右移
  | 'selection-place-min' // 选择：本轮最小值放到未排序区边界
  | 'quick-partition' // 快排：分区扫描中的搬运交换
  | 'quick-pivot-place' // 快排：pivot 落位交换
  | 'heap-extract' // 堆排：堆顶最大值换到末尾
  | 'heapify'; // 堆：siftDown 下沉修复堆性质

/** 写回（单点写入，非交换）：merge 归并写回 / 插入排序后移与落位 */
export type WriteSource = 'merge-left' | 'merge-right' | 'insertion-shift' | 'insertion-place';

export type StepSemantic =
  // ---- 数组（排序 / 搜索）----
  | { type: 'compare'; indices: number[]; values: number[]; purpose: ComparePurpose }
  | { type: 'swap'; indices: [number, number]; values: [number, number]; reason: SwapReason }
  | { type: 'write'; index: number; value: number; source: WriteSource }
  | { type: 'pivot-select'; index: number; value: number; strategy: 'last-element' }
  | { type: 'range-narrow'; side: 'left' | 'right'; from: [number, number]; to: [number, number] }
  | { type: 'found'; index: number; value: number; target: number }
  | { type: 'not-found'; target: number }
  // ---- 线性结构（栈 / 队列）----
  | { type: 'push'; value: string; rejected?: boolean }
  | { type: 'pop'; value: string | null; rejected?: boolean }
  | { type: 'peek'; value: string | null }
  | { type: 'enqueue'; value: string; rejected?: boolean }
  | { type: 'dequeue'; value: string | null; rejected?: boolean }
  | { type: 'front'; value: string | null }
  // ---- 链表 ----
  | { type: 'list-node-create'; value: string }
  | { type: 'list-visit'; index: number; value: string }
  | { type: 'list-insert'; position: number; value: string }
  | { type: 'list-delete'; position: number; value: string }
  | { type: 'list-compare'; index: number; value: string; target: string; equal: boolean }
  // ---- 树（BST 操作 / 遍历）----
  | { type: 'tree-descend'; nodeId: number; nodeValue: number; query: number; direction: 'left' | 'right' | 'root' | 'hit' }
  | { type: 'tree-insert-place'; nodeId: number; value: number }
  | { type: 'tree-delete'; value: number; caseType: 'leaf' | 'one-child' | 'two-children'; successorValue?: number }
  | { type: 'tree-output'; nodeId: number; value: number; order: 'pre' | 'in' | 'post' | 'level' }
  | { type: 'tree-enqueue'; value: number }
  // ---- 图（BFS / DFS / Dijkstra）----
  | { type: 'visit-node'; nodeId: string; algorithm: 'bfs' | 'dfs' | 'dijkstra' }
  | { type: 'frontier-add'; nodeIds: string[]; container: 'queue' | 'stack' | 'set' }
  | {
      type: 'graph-relax';
      from: string;
      to: string;
      weight: number;
      oldDistance: number | null;
      newDistance: number;
      predecessor: string;
    }
  | { type: 'graph-examine'; from: string; to: string; weight: number; oldDistance: number; candidate: number }
  | { type: 'graph-finalize'; nodeId: string; distance: number }
  // ---- 递归 ----
  | { type: 'call'; label: string; note?: string }
  | { type: 'return'; label: string; value?: string }
  | { type: 'move'; disk: number; from: string; to: string }
  // ---- DP ----
  | {
      type: 'dp-fill';
      cell: number;
      row: number;
      col: number;
      dependencies: number[];
      value: number;
      choice: 'base' | 'sum' | 'take' | 'skip' | 'copy';
    }
  // ---- 回溯（N 皇后）----
  | { type: 'try-place'; row: number; col: number; conflict: boolean; reason?: string }
  | { type: 'place'; row: number; col: number }
  | { type: 'remove'; row: number; col: number }
  | { type: 'backtrack'; fromRow: number; toRow: number }
  | { type: 'solution-found'; solution: number[] };

/** exhaustive switch 辅助：新增 semantic 类型时使漏分支编译报错 */
export function assertNeverSemantic(s: never): never {
  throw new Error(`未处理的 StepSemantic 类型：${JSON.stringify(s)}`);
}

/** semantic 类型判别（轻量工具，测试与消费者使用） */
export function semanticTypeOf(s: StepSemantic): StepSemantic['type'] {
  return s.type;
}
