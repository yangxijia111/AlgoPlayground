# SEMANTIC_STEP_SPEC — VizStep 一等语义层协议（P11）

## 1. 动机

v1.1.0 中 `VizStep` 只有 `frame / description / pseudocodeLines / counters`。P10 引入的 Beginner Mode、Predict、Challenge 需要「这一步发生了什么、为什么发生」，只能靠 **frame diff 反推**（比较 `swapping.length`、`nodes.length`、`predecessor` 变化），已造成真实教学错误（冒泡泛化、BST 平衡性质误述、Dijkstra relax 猜目标）。P11 为每个关键步骤附加一等语义对象。

## 2. 职责分离（三层数据模型）

| 层 | 字段 | 职责 | 禁止 |
|----|------|------|------|
| 语义 | `semantic?: StepSemantic` | **这一步发生了什么、为什么**（机器可判读） | 不复制 frame 数据 |
| 视图 | `frame: Frame` | **现在画什么**（完整快照） | — |
| 文案 | `description: string` | **给用户看的中文解说** | 不承载机器语义 |

## 3. 类型定义（discriminated union，禁止 `type:string` + `payload:any`）

```ts
export type StepSemantic =
  // ---- 数组（排序 / 搜索）----
  | { type: 'compare'; indices: number[]; purpose: ComparePurpose; values: number[] }
  | { type: 'swap'; indices: [number, number]; values: [number, number]; reason: SwapReason }
  | { type: 'write'; index: number; value: number; source: 'merge-left' | 'merge-right' | 'insertion-shift' }
  | { type: 'pivot-select'; index: number; value: number; strategy: 'last-element' }
  | { type: 'range-narrow'; side: 'left' | 'right'; from: [number, number]; to: [number, number] }
  | { type: 'found'; index: number; value: number; target: number }
  | { type: 'not-found'; target: number }
  // ---- 线性结构 ----
  | { type: 'push'; value: string; rejected?: boolean }
  | { type: 'pop'; value: string | null; rejected?: boolean }        // null = 空栈
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
  // ---- 图 ----
  | { type: 'visit-node'; nodeId: string; algorithm: 'bfs' | 'dfs' | 'dijkstra' }
  | { type: 'frontier-add'; nodeIds: string[]; container: 'queue' | 'stack' | 'set' }
  | { type: 'graph-relax'; from: string; to: string; weight: number; oldDistance: number | null; newDistance: number; predecessor: string }
  | { type: 'graph-examine'; from: string; to: string; weight: number; oldDistance: number; candidate: number }  // 考察后不更新
  | { type: 'graph-finalize'; nodeId: string; distance: number }       // Dijkstra 定型
  | { type: 'graph-reject'; nodeId: string }                           // 重复入队等
  // ---- 递归 ----
  | { type: 'call'; label: string; note?: string }
  | { type: 'return'; label: string; value?: string }
  | { type: 'move'; disk: number; from: string; to: string }
  // ---- DP ----
  | { type: 'dp-fill'; cell: number; row: number; col: number; dependencies: number[]; value: number; choice: 'base' | 'sum' | 'take' | 'skip' | 'copy' }
  // ---- 回溯（N 皇后）----
  | { type: 'try-place'; row: number; col: number; conflict: boolean; reason?: string }
  | { type: 'place'; row: number; col: number }
  | { type: 'remove'; row: number; col: number }
  | { type: 'backtrack'; fromRow: number; toRow: number }
  | { type: 'solution-found'; solution: number[] };

export type ComparePurpose =
  | 'bubble-adjacent'      // 冒泡相邻对
  | 'selection-min'        // 选择排序找最小
  | 'insertion-shift'      // 插入排序 key 比较
  | 'heap-child'           // 堆：父子比较（含选大孩子）
  | 'merge-sides'          // 归并：左右半比较
  | 'quick-scan'           // 快排：j vs pivot
  | 'binary-mid'           // 二分：mid vs target
  | 'linear-scan';         // 线性查找

export type SwapReason =
  | 'bubble-order'         // 冒泡：相邻逆序
  | 'selection-place-min'  // 选择：最小值放到边界
  | 'quick-partition'      // 快排：分区交换
  | 'quick-pivot-place'    // 快排：pivot 落位
  | 'heap-extract'         // 堆排：堆顶换末尾
  | 'heapify';             // 堆：siftDown 下沉修复
```

约束：
- `semantic` 可选：`init` / `transition` / 纯视觉步骤（轮次开始、完成提示、早停说明）允许缺失。
- 关键操作步骤（比较 / 交换 / 写回 / 访问 / 松弛 / 结构操作 / 递归调用返回 / DP 填格 / BST 下降 / 回溯放置）**必须**携带 semantic —— 由 Semantic Coverage Contract 测试强制（见 CROSS_LAYER_TEST_SPEC §5）。
- payload 轻量：只存语义必需字段（下标、值、方向、原因），不复制整个 frame。

## 4. 消费规则（semantic-first，frame-diff 仅作兼容 fallback）

| 消费者 | 规则 |
|--------|------|
| Beginner（`explainStepBeginner`） | 优先 `step.semantic`：按 `type` exhaustive switch 生成解释；`swap` 按 `reason` 分派（bubble=相邻逆序交换 / selection=最小值就位 / quick=分区搬运 / heap=堆顶下沉）；`graph-relax` 直接用 `from/to/oldDistance/newDistance/predecessor`，禁止猜。semantic 缺失时回退现有 `deriveStepKind` frame-diff |
| Predict（`generatePredictQuestion`） | 优先读 `steps[index+1].semantic` 构造题目与答案（答案值直接取自 semantic payload）；干扰项取自当前帧合法候选。无 semantic 时回退 frame-diff 出题 |
| Challenge（`extractAction`） | 期望动作由 `semantic → ChallengeAction` 映射（swap/compare/pick/op）；期望序列仍由真实 Generator 产生，禁止另写「挑战专用算法」 |

所有 consumer 的 switch 必须 exhaustive：新增 semantic 类型时编译期报错（`assertNever`），禁止 default 静默吞未知类型（显式 fallback 分支除外，且须注释说明）。

## 5. 迁移计划（每类完成即跑 lint/typecheck/test/build）

| 阶段 | 范围 | 文件 |
|------|------|------|
| P11-A | 排序（6 种） | sorting/*.ts |
| P11-B | 搜索（线性/二分） | searching/searches.ts |
| P11-C | 线性结构（栈/队列/链表） | linear/*.ts |
| P11-D | 树（BST 操作/遍历） | tree/*.ts |
| P11-E | 图（BFS/DFS/Dijkstra） | graph/*.ts |
| P11-F | 递归/回溯/DP | recursion/ backtracking/ dp/ |

## 6. 性能预算

现有上限（数组 60、图 12 节点、NQueens 8、fib 12、背包 8×20）下，semantic 为每步增加一个 ≤120B 的纯数据对象，steps 总量不变；不复制 frame。`collectSteps` 与 PlaybackEngine 不受影响。
