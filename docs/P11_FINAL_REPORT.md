# P11_FINAL_REPORT.md — Deep Architecture & Correctness Hardening 最终报告

## 【Version】

- **v1.1.1**（package.json / tag / GitHub Release 一致）
- Commit：`v1.1.1` tag 指向的提交（chore: release v1.1.1，含本报告）
- Tag：`v1.1.1`（创建后未移动；历史 tag v1.0.0 / v1.0.1 / v1.1.0 未做任何修改）
- Release：https://github.com/yangxijia111/AlgoPlayground/releases/tag/v1.1.1
- 基线：v1.1.0（`d13a34d`）→ v1.1.1 共 9 个 Phase 提交（P11-0 文档 → P11-1 状态一致性 → P11-2/3 语义协议与算法迁移 → P11-4 学习系统 semantic-first → P11-5 Share v2 → P11-6 Storage v2 → P11-7 属性/契约测试 → P11-8 E2E → 覆盖率强化 → release）
- GitHub Actions（release 提交）：CI ✅ / E2E ✅ / Security ✅ / Pages ✅ 全部成功

## 【Fixed Bugs】

审计发现并修复的全部真实缺陷（每项均有 regression test 锁定）：

| # | Bug | 根因 | 修复 |
| --- | --- | --- | --- |
| 1 | **Stack Pop 后编辑器显示错误**：`[A,B,C]` pop 后显示 `[B,C]`（应为 `[A,B]`） | `LinearInputEditor.onPop` 对栈/队列统一 `slice(1)`；Generator 正确（`slice(0,-1)`），UI shadow state 分叉 | 编辑器统一走 `applyLinearOperation` 纯 reducer；33 项契约测试锁定 |
| 2 | **BST 删除后树表示失真**：编辑器 `filter(x=>x!==v)` 对双子节点删除产生的树与真实 BST 删除产物不同构 | 插入序列无法表示「中序后继替换」后的树结构 | `applyBSTOperation` delete 用删除产物树的**先序序列**（唯一重建同构 BST）；反例 [8,3,10,1,6,4,7,14] 删 3 已锁定 |
| 3 | **Beginner swap 泛化**：所有交换都解释为「冒泡出更大元素」 | 无语义层，只能给统一文案 | StepSemantic.swap.reason（6 种）分派：冒泡/选择/快排分区/pivot 落位/堆顶取出/heapify；heap-sort 与 quick-sort 解释禁止包含「冒泡」（测试锁定） |
| 4 | **Beginner BST 平衡性质误述**：「每一层比较都会排除一半候选」 | 把平衡 BST 性质套到普通 BST | 改为「平均/平衡 O(log n)；插入序列接近有序退化成链表最坏 O(n)」（测试锁定禁止「排除一半」） |
| 5 | **Beginner Dijkstra relax 猜测**：用「最后一个有前驱的节点」猜本轮松弛目标 | 无 `graph-relax` 语义，从帧反推 | semantic 携带 from/to/weight/oldDistance/newDistance/predecessor；解释与帧变化逐字段一致（多轮随机图验证）；Predict 同源修复 |
| 6 | **Share binary variant 丢失**：binary-search 分享打开后变成 `variant:'linear'` | decode 硬编码 `'linear'`，URL 无 variant 字段 | v1 路径按 URL 参数/条目默认恢复；v2 payload 显式携带；roundtrip deepEqual 测试 |
| 7 | **Share step 不恢复**：`s=<step>` 解析后被丢弃 | AlgorithmPage hydration 未消费 | clamp 到合法范围后 `engine.seek`（s=25 但 18 步 → 17）；StrictMode 双挂载下 pendingSeek 改 state 保证不丢失 |
| 8 | **Share beginner 丢弃**：`m=b` 写入 URL 但解析后丢弃 | DecodeResult 无 mode 字段 | `beginnerMode` 字段 + 方案 A（session 生效，不污染全局设置，用户手动切换后让位） |
| 9 | **Share graph 上限**：最大合法图（12 节点 24 边 ≈2.8KB base64）超过 2000 字符上限 → 应用生成的链接自己打不开 | 上限与 validateGraphInput 合法上限脱节 | v1 上限放宽到 16KB 防御值；v2 graph 数组化紧凑编码（≈1.1KB）；v2 解码补齐边 id 唯一性与重复边检查（审计遗漏，测试发现） |
| 10 | **Storage flush 静默失败**：`catch{}` 后 UI 仍显示「已保存 ✓」 | 无持久化健康概念 | PersistenceStatus（5 态）+ 订阅；NoteEditor/DataCard 显示真实状态 |
| 11 | **多标签页 lost update**：整包覆盖写 localStorage | 无同步机制 | SyncTransport 抽象 + 域级合并（revision 单调递增，拒绝 LWW 整包覆盖）；Tab A 答题 + Tab B 记笔记双向同步后均保留 |
| 12 | **Import 静默吞坏数据**：correct>total、伪完成时间、非法日期（2026-99-99/2026-02-31）、非法图全部「导入成功」 | lenient validateProfile 用于 Import | strictValidateProfile（错误含字段路径）与 lenient 本地恢复分离；activityDays 真实日期校验 + 去重升序 |
| 13 | **Import 无大小限制**：`file.text()` 读任意大文件 | 无上限 | MAX_IMPORT_BYTES=1MB 读取前拒绝 |
| 14 | **linkedList Generator 越界无防御**：越界 insert/delete 位置 reducer 拒绝而 Generator 静默 clamp（属性测试发现） | 生成器信任输入 | insert/delete 加拒绝路径，与 reducer 一致 |
| 15 | **share v2 bst 空树被拒**：`startTree:[]` 经 join 后为空串被 parseNums 拒绝（属性测试发现） | 空串与「无值」不可区分 | 特判空数组 |
| 16 | **Challenge 动作重复提取**：semantic 化后「高亮步(semantic) + 完成步(frame-diff fallback)」重复计入同一操作 | 混合提取策略 | extractAction 改 semantic-only |

