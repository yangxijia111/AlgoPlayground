# P12_FINAL_REPORT.md — Content & Learning Depth 最终报告

## 【Version】

- **v1.2.0**（package.json / tag / GitHub Release 一致）
- Tag：`v1.2.0`（创建后未移动；历史 tag v1.0.0 / v1.0.1 / v1.1.0 / v1.1.1 未做任何修改）
- 基线：v1.1.1（`b03093c`）→ v1.2.0
- 线上：GitHub Pages 部署 v1.2.0 产物

## 【New Content】

### 新增算法（22 → 24 条目，全部复用图基础设施）

| 算法 | 条目 id | 关键设计 | 语义覆盖率（默认/变体） |
| --- | --- | --- | --- |
| 拓扑排序（Kahn + 环检测） | `topo-sort` | distance 徽标复用为「当前入度」：输出节点必然归 0、成环节点恒 >0，直观解释环成因；`start` 允许 null（Kahn 从所有入度 0 节点开始，Share v2 以 `st=''` 编码）；环图不崩溃——输出部分拓扑序前缀 + `cycle-detected`（剩余节点 danger） | 0.85 / 0.82 |
| Prim 最小生成树 | `prim` | distance 徽标复用为「key = 连入树的最小边权」、predecessor 显示连入边、树边 success 累积、候选集按 key 升序；非连通图覆盖可达部分后正常结束 | 0.83 / 0.80 |

两者与既有 BFS → DFS → Dijkstra 构成完整的图算法学习链（遍历 → 最短路 → 排序/生成树）；图编辑器、GraphView、Share graph 编码、预设系统全部零重复复用（编辑器仅增加 topo 起点说明的条件渲染）。

### StepSemantic 扩展（36 → 41 类型）

- `graph-degree-dec`（from/to/before/after；归零入队事件由帧 frontier 体现，Beginner 按 after===0 给出归零解释）
- `cycle-detected`（remaining）
- `mst-examine` / `mst-relax` / `mst-accept`（key 语义与 Dijkstra 的 dist 明确区分：**只比较单边权重，不做路径累加**——Beginner/Predict/Quiz 三处一致强调）
- `visit-node.algorithm` 联合扩展 `'topo-sort'`

消费者补全由判别联合 + `assertNeverSemantic` 在编译期强制（Beginner/Predict 的 exhaustive switch）。

### 学习系统接入

| 消费者 | 接入内容 |
| --- | --- |
| Beginner | 5 个新 semantic 分支 + topo visit-node 分支；入度归零、环成因、割边性质、Prim vs Dijkstra 区别全部给出正确解释 |
| Predict | mst-accept（下一个连入树的节点）/ mst-relax（key 将更新为多少）出题；topo 出队题专属文案；mst-examine / graph-degree-dec / cycle-detected 不出题 |
| Quiz | topo-sort 3 题 + prim 3 题（概念 / 机制 / Prim vs Dijkstra 对比） |
| 学习路线 | 图章节追加两课；全部 24 算法恰好覆盖一次（契约测试锁定） |
| 术语表 | DAG、入度/出度、拓扑序、最小生成树、割边（5 条） |
| Challenge | **7 → 12**：quick-partition（快排分区一轮，compare+swap 双动作）、dfs-order、topo-order、prim-tree、dijkstra-finalize；期望序列全部由真实 Generator semantic 提取 |

## 【Fixed】

- **P11 Known Limitation 5（Predict write 不出题）修复**：write 步骤（归并写回 / 插入移位与落位）现出「位置 i 将被写入什么值」题；干扰项 = 旧值、数组内其他值、±1（去重互异、候选不足安全降级）；质量契约锁定 merge/insertion 双场景答案 = semantic.value。P11 报告 Known Limitations 剩余项（栈/队列 0.33 覆盖率为设计结构、无后端跨设备同步 by design）保持现状。

## 【Tests】

- **Unit：874 项全部通过**（v1.1.1 基线 846 全部保留 + P12 新增 28 项：topo/prim 金标准与确定性 15、属性 3、metamorphic 2、write/mst 出题质量契约 2、路线覆盖契约更新等）
- **Property（fast-check ×100 ×3）**：随机 DAG（编号有序连边保证无环）→ Kahn 输出为全体节点排列且满足全部边序约束；随机 DAG 加反向边 → cycle-detected 必然出现且输出为真前缀；随机连通图（随机生成树 + 额外边）→ Prim 总权重 = 独立 Kruskal 参考实现、树边数 = V−1
- **Metamorphic 新增 2 项**（共 14）：DAG 全边反向 → 输出仍合法且镜像（A↔E 首尾互换）；Prim 换起点 → 总权重不变
- **Contract 自动扩展**：24 条目 share roundtrip + rerun 确定性契约、Semantic Coverage Contract（新条目配置变体输入与关键类型）全部遍历注册表自动纳入新算法
- **E2E：87 项全部通过**（v1.1.1 基线 79 全部保留 + P12 新增 8 项：topo/prim 终态与单步、双算法分享 roundtrip、topo-order 与 prim-tree 挑战通关）
- **Coverage（src/core，v8）**：Statements **98.60%** / Branches **90.49%** / Functions **99.71%** / Lines **98.60%**（阈值 98/90/98/98，不降通过）

### Semantic Coverage（新算法）

| 算法 | 总步数（默认/变体） | 语义步数 | 覆盖率 | 关键语义类型 |
| --- | --- | --- | --- | --- |
| topo-sort | 13 / 11 | 11 / 9 | 0.85 / 0.82 | frontier-add graph-degree-dec visit-node |
| prim | 12 / 10 | 10 / 8 | 0.83 / 0.80 | mst-accept mst-relax（变体含 mst-examine） |

## 【Compatibility】

- v1.1.1 及更早的分享链接、localStorage 数据（schema v2）、导出文件全部不受影响（Share 解码仅扩白名单，旧 payload 逐字节兼容）。
- 新算法的 v2 分享链接含 `al:'topo-sort'|'prim'`；`st=''` 仅对 topo-sort 合法（编码 start=null），其余算法行为不变。
- 挑战记录按 id 存储，新增 5 个挑战不影响既有完成状态；Progress/掌握度对新算法 quiz 同样生效。

## 【Known Limitations】

1. **拓扑序不唯一**：同一时刻多个入度 0 节点本实现固定按字母序输出（确定性优先）；Beginner 详解已说明「选谁都合法」。
2. **Prim 平局按字母序**：割边权重相同时选择 (from,to) 字典序最小的端点——确定性优先，教学解释已在 Beginner 中说明平局任选皆可。
3. **图编辑器不校验「先画有向边再选 topo-sort」**：validate 在运行时拒绝含无向边的 topo 输入（错误消息明确指引）；编辑器切算法时保留图结构由用户自行调整。
4. **Predict 对 topo 的 graph-degree-dec 不出题**：入度减一的答案（before−1）可由题面直接推出，出题质量不足，刻意跳过。
5. **P13 候选**（非本期范围）：DP 双序列算法（LCS/编辑距离，需新帧类型）、AVL 旋转（布局动画复杂度高）、并查集/KMP。
