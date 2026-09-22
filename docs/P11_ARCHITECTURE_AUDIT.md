# P11 架构审计报告（v1.1.0 基线）

> 审计日期：2026-09-22 · 基线：v1.1.0（commit f319170）· 目标：v1.1.1
> 本文是 P11 全部工作的出发点：先记录问题与根因，再编码修复。

## 1. 审计范围与方法

逐文件审读 `src/core/`（step / algorithms / learning / predict / challenge / share / storage / progress / player / registry / validation）、`src/ui/`（pages / editors / components / hooks）、`tests`（单元）、`e2e`、`docs`、`package.json`、`.github/`。

审计方法：不信任「测试全绿 = 系统正确」，主动构造反例（UI 本地状态 vs Generator 结果状态对账、share encode→decode roundtrip、损坏/越界数据、多标签页竞争、教学文字与算法语义比对）。

## 2. 发现清单（按严重度）

### A. 跨层状态一致性

| # | 问题 | 位置 | 根因 |
|---|------|------|------|
| A1 | **Stack Pop 后编辑器显示状态错误**：`[A,B,C]` pop 后编辑器 chips 显示 `[B,C]`（应为 `[A,B]`），而 Generator 正确产出 `[A,B]` | `src/ui/editors/LinearInputEditor.tsx:47` | `onPop` 对栈/队列统一用 `list.slice(1)`；栈应 `slice(0,-1)`。Generator（`stackQueue.ts:56`）语义正确，UI shadow state 与之分叉 |
| A2 | **BST 删除后树表示失真**：编辑器用 `tree.filter(x => x !== v)` 近似「删除后的树」，但双子节点删除经中序后继替换后的树**不能**由「原序列去掉该值」重建（例：[8,3,10,1,6,4,7,14] 删 3 后根的左子为 6，filter 序列 [8,10,1,6,4,7,14] 重建后 8 的左子为 1——结构不同） | `src/ui/editors/BSTInputEditor.tsx:71` | 插入序列只能表示「按该顺序插入所得的树」；BST 删除不是「从序列去掉值」。正确表示：删除产物树的**先序序列**（BST 先序序列唯一重建同构树） |
| A3 | **Share 恢复后编辑器 shadow state 不同步**：`LinearInputEditor` 等用 `useState(value.initial)` 仅挂载时初始化；AlgorithmPage 的 share hydration `setInput(result.input)` 后，页面可视化用新输入、编辑器 chips 仍显示旧输入 | 所有编辑器 + `src/ui/pages/AlgorithmPage.tsx:206-224` | 编辑器本地 state 无「输入身份」锚点，prop 变化不感知 |
| A4 | 编辑器「先改本地 state 再 commit」：若 `entry.validate` 失败，父层 input 不变，编辑器本地 state 已变更（潜在分叉；linear 因容量检查在编辑器内先行而暂未触发） | `LinearInputEditor.runOp` 等 | commit 协议没有约定「验证失败必须回滚」或「验证通过才更新本地 state」 |

### B. 语义层缺失（frame-diff 反推算法语义）

| # | 问题 | 位置 | 根因 |
|---|------|------|------|
| B1 | **VizStep 无语义字段**：Beginner / Predict / Challenge 全部依赖 frame diff（比较 `swapping.length`、`nodes.length`、`predecessor` 变化）反推「这一步发生了什么」 | `src/core/step/step.ts` | 架构缺一等公民语义层 |
| B2 | **Beginner swap 泛化错误**：所有交换都解释为「冒泡出更大元素」；对选择排序（最小值就位）、快排（分区/pivot 落位）、堆排（堆顶换末尾/heapify 下沉）全部错误 | `src/core/learning/beginner.ts:178-185` | 无 `semantic.reason`，只能给统一文案 |
| B3 | **Beginner BST 教学错误**：「每一层比较都会排除一半候选，所以查找非常快」——这是平衡 BST 性质，普通 BST 最坏退化链表 O(n) | `src/core/learning/beginner.ts:276` | 文案未区分平均/最坏 |
| B4 | **Beginner Dijkstra relax 猜测**：用「所有已有 predecessor 的节点中最后一个」猜本轮松弛目标 | `src/core/learning/beginner.ts:226-234` | 无 `semantic.graph-relax`（from/to/oldD/newD/pred），只能从帧反推 |
| B5 | Predict 出题同样依赖 frame diff；relax 题目用 `changed[changed.length-1]` 猜目标 | `src/core/predict/engine.ts:172-192` | 同 B1 |
| B6 | Challenge `extractAction` 用 frame diff 提取动作（比较/交换对、栈/队列增删、树/图 active 变化） | `src/core/challenge/defs.ts` | 同 B1；期望序列本身来自 Generator（正确），但动作提取脆弱 |

### C. Share 状态还原

