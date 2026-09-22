# CROSS_LAYER_TEST_SPEC — 跨层契约 / 属性 / 变异测试（P11）

## 1. 为什么 587 单测 + 66 E2E + 98% 覆盖仍然漏 bug

**Coverage ≠ semantic correctness。** v1.1.0 的测试结构是「每层各自验证」：

- core 单测验证「Generator 输出帧序列」——不验证 UI 编辑器与 Generator 的状态一致（漏 Stack pop）。
- share 单测验证 `decode → entry.validate === null`——不验证 roundtrip 后输入深等于原输入（漏 binary variant）。
- AlgorithmPage 测试验证「解析不崩溃」——不验证 step/beginner 被消费（漏 hydration 丢弃）。
- beginner 测试验证 `explanation !== null`——不验证教学文字与算法语义相符（漏冒泡泛化、BST 平衡误述、relax 猜测）。

结论：需要**跨层契约**（两个独立实现对同一事实必须一致）、**属性测试**（随机输入下不变式恒成立）、**变异测试**（变换输入后输出满足可预测关系）。

## 2. 跨层契约测试（Contract）

### 2.1 Editor ⇄ Generator ⇄ Reference（状态一致性）

对 stack/queue/linkedlist/bst 的每个操作（含拒绝路径与连续操作序列）：

```
apply*Operation(before, op).next  ===  parseFinalState(collectSteps(entry.run({initial: before, operation: op})))
```

- `parseFinalState`：取最后一步帧，stack/queue/list 取 nodes 值序列；bst 取先序序列（重建后与终态树同构）。
- UI 层：RTL 挂载编辑器，执行操作，chips 文本 === reducer.next。

### 2.2 Cross-Layer Algorithm Contract（全注册条目）

每个 `AlgorithmEntry`（26 项）统一执行：

```
defaultInput → validate = null
  → run → steps ≥ 1，帧与语义完整性（integrity）
  → share encode(v2) → decode → deepEqual input（含 variant）
  → rerun → 步骤序列 deepEqual（确定性）
  → semantic 校验（见 §5 覆盖契约）
```

## 3. Property-Based 测试（fast-check）

依赖：`fast-check`（仅 devDependency）。

| 目标 | 属性 |
|------|------|
| 栈 | 随机 push/pop 序列（≤200 步）下：reducer.next === Generator 终态 === UI chips；pop 只移除最后 push 且未被 pop 的元素（LIFO 参考） |
| 队列 | 同上（FIFO 参考） |
| 链表 | 随机 insert/delete/search：reducer ⇄ Generator 终态一致 |
| BST | 随机 build+insert+delete 序列：先序表示重建树 === Generator 终态树同构；中序序列升序；集合语义 = 集合运算结果 |
| Share | 每类型随机合法输入（用 fc 生成，再经 entry.validate 过滤）→ encode → decode → deepEqual |
| Storage | 随机 profile 变异（合法域内）→ 双 Store 交替写 → 合并后域数据并集保留 |
| 排序 semantic | 随机数组：swap semantic 的 (indices, values) 与该步帧 swapping 一致；compare 同 |

规模：每属性 100 cases（CI 稳定优先；`numRuns: 100`）。

## 4. Metamorphic 测试

| 算法 | 关系 |
|------|------|
| 全部排序 | `finalArray(sort(A)) === [...A].sort((a,b)=>a-b)`；且 `sort(A) ≡ sort(shuffle(A)) ≡ sort(reverse(A))` 终态相等；counters.comparisons 对同一输入确定 |
| 线性查找 | 有序无重数组：target ∈ A → found 下标的值 = target；target ∉ A → not-found 步存在 |
| 二分查找 | 有序数组：found 时值=target；步数 ≤ ⌈log2(n)⌉+2（frame range 收缩验证） |
| BFS | visited 集合 === 从 start 可达集合（独立 DFS 参考实现计算） |
| Dijkstra | 终态所有可达边满足三角不等式 `dist[v] ≤ dist[u] + w(u,v)`；`dist[start]=0`；graph-relax semantic 序列长度 = 实际更新次数 |
| BST | 任意序列 build：中序 = sorted(去重集合)；插入后中序仍升序 |
| N 皇后 | 每个解满足行列对角互不攻击（独立校验函数）；解数 = 已知表（n=4→2,5→10,6→4,7→40,8→92） |
| 斐波那契 DP | fib-dp 终值 === 朴素 fib 参考函数 |

## 5. Semantic Coverage Contract

测试遍历每个注册条目（defaultInput + 1 个变体输入）的全部 steps，统计：

- `total`：总步数；
- `semantic`：带 semantic 的步数；
- 按 type 计数关键语义。

断言：
1. 每算法 `semanticRatio ≥ 0.35`（init/transition/pure-visual 允许缺失）；
2. 关键类型必备：排序有 compare+swap（merge/insert 有 write）、搜索有 compare（binary 有 range-narrow 或 found/not-found）、stack/queue 有对应结构操作、linkedlist 有 list-*、bst 有 tree-descend、traversal 有 tree-output、图有 visit-node（dijkstra 另有 graph-relax+graph-finalize）、recursion 有 call+return（hanoi 有 move）、nqueens 有 try-place+backtrack、dp 有 dp-fill。

测试输出每算法计数表（`console.table`），人工同步到 `docs/P11_FINAL_REPORT.md` 的 Semantic Coverage Report。

## 6. 教学正确性测试（Semantic-driven）

- heap-sort 的 swap 解释**不得包含**「冒泡」；quick-sort 的 swap 解释不得包含「冒泡」；bubble 的 swap 解释包含「冒泡」。
- selection 的 swap 解释包含「最小」语义。
- 普通 BST descend 解释不得包含「排除一半」；应包含平均 O(log n)/最坏 O(n) 的准确表述（或至少不虚假声称平衡性质）。
- Dijkstra relax 解释中的目标节点 id === `semantic.to`，旧值 === `semantic.oldDistance`，新值 === `semantic.newDistance`（多轮随机图验证，禁止「猜最后一个 predecessor」）。

## 7. Predict / Challenge 质量测试

- Predict：对 compare/swap/relax/visit/dp-fill/call 各 semantic，`question.answer` 与 semantic payload 一致（如 swap 题 answer === `a[min(i,j)] 与 a[max(i,j)]`；relax 题 answer === String(semantic.newDistance)）。
- Challenge：全部 ChallengeDef 的 expected actions 都能映射回真实 VizStep（stepIndex 落在 buildSteps 区间且该步 semantic 与 action 匹配）；takeActions 截断后序列仍前缀一致。

## 8. E2E 新增（8 项，见任务清单）

Stack 连续链 / binary share variant / share step（含 clamp）/ beginner share（session 生效）/ 最大合法图 share / storage 失败提示 / malformed import 拒绝 / 跨标签页域保留（unit 层双 Store + fake transport 模拟，E2E 层用两 page 对象验证同 storage）。

## 9. 门禁

每阶段：`npm run lint && npm run typecheck && npm test && npm run build`；全量：加 `npm run test:coverage`、`npm run test:e2e`；CI（lint/test/build/E2E/Security/Pages）全绿后才允许 tag v1.1.1。