## 【Architecture】

### Semantic Step Protocol

- `src/core/step/semantic.ts`：`StepSemantic` 判别联合（discriminated union，禁止 `type:string`+`payload:any`）。
- **支持的 semantic 类型（36 种）**：compare（8 种 purpose）、swap（6 种 reason）、write（4 种 source）、pivot-select、range-narrow、found、not-found；push/pop/peek/enqueue/dequeue/front（含 rejected）；list-node-create/visit/insert/delete/compare；tree-descend/insert-place/delete（3 情形+后继值）/output（4 种 order）/enqueue；visit-node（3 种 algorithm）、frontier-add、graph-relax（from/to/weight/oldDistance/newDistance/predecessor）、graph-examine、graph-finalize；call、return、move；dp-fill（5 种 choice）；try-place、place、remove、backtrack、solution-found。
- `assertNeverSemantic` 强制消费者 exhaustive switch（无 default 静默吞未知类型）。
- 三层职责分离：semantic=发生了什么/为什么，frame=画什么，description=给用户看的解说。

### 已迁移算法数量

**26 / 26 个注册条目全部迁移**（P11-A 排序 6 → B 搜索 2 → C 线性 3 → D 树 2 → E 图 3 → F 递归 3 + 回溯 1 + DP 2；每类迁移后 lint/typecheck/test/build 全绿才进入下一类）。

### Beginner / Predict / Challenge 是否已 semantic-first

| 消费者 | 状态 | 说明 |
| --- | --- | --- |
| Beginner | ✅ semantic-first | exhaustive switch 生成详解；frame-diff 仅作 semantic 缺失时的兼容回退（relax 回退给保守描述，不再猜节点） |
| Predict | ✅ semantic-first | 答案直接取自 `steps[i+1].semantic` payload；干扰项取自帧内合法候选；frame-diff 回退（relax 多目标时保守跳过） |
| Challenge | ✅ semantic-first | extractAction 改 semantic-only；期望序列仍由真实 Generator 产生，未复制「挑战专用算法」 |

## 【State Consistency】

| 结构 | 审计结果 | 修复与锁定 |
| --- | --- | --- |
| Stack | ❌ pop 方向分叉（Bug #1） | 纯 reducer + 契约测试（连续链 push→pop→push）+ E2E（A,B,C 入栈→pop 显示 [A,B]→push D→帧一致）+ LIFO 属性测试 ×100 |
| Queue | ✅ 无分叉 | 契约测试 + FIFO 属性测试 ×100 锁定 |
| LinkedList | ❌ 越界防御缺失（Bug #14，属性测试发现） | Generator 加拒绝路径 + reducer 契约 + 属性测试 ×100 |
| BST | ❌ 删除表示失真（Bug #2） | 先序序列表示 + 反例锁定 + 「先序重建=Generator 终态」「中序=排序去重集」双属性 ×100 |
| Graph | ✅ 编辑器与 Generator 经同一 validateGraphInput | 严格图校验（storage/Share 复用）+ 属性测试随机图 roundtrip ×100 |
| 编辑器 shadow state | ❌ Share 恢复后不同步 | inputEpoch 重挂机制 + E2E 验证 |

