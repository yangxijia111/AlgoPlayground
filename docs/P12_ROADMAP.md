# P12_ROADMAP.md — Content & Learning Depth 扩展路线图

## 定位

P11 完成正确性强化后，v1.1.1 的架构（semantic 判别联合、契约测试遍历注册表、图编辑器/渲染器/Share 复用）已具备低成本新增算法的能力。P12 以**内容扩展与学习深度**为主题：

1. 新增 2 个高教学价值图算法：**拓扑排序（Kahn + 环检测）**、**Prim 最小生成树**——两者与现有 BFS/Dijkstra 形成完整的图算法学习链（遍历 → 最短路 → 排序/生成树），且完全复用图编辑器、GraphView、Share graph 编码。
2. 学习系统同步接入：Beginner/Predict 的 exhaustive switch 由编译器强制补全、Quiz 题库、学习路线、术语表。
3. Challenge 从 7 个扩展到 12 个（覆盖新算法 + 补齐排序/图缺口）。
4. 修复 P11 Known Limitation 5：Predict 对 write 步骤（归并/插入写回）不出题。

## 范围与非目标

**范围内**：2 个新图算法全管线（类型 → Generator + semantic → 校验 → Share 解码 → 编辑器适配 → Beginner/Predict/Quiz/Challenge/路线/术语 → 单测/契约/属性/metamorphic/E2E）。

**非目标**（记入 Known Limitations / P13 候选）：
- 不新增 DP 双序列算法（LCS/编辑距离）——需要新的帧类型（双序列 DP 表），改动面大，留 P13。
- 不新增 AVL/红黑树（旋转动画布局复杂度高，留 P13 候选）。
- 不做后端/账号/云同步（与 P10 一致，本地优先 by design）。

## Phase 划分与验收标准

流程约束（同 ROADMAP.md）：每个 Phase 完成 `实现 → 测试 → lint → typecheck → build → 文档同步 → git commit` 后才进入下一 Phase。

### P12-0 文档与规划
- [x] 本文档 + ROADMAP.md 增加 P12 条目与状态行

### P12-1 拓扑排序（Kahn 算法 + 环检测）
- [x] `GraphAlgorithm` 扩展 `'topo-sort'`；`GraphInput.start` 对 topo-sort 允许 null（Kahn 从所有入度 0 节点开始，无需起点）
- [x] semantic 新增：`graph-degree-dec`（入度减一）、`cycle-detected`（剩余成环节点）；`visit-node.algorithm` 联合扩展 `'topo-sort'`；复用 `frontier-add`（queue）
- [x] Generator：入度计算 → 入度 0 入队 → 出队输出 → 出边邻居入度减一 → 归零入队；结束时存在剩余节点 → 环检测帧（不崩溃，输出已得前缀）
- [x] 帧显示：distance 徽标复用为「当前入度」（输出节点必然为 0，环上节点 > 0，直观解释为何成环）
- [x] validate：topo-sort 要求全部边为有向边；start 允许 null；Share v2 decode 白名单 + `st=''` 支持；v1 decode 白名单同步
- [x] GraphInputEditor：topo-sort 时隐藏起点选择，显示「从所有入度为 0 的节点开始」说明
- [x] 单测：金标准步骤序列（固定 DAG）、成环图行为、平局确定性（同轮多个入度 0 节点按字母序）、空图/单节点

### P12-2 Prim 最小生成树
- [x] `GraphAlgorithm` 扩展 `'prim'`（start 必选，从起点开始生长）
- [x] semantic 新增：`mst-accept`（节点连入树）、`mst-relax`（key 更新）、`mst-examine`（考察不更新）
- [x] Generator：树集={start} → 每轮从「树→非树」割边中选权重最小（平局按 from,to 字母序）→ 入树 → 用新节点出边更新邻居 key
- [x] 帧显示：distance 徽标复用为「key（连入树的最小边权）」；predecessor 显示连入边；树边 success
- [x] 单测：金标准步骤、平局确定性、总权重、连通性（非连通图：可达部分生成树后正常结束）

### P12-3 学习系统接入
- [x] beginner.ts：新增 5 个 semantic 分支 + visit-node 'topo-sort' 分支（exhaustive switch 编译强制）；教学准确性：Prim 的 relax 明确「不累加路径，只看这一条边」（对比 Dijkstra）
- [x] predict/engine.ts：mst-accept 出题（下一个连入树的节点）、graph-degree-dec 不出题、mst-relax/examine 出题（key 更新）
- [x] Quiz 题库：topo-sort ≥3 题、prim ≥3 题（概念/机制/追踪三类）
- [x] 学习路线 path.ts：图模块追加 topo-sort、prim 两课（标记进阶）
- [x] glossary.ts：新增「拓扑排序」「入度/出度」「最小生成树」「割边」术语
- [x] Challenge defs 7 → 12：新增 insertion-sort（插入一轮）、dfs-order、topo-order、prim-tree、dijkstra-finalize

### P12-4 Predict write 出题（P11 Limitation 5 修复）
- [x] write 步骤出题：「位置 i 将被写入什么值」；干扰项 = 依赖值（merge 另一侧候选/insertion 的 key）、当前位置现值、同数组其他合法值；保证干扰项互异且非正确答案
- [x] 出题质量契约测试更新（原「write 不出题」断言反转）

### P12-5 测试强化
- [x] 契约：26 条目 share roundtrip 契约自动纳入新条目（遍历 allAlgorithms）；Semantic Coverage Contract 补 VARIANT_INPUTS 与关键语义类型
- [x] 属性测试（fast-check ×100）：随机 DAG → topo 输出满足所有边序约束（from 在 to 之前）且为排列；随机连通图 → Prim 总权重 = 参考 Prim/矩阵实现、树边数 = 节点数 − 1
- [x] metamorphic：topo 对同一 DAG 的多次运行结果一致（确定性）；DAG 逆序边图（所有边反向）输出仍合法
- [x] E2E：topo 页面（DAG 正常 + 环图提示）、prim 页面播放与徽标、新挑战可完成、分享链接 roundtrip

### P12-6 全量门禁与文档
- [x] lint / typecheck / test / coverage（阈值不降）/ build / e2e 全绿
- [x] README / CHANGELOG / ROADMAP / ALGORITHM_SPEC（图章节）/ P12_FINAL_REPORT 同步

### P12-7 发布
- [x] commit → push → CI 四工作流绿 → tag `v1.2.0`（创建后不移动）→ GitHub Release → Pages 部署确认

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| semantic 新类型导致消费者编译错误遗漏 | 正是设计意图：exhaustive switch + assertNeverSemantic 让编译器穷举强制补全；每类迁移后 typecheck 才放行 |
| topo 的 start=null 影响 Share/编辑器/预设链路 | encode `st:''` 已天然兼容；decode 增加条件分支；编辑器条件渲染（有 dijkstra 终点先例）；契约测试 roundtrip 自动覆盖 |
| 环图导致挑战/预测死循环 | Kahn 本身终止（入度不再变化即停）；Generator 上限步数防御 + 单测锁定 |
| 覆盖率阈值被新代码稀释 | 新 Generator 分支与防御路径全部配直接单测；coverage 阈值保持 98/90/98/98 不降 |