| # | 问题 | 位置 | 根因 |
|---|------|------|------|
| C1 | **搜索 variant 丢失**：binary-search 分享后恢复成 `variant:'linear'`（硬编码） | `src/core/share/url.ts:156` | decode 分支写死 `'linear'`，且 URL 中无 variant 字段 |
| C2 | **step 不恢复**：`DecodeResult.step` 解析出来后 AlgorithmPage 从未使用；无 clamp、无 seek | `AlgorithmPage.tsx:206-224` | hydration 只恢复 input |
| C3 | **Beginner 标志丢弃**：URL 有 `m=b`，`DecodeResult` 无该字段，解析后丢弃 | `url.ts:309` + `AlgorithmPage` | 协议无 mode 概念 |
| C4 | **graph payload 2000 上限可被合法图突破**：12 节点 24 边全量 JSON+base64 可达 ~2800 字符 → 应用自己生成的链接自己打不开 | `url.ts:231` `strOf(...,2000)` | 上限与 validateGraphInput 的合法上限（12/24）不联动，编码不紧凑 |
| C5 | **无协议版本号**：未来任何字段变更都无法区分新旧链接 | `url.ts` 全文 | v1 无 version 字段 |
| C6 | graph decode 无 schema 校验：`JSON.parse(json) as AlgorithmInput` 直接返回（x/y 非数值等进入渲染层） | `url.ts:230-236` | 依赖 entry.validate 兜底，但 validate 不查坐标/字符串形态 |

### D. 学习数据可靠性

| # | 问题 | 位置 | 根因 |
|---|------|------|------|
| D1 | **持久化失败静默**：`flush()` `catch {}` 后 UI 仍显示「已保存 ✓」 | `store.ts:98-104` + `NoteEditor.tsx:53-56` | 无 PersistenceStatus 概念 |
| D2 | **多标签页 lost update**：各 tab 持整份 profile，整包覆盖写 localStorage；Tab A 答题、Tab B 记笔记，后写者覆盖前写者 | `store.ts` 全文 | 无 revision / storage event / BroadcastChannel 同步 |
| D3 | **Import 用 lenient 校验**：`validateProfile` 尽量修复，`correct > total`、伪完成时间、非法日期、非法图全部静默吞掉后提示「导入成功」 | `migrate.ts:183-214` + `DataCard.tsx:43` | strict import 与 lenient local recovery 未分离 |
| D4 | **日期只 regex**：`2026-99-99`、`2026-02-31` 通过；activityDays 不去重 | `migrate.ts:71-73,208-211` | 无 round-trip 真实日期检查 |
| D5 | **SavedGraph 粗校验**：`validateGraphModel` 仅查 nodes/edges 有 id 字符串，其余 `return raw as GraphModel` | `migrate.ts:162-171` | 未按 validateGraphInput 同等标准校验 |
| D6 | **Import 无大小限制**：`file.text()` 直接读任意大文件 | `DataCard.tsx:37` | 无 MAX_IMPORT_BYTES |
| D7 | 跨字段 invariant 无检查：`0≤correctCount≤attemptCount`、`0≤predict.correct≤total`、`completed=false → lastCompletedAt=null` | `migrate.ts` | 各字段独立校验，无关系约束 |

### E. 测试盲区

| # | 问题 | 根因 |
|---|------|------|
| E1 | 587 单测 + 66 E2E + 98% coverage 仍漏掉 A1-C6 全部问题 | 单测各测各层（core 或 UI 单独），无「编辑器状态 vs Generator 结果」跨层契约测试；share 只测 `validate===null` 不测 roundtrip 深等；beginner 只测非空不测教学正确性 |
| E2 | 无 property-based / metamorphic / model-based 测试 | 未引入 fast-check |

## 3. 修复方案总览

1. **StepSemantic 协议**（`docs/SEMANTIC_STEP_SPEC.md`）：VizStep 增加可选 `semantic` 判别联合；按类别迁移全部 Generator；Beginner/Predict/Challenge 改 semantic-first，frame-diff 降级为兼容 fallback。
2. **状态一致性**（`docs/STATE_CONSISTENCY_SPEC.md`）：编辑器领域状态提取为 pure reducer（linear/linkedlist/bst），BST 删除改「先序序列」表示；share 恢复后强制编辑器 remount；契约测试锁定 UI ⇄ Generator ⇄ Reference Model 三方一致。
3. **Share**（`docs/SHARE_HYDRATION_SPEC.md`）：协议 v2（`v=2&d=<base64url>` 单 payload，含 step/mode，graph 紧凑编码）；v1 链接向后兼容（修 variant、放宽 graph 上限至 16KB 防御值）；step clamp + engine.seek；Beginner 按方案 A（仅本次浏览生效）。
4. **Storage**（`docs/STORAGE_RELIABILITY_SPEC.md`）：STORAGE_VERSION 1→2 加 revision + migration；PersistenceStatus 订阅；storage-event 域合并解决跨标签页；strict import 校验 + MAX_IMPORT_BYTES=1MB；lenient 加载路径修 invariant/真实日期/严格图校验。
5. **测试**（`docs/CROSS_LAYER_TEST_SPEC.md`）：fast-check property 测试、跨层契约测试、metamorphic 测试、Semantic Coverage Contract、8 项新 E2E。

## 4. 保持不变项

- 核心架构 `Algorithm → Generator<VizStep> → Snapshot → PlaybackEngine → React UI` 不变。
- 不引入 AI API / 后端 / 账号系统；不加新算法；不降 TypeScript strict。
- v1.0.0 / v1.0.1 / v1.1.0 tag 不动；v1 链接与 v1 localStorage 数据/导出文件保持可用。