## 【Storage】

| 项 | 状态 |
| --- | --- |
| Schema Version | v2（`STORAGE_VERSION=2`） |
| Migration | v1→v2 自动迁移（补 revision=0；profile 经 lenient 修复）；损坏/未来版本拒绝且不写入；v1 导出文件仍可导入（迁移后 strict 校验）——迁移有真实测试 |
| Import strict validation | strictValidateProfile：quiz `0≤correct≤attempt`、predict `0≤correct≤total`、challenge `completed=false→无时间戳`、真实日期（闰日 2024-02-29 通过；2026-02-31/2026-99-99 拒绝）、重复日期拒绝、savedGraph 严格图校验（12/24 上限、id 唯一、x/y∈[0,1] finite、自环、重复边、权重 1–99 整数、directed boolean）；错误消息含字段路径 |
| Persistence Health | PersistenceStatus（persistent/memory-only/write-failed/quota-exceeded/unavailable）可订阅；flush 失败不再静默；恢复写成功回到 persistent；NoteEditor「已保存 ✓」仅真实持久化显示，DataCard 警告 banner |
| Cross-tab Sync | SyncTransport 抽象（window storage event / 测试 fake）；revision 每次成功写入 +1、远端更高才域合并、旧回声忽略、损坏远端忽略；域合并规则：quiz 信息量大者、notes 更新时间新者、bookmarks/savedGraphs/activityDays 并集、challenge 并集语义；Tab A Quiz + Tab B Note 双向同步后均保留（单测 fake transport + E2E 双 page 真浏览器验证） |

## 【Tests】

- **Unit：846 项全部通过**（v1.1.0 基线 587 项全部保留 + P11 新增 259 项）
- **Property（fast-check）：10 个属性（每个 100 cases）**——栈 LIFO / 队列 FIFO / 链表序列 / BST 先序同构 / BST 中序升序 / share sort / share binary / share graph 随机图 / share bst·nqueens·recursion·knapsack / 排序 semantic↔帧一致（40 cases）+ 满员稳定性（20 cases）
- **Contract：26 条目统一契约**（defaultInput→validate→run→share roundtrip deepEqual→rerun 确定性 + share 输入 rerun 结果一致）+ 33 项编辑器⇄Generator⇄Reducer 三方状态契约 + Semantic Coverage Contract（26 算法 ×2 输入）+ 8 项 Predict/Challenge 质量契约
- **Metamorphic：12 项**——sort(A)≡JS sort、shuffle/reverse 等价、counters 单调、线性/二分查找（步数 ≤⌈log₂n⌉+2）、BFS visited=可达集（独立 DFS 参考）、Dijkstra 三角不等式（终态全边）、BST 中序、N 皇后解数基准（4→2/5→10/6→4/7→40/8→92 + 解合法性独立校验）、fib-dp=朴素递归
- **E2E：79 项全部通过**（v1.1.0 基线 66 项全部保留 + P11 新增 13 项）
- **Coverage（src/core，v8）**：Statements **98.59%** / Branches **90.29%** / Functions **99.69%** / Lines **98.59%**（阈值 98/90/98/98，CI 强制）

### Semantic Coverage Report（defaultInput + 变体输入）

