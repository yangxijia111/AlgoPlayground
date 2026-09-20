# ALGORITHM_SPEC.md — 算法规格

所有算法统一签名为 `run(input): Generator<VizStep>`，纯逻辑、零副作用、零 import React。
每个 `VizStep` 必须携带：`frame`（完整快照）、`description`（中文解释）、`pseudocodeLines`（高亮伪代码行，0 起）、`counters`（计数器快照）。

通用计数器命名：`comparisons` 比较 / `swaps` 交换 / `writes` 写入 / `visits` 访问 / `recursions` 递归调用 / `backtracks` 回退 / `solutions` 已找到解数。

首个步骤必须是"初始状态"，最后一个步骤必须是"完成态"（终局高亮 + 完成解释）。每个算法的 `meta.pseudocode: string[]` 与 `pseudocodeLines` 下标一一对应。

---

## 1. 排序（输入 `{ type:'sort', array:number[] }`）

| 算法 | 策略要点 | 时间 | 空间 | 稳定 |
| --- | --- | --- | --- | --- |
| bubble-sort | 相邻比较，带 swapped 早停 | O(n²) | O(1) | 稳定 |
| selection-sort | 每轮选最小值放到前端 | O(n²) | O(1) | 不稳定 |
| insertion-sort | 抽牌式向前插入 | O(n²) | O(1) | 稳定 |
| merge-sort | 自顶向下二分，aux 数组归并写回 | O(n log n) | O(n) | 稳定 |
| quick-sort | Lomuto 分区，pivot=区间末元素，递归左右 | O(n log n) 均 | O(log n) | 不稳定 |
| heap-sort | 原地建大顶堆 + 逐个取顶换到末尾 | O(n log n) | O(1) | 不稳定 |

帧语义（ArrayFrame）：`comparing` 本步比较的对（≤2 个下标）/ `swapping` 交换对 / `sorted` 已最终确定的下标（快排为 pivot 落位点，堆排为堆尾，归并为整个数组完成时）/ `pivot` / `range` 当前活动区间（归并的 merge 区、快排的分区区间、二分的 lo..hi）/ `pointers` 命名指针（如 i/j/min/lo/hi/mid/write）。

步骤粒度约定：一次比较产出一步；一次交换产出一步；归并的"从 aux 写回"逐元素产出；建堆 siftDown 的每次比较/交换同上。早停轮次也要产出"本轮无交换"的解释步骤。

## 2. 搜索（输入 `{ type:'search', array, target, variant }`）

- linear-search：逐个比较；`comparing`=当前下标；找到→`found`；未找到→完成步骤说明"目标不存在"。
- binary-search：要求升序（校验层保证）；每步更新 `range` 与 `pointers.mid`；比较分支解释"target ≶ a[mid]"；找到→`found`；区间收缩为空→未找到。
- 计数器：`comparisons`。

## 3. 栈 / 队列（StructureFrame, layout 'stack'|'queue'）

- stack：push（新元素 state='active'，指针 top 移动）、pop（顶部元素移除，需有移除前一步）、peek（top 高亮不动）。
- queue：enqueue（尾部入，rear 指针）、dequeue（头部出，front 指针）、front（只读高亮）。
- 空弹出/满插入必须产出一条"操作被拒绝"的解释步骤，且状态不变。
- 操作序列为单操作输入：页面每次点击生成一次运行的步骤。

## 4. 单链表（StructureFrame, layout 'list'，输入 `{ type:'linkedlist', initial, operation }`）

- create：按 initial 逐节点尾插。
- traverse：curr 指针从头走到尾，逐步高亮。
- insert(pos,value)：定位（prev/curr 指针）→ 新节点以 active 状态出现在目标位（pos=0 头插、pos=len 尾插）。
- delete(pos)：定位 → 目标节点 danger 高亮 → 移除 → 前后重新连接。
- search(value)：逐节点比较；找到/未找到两种完成。
- 非法 pos（<0 或 >len）在校验层拒绝。

## 5. BST（输入 `{ type:'bst', startTree:number[], operation }`）

