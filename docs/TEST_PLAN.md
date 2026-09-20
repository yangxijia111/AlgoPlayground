# TEST_PLAN.md — 测试计划

工具：Vitest（jsdom 环境供组件测试）。命令：`npm test`（CI 模式单跑）、`npm run test:watch`。
原则：算法正确性以标准实现/已知答案为基准对照；禁止为通过测试而降低标准。

## T1 算法正确性（core，占大头）

### T1.1 排序（6 算法 × 输入集，参数化）
输入集：`[]`、`[1]`、`[2,1]`、`[1,2,3]`、`[3,2,1]`、`[2,2,1]`、`[5,5,5,5]`、`[-3,0,-7,2]`、3 组带种子随机数组（n=10/30/60，值域含重复）。
断言：最终帧 values 与 `[...输入].sort((a,b)=>a-b)` 完全一致；`comparisons/swaps` ≥ 0 且随步骤单调不减。
已知计数用例（防止计数器虚假）：bubble-sort 对 `[3,2,1]`：comparisons=3、swaps=3。

### T1.2 搜索
线性：存在（首/中/尾）、不存在、空数组、单元素命中/不命中。
二分：升序数组 `[-5,-1,0,3,7,7,9]` 上找 -5/首、9/尾、3/中、7/重复、4/不存在；空数组；单元素。
断言：`found` 为期望下标或 null（未找到）；`comparisons` 上界：二分 ≤ ⌈log2(n+1)⌉ 步比较次数。

### T1.3 栈/队列/链表
- 栈 push 后 peek=栈顶；pop 移除栈顶；空栈 pop → 状态不变且有解释步骤。
- 队列 enqueue 尾进、dequeue 头出（FIFO 顺序断言）；空队列 dequeue 拒绝。
- 链表：create 后节点序列与输入一致；traverse 输出序一致；insert(0/中/尾) 后序列正确；delete(0/中/尾) 后序列正确；search 命中/未命中。

### T1.4 BST
- insert：`[8,3,10,1,6,14,4,7,13]` 后中序输出 = 升序；搜索命中/未命中路径正确。
- delete 三情形：叶子、单子、双子（删根含双子）；删后中序仍升序且少一元素。
- 空树插入/搜索/删除不崩溃且解释明确。
- 遍历四序：对固定树断言精确输出序列（pre/in/post/level 各一条金标准）。

### T1.5 图
固定图（手工验证）断言：
- BFS/DFS 访问序（含字母序邻接约定）；含不可达节点时访问序只含连通分量。
- Dijkstra：距离/前驱全表断言；含不可达节点（dist=null）；指定 end 时路径回溯正确。
- 单节点图、孤立起点、平行边禁止（校验层）。

### T1.6 递归/回溯/DP
- 阶乘 fact(5)：调用栈深度峰值=6；返回值链条正确（最终 120）。
- 斐波那契 fib(6)：recursions 计数=15（金标准：c(n)=1+c(n-1)+c(n-2)=2·fib(6)−1=15，基准 fib(1)=fib(2)=1）。
- 汉诺塔 hanoi(3)：移动序列 = 标准 7 步金标准；任意时刻大盘不压小盘（全程断言）；hanoi(1) 单步。
- N 皇后：n=4→2、5→10、6→4、7→40、8→92；每个解都是合法放置（两两不冲突，独立验证函数）。
- fib-dp：dp 表终值 fib(10)=55。
- knapsack：用例 A（wt=[1,3,4], val=[15,20,30], W=4 → 35，即选 A+B）、用例 B（wt=[2,2,6], val=[5,3,8], W=8 → 13）；答案格=已知最优。

## T2 步骤完整性（对所有注册算法统一扫描）

用默认输入运行注册表全部条目，断言：
- steps.length ≥ 2；首帧为初始态、末帧为完成态（description 含"完成"或帧终局语义）。
- 每步 description 非空；pseudocodeLines 均为 [0, pseudocode.length) 合法下标。
- counters 键集全程一致且数值单调不减。

## T3 播放器（engine headless 测试）

- 初始态：index=0、playing=false。
- next/prev 边界：在 0 处 prev 无效；在末尾 next 无效；手动导航后 playing=false。
- tick 推进：playing 时按 baseMs/speed 推进；4x 推进速率是 1x 的 4 倍（同一 dt 断言 index 差）。
- 到达末尾自动暂停（finished）；finished 后 play 重头播放。
- seek：越界 clamp；restart 后 index=0、playing=false、speed 不变。
- setSpeed 不改变 index；playing 中变速后继续正确推进。
- total=0：所有操作安全无异常。
- 可重放性：任意乱序操作序列（play→seek→prev→play→setSpeed…）后，同 index 快照恒定。

## T4 输入校验

数组：非数字项、小数、长度越界、空自定义输入。二分：无序数组报错（一键排序后通过）。
线性结构：空值入栈、超容量。链表：pos 越界。BST：重复值。图：自环、重复边、权重越界、起点未选。
递归/N 皇后/DP：n 越界、容量越界、物品数越界。全部断言中文错误消息非空。

## T5 组件级（@testing-library/react，挑选关键交互）

- PlayerBar：按钮点击触发 index 变化；速度选择显示当前档位；滑块拖动调用 seek。
- TeachingPanel：渲染伪代码并高亮当前行；显示复杂度/稳定性。
- ArrayBars：给定帧渲染正确数量的柱子，comparing/swapping 应用对应样式类。
- Sidebar/Home：导航链接可达；比较模式入口存在。
- AlgorithmPage（冒泡排序冒烟）：加载默认输入即有步骤，点击"下一步"推进。

## T6 门禁与回归

- `npm run lint`：0 error 0 warning。
- `npm run typecheck`：strict 0 error。
- `npm test`：全部通过（目标 ≥ 300 断言用例）。
- `npm run build`：成功产出 dist。
- 四项全绿是每个 Phase 提交与最终 v1.0 的硬性门禁。

## 覆盖率策略

不追求行覆盖率数字，但要求：core 层每个源文件至少被一个测试文件直接覆盖；UI 关键交互组件至少一条用户路径被测。