| 算法 | 总步数 | 语义步数 | 覆盖率 | 关键语义类型 |
| --- | --- | --- | --- | --- |
| bubble-sort | 77 / 22 | 63 / 14 | 0.82 / 0.64 | compare swap |
| selection-sort | 88 / 19 | 53 / 8 | 0.60 / 0.42 | compare swap |
| insertion-sort | 83 / 27 | 64 / 17 | 0.77 / 0.63 | compare write |
| merge-sort | 98 / 49 | 59 / 26 | 0.60 / 0.53 | compare write |
| quick-sort | 49 / 24 | 36 / 20 | 0.73 / 0.83 | compare pivot-select swap |
| heap-sort | 87 / 41 | 65 / 27 | 0.75 / 0.66 | compare swap |
| linear-search | 8 / 6 | 7 / 5 | 0.88 / 0.83 | compare found |
| binary-search | 7 / 5 | 6 / 4 | 0.86 / 0.80 | compare found range-narrow |
| stack | 3 / 3 | 1 / 1 | 0.33 / 0.33 | push / pop（单操作 1 语义/3 帧为设计结构） |
| queue | 3 / 3 | 1 / 1 | 0.33 / 0.33 | enqueue / dequeue |
| linked-list | 6 / 4 | 4 / 2 | 0.67 / 0.50 | list-visit list-insert |
| bst-operations | 6 / 8 | 4 / 4 | 0.67 / 0.50 | tree-descend tree-insert-place / tree-delete |
| tree-traversal | 9 / 8 | 7 / 6 | 0.78 / 0.75 | tree-output |
| bfs | 13 / 9 | 11 / 7 | 0.85 / 0.78 | visit-node frontier-add |
| dfs | 11 / 6 | 9 / 4 | 0.82 / 0.67 | visit-node frontier-add |
| dijkstra | 15 / 10 | 13 / 8 | 0.87 / 0.80 | graph-finalize graph-relax graph-examine |
| factorial | 16 / 16 | 10 / 10 | 0.63 / 0.63 | call return |
| fibonacci-recursion | 37 / 61 | 18 / 30 | 0.49 / 0.49 | call return |
| hanoi | 23 / 23 | 21 / 21 | 0.91 / 0.91 | call move return |
| n-queens | 1348 / 1348 | 1346 / 1346 | 1.00 / 1.00 | try-place place remove backtrack solution-found |
| fib-dp | 10 / 10 | 8 / 8 | 0.80 / 0.80 | dp-fill |
| knapsack | 18 / 24 | 15 / 21 | 0.83 / 0.88 | dp-fill |

## 【Security】

- **Gitleaks**：Security workflow 通过（代码 + 完整 Git 历史扫描）；无任何密钥/Token（P11 无需 API Key/后端）。
- **Secret Scan**：无新增敏感数据；Share payload 与 Import JSON 仍仅含算法输入与学习数据。
- **Import Safety**：JSON 仅当纯数据处理（不执行）；1MB 大小上限读取前拒绝；strict 校验拒绝坏数据；导入只经 replaceProfile。
- **Share Safety**：payload 仅含算法输入 + step + beginner 标记（无 Notes/Progress/Quiz/Predict/Challenge/任何私人学习数据）；v2 解码逐字段严格校验（规模上限与 entry.validate 对齐）；任何异常返回 null 不崩溃。
- 无 eval / new Function / dangerouslySetInnerHTML（P11 未引入任何代码执行路径）。

## 【Deployment】

- **Pages**：Pages workflow 成功，构建（base=/AlgoPlayground/）并部署；https://yangxijia111.github.io/AlgoPlayground/ 已更新为 v1.1.1。
- **Smoke Test**：E2E（Playwright Chromium，79 项）在构建产物 + vite preview 上全部通过，覆盖分享恢复/存储失败/导入拒绝/跨标签页等 P11 关键路径。

## 【Known Limitations】

1. **Beginner 兼容回退仍存在**：semantic 缺失的步骤（init/transition/纯视觉）走 frame-diff 推导；当前 26 条目全部产出 semantic，回退路径仅作防御（有 fallback 全类型测试），未来新增算法若漏加 semantic 不会立刻报错（但 Semantic Coverage Contract 会在关键类型缺失时失败）。
2. **跨标签页合并依赖 storage event**：同一浏览器 profile 的同源标签页有效；不同浏览器/设备间无同步（无后端，by design）。合并粒度为域级条目（同一条 quiz 记录并发修改取信息量大者，不保留分支历史）。
3. **Share v1 graph 上限为 16KB 防御值**：v1 老链接若 payload 超过 16KB 仍会被拒（正常合法图远小于此值；v2 链接不受影响）。
4. **栈/队列单操作语义覆盖率 0.33**：每次操作固定 3 帧（初始/高亮/完成）但只有高亮帧携带语义——「完成」帧的语义与高亮帧重复，刻意不重复标注。
5. **Predict 的 write（归并/插入写回）不出题**：单点写入缺少足够干扰项（正确答案与依赖值常相同），semantic-first 与 fallback 均跳过。
6. **Challenge 仍为 7 个定义**：P11 只做提取机制 semantic 化，未新增挑战内容（符合「不加功能数量」原则）。