树模型为纯数据（id/value/left/right），布局函数 `layoutTree(root)` 按"中序序号 → x、深度 → y"产出 [0,1] 相对坐标，帧内节点自带坐标。

- build（初始建树）：对 startTree 逐个执行插入动画。
- insert(value)：从根下行比较（路径节点依次 active），挂到空位（新节点 special）。
- search(value)：同下行逻辑，找到→success / 未找到→完成说明。
- delete(value)：三种情形都支持——叶子直接摘；单子用子树顶替；双子找**中序后继**替换值后删后继。被删/被替节点用 danger 高亮，结构变化后整树重排。
- 遍历（pre/in/post/level）：访问节点时推入 `output`；帧携带累计输出序列；level-order 用队列驱动。
- 重复值：校验层禁止插入已存在值（提示"值已存在"）。

## 6. 图（输入 `{ type:'graph', graph, start, end }`）

GraphModel：nodes（id 'A'…，相对坐标）、edges（directed、weight 1–99）。帧含：节点 state+distance+predecessor、边 state、frontier（含顺序）与 frontierKind。

- bfs：标准队列；出队→访问→未访问邻队（邻接序按字母稳定排序）。frontier=队列内容。
- dfs：显式栈；弹栈→若未访问则访问→逆序压入未访问邻接点。frontier=栈内容（栈顶在末位）。
- dijkstra：简单 O(V²) 选择版；每轮：从未确定集中取 dist 最小者→确定（sorted 态）→松弛出边（更新 distance/predecessor，被更新节点 special）。frontier=未确定集按 dist 升序。若指定 end：确定 end 后提前结束，并回溯前驱以 success 高亮路径。
- 不可达：distance 保持 null，显示为 ∞，完成步骤解释"不可达"。

## 7. 递归（RecursionFrame，callStack 底→顶）

- factorial(n)：帧 label `fact(k)`；入栈 active→返回时标注返回值并出栈；乘法结果在解释中给出。
- fibonacci(n)：朴素双递归；调用顺序固定（先左后右）；同栈语义；`recursions` 计数体现指数爆炸。
- hanoi(n)：三柱 A/B/C；`pegs` 携带每柱盘序（底→顶）；每步一个 CallFrame 或一次移动（lastMove "盘 k: A → C"）；移动序列必须严格合法（大盘不压小盘）。
- n 上限：阶乘/斐波那契 12，汉诺塔 8。

## 8. N 皇后（NQueensFrame）

- 逐行放置：tryingRow/tryingCol 表示当前尝试；`attacking` 标记冲突（同列或对角线）。
- 冲突→解释原因→尝试下一列；行满→解加入 `solutions`；无列可放→回退（`backtracks`+1，上一行皇后移除）。
- 验收基准：n=4→2 解，n=5→10，n=6→4，n=7→40，n=8→92。

## 9. 动态规划（DPFrame：rowHeaders/colHeaders/cells 行优先/current/dependencies）

- fib-dp：一维表 dp[0..n]；从左到右填充，依赖 dp[i-1], dp[i-2]；终值高亮。
- knapsack：二维表 dp[i][w]（i=物品 0..n，w=容量 0..W）；依赖左上 dp[i-1][w-wt] + value 与上方 dp[i-1][w]；每格先"不选"再"选与不选取大"两个子步骤；最终答案 dp[n][W] 高亮。帧 `extras` 携带物品清单文本。
- 已知答案测试：fib(10)=55；背包标准用例（见 TEST_PLAN）。

---

## 步骤完整性硬性约定（自动化测试断言）

1. `steps.length ≥ 2`（至少初始态 + 完成态）。
2. 每步 `description` 非空；`pseudocodeLines` 全部是合法下标。
3. `counters` 键集在步骤间一致且数值单调不减。
4. 正确性：最终帧的语义状态与标准实现一致（排序=升序；搜索=期望下标或未找到；BST=期望形态/输出序列；图=期望访问序/距离/前驱；汉诺塔=合法移动序列；N 皇后=解数正确；DP=已知答案）。
