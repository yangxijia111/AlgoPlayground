# P10_ROADMAP.md — Learning Experience 路线图（v1.0.1 → v1.1.0）

目标：将 AlgoPlayground 从「算法可视化工具」升级为「交互式数据结构与算法学习平台」，形成完整学习闭环：
**知识讲解 → 看动画 → 单步观察 → 初学者解释 → 猜下一步 → 小测验 → 挑战 → 复习 → 掌握度 → 学习记录**。

定位约束（不可违背）：
- 轻量、本地优先、无需登录、无后端、无 AI API、零数据收集。
- 不重写稳定架构：`Algorithm → Generator<VizStep> → Snapshot → PlaybackEngine → React UI` 保持不变。
- 算法层保持纯 TypeScript；禁止算法层操作 DOM；禁止算法逻辑写入 React 组件。
- TypeScript strict、现有 375 项单测与 35 项 E2E 全部保留、CI/E2E/Security/Pages 不回归。
- `v1.0.0` / `v1.0.1` tag 不修改、不移动、不覆盖。

规格文档索引：
- [LEARNING_EXPERIENCE_SPEC.md](LEARNING_EXPERIENCE_SPEC.md) — 学习闭环、页面与课程结构、Beginner Mode、导航、无障碍
- [LEARNING_DATA_SPEC.md](LEARNING_DATA_SPEC.md) — 数据模型、存储与迁移、Share URL、Import/Export
- [PREDICT_SPEC.md](PREDICT_SPEC.md) — Predict Next Step 出题引擎与评分
- [QUIZ_SPEC.md](QUIZ_SPEC.md) — Quiz 数据结构与判分
- [CHALLENGE_SPEC.md](CHALLENGE_SPEC.md) — Challenge 架构与首批 7 个挑战
- [PROGRESS_SPEC.md](PROGRESS_SPEC.md) — 掌握度规则与 Progress 页

## Phase 划分与验收标准

每个 Phase 严格执行：`实现 → 自查 → lint → typecheck → unit test → coverage → build → relevant E2E → 修复 → 文档同步 → CHANGELOG → git commit`。不等待用户确认，自动进入下一 Phase。

E2E 新增计划（保留现有 35 项不删减；禁止 sleep 固定等待，一律 locator/expect/明确 UI 状态）：P10-1 learn 路线、P10-2 beginner 切换、P10-3 predict 流程、P10-4 quiz 作答、P10-5 challenge 通关、P10-6 progress 汇总、P10-7 bookmark/notes/welcome、P10-8 share URL/graph preset/import-export/reset、P10-9 recursion tree。最终数量以真实实现为准，不写重复用例。

### P10-0 Learning Architecture
范围：
- `src/core/learning/`：`LearningProfile` 等全套数据类型（LEARNING_DATA_SPEC）。
- `src/core/storage/`：`LearningStore`（可订阅纯 TS 单例，风格与 PlaybackEngine 一致）+ versioned localStorage 读写 + `migrate` 迁移框架（无数据/正常/损坏/未来版本四类输入）+ 坏数据防御（绝不白屏）。
- React 绑定 `useLearningProfile`（useSyncExternalStore）；`ARCHITECTURE.md` 记录 ADR-9（状态管理选型）。
验收：
- [ ] 迁移测试覆盖：无数据 / v1 正常 / 损坏 JSON / 未知未来版本 / 字段类型错误
- [ ] localStorage 写入防抖且有 flush；`localStorage.clear()` 不被使用
- [ ] 四项门禁全绿，原 375 测试不回归

### P10-1 Learning Path
范围：
- `src/core/learning/path.ts`：13 章学习路线数据（章节/小节/算法/概念课引用）。
- `src/core/learning/concepts.ts`：4 节概念课内容（算法是什么/数据结构/时间复杂度/空间复杂度），结构化数据非 HTML。
- `/learn` 页（章节、状态、完成度、推荐下一步，不强制解锁）+ `/learn/concept/:id` 概念课页。
- Sidebar 增加 Learn 等入口；算法条目显示学习状态圆点（订阅 learning store）。
验收：
- [ ] 学习路线覆盖全部 22 个现有算法，无重复内容页（算法讲解复用算法页）
- [ ] 现有路由 `/:category/:algoId` 不受影响
- [ ] 学习状态圆点随 store 变化实时更新

### P10-2 Beginner Mode + Glossary
范围：
- `src/core/learning/beginner.ts`：`deriveStepKind`（从 Frame 语义字段推导步骤类型）+ frame-diff 确定性逐步详解生成器（不调用 AI、本地生成）。
- `AlgorithmMeta.beginnerNote?` 可选字段（每算法一句初学者要点），补齐核心算法。
- 全局 Beginner/Standard 切换（存入 settings）；TeachingPanel「当前步骤」卡片双模式显示。
- `src/core/learning/glossary.ts` 集中术语表（≥22 个术语）；术语弹窗组件（点击不离开页面）+ `/glossary` 页。
验收：
- [ ] 排序/搜索/图/树/DP/递归/结构 7 类帧均有确定性详解
- [ ] Beginner 关闭时 UI 与 v1.0.1 行为一致
- [ ] 术语数据集中管理，UI 不内嵌术语文案

### P10-3 Predict Next Step
范围：
- `src/core/predict/`：`generatePredictQuestion(steps, index)` 纯函数（PREDICT_SPEC）；按帧类型出题（比较/交换/mid/访问节点/松弛/DP 格/结构操作），干扰项确定性生成，不适合的步骤返回 null。
- 算法页 Predict 模式：开启后按间隔暂停出题 → 作答 → 判分 → 解释 → 继续。
- 评分记录（attempts/correct/wrong/stepType/timestamp）写入 store；本次会话正确率显示。
验收：
- [ ] 单测：sorting compare/swap、binary search mid、BFS next node、stack、Dijkstra relaxation、DP next cell 与真实 nextStep 一致
- [ ] 出题确定性（同输入同题目）；无 AI、无随机
- [ ] 预测答对/答错均写入 profile 并计入掌握度

### P10-4 Quiz System
范围：
- `src/core/quiz/`：`QuizQuestion` 类型 + 判分纯函数（QUIZ_SPEC）+ 题库（按算法分文件）。
- 题库：19 个核心算法各 3–5 道高质量题（共 ~75 题），题型 single/multiple/judge，类别覆盖概念/复杂度/稳定性/执行结果/步骤判断。
- 算法页 Quiz 区块（做题、判分、解释、进度保存）；答题记录入 store。
验收：
- [ ] 判分单测：单选/多选/判断/答错/重复作答/记录覆盖
- [ ] 题库完整性校验测试（answer 下标合法、options 非空、explanation 非空、无重复 id）
- [ ] 刷新后答题记录保留（localStorage）

### P10-5 Challenge Mode
范围：
- `src/core/challenge/`：`ChallengeDef / ChallengeAction / ChallengeState / ChallengeResult` + 挑战机（复用现有 Generator 产出 Expected Step Sequence，不复制算法实现）（CHALLENGE_SPEC）。
- 首批 7 个：bubble-pass、selection-round、binary-search、stack-ops、queue-ops、bst-search、bfs-order。
- `/challenges` 列表页 + `/challenges/:id` 挑战页（可玩、有教学价值反馈、Restart）。
验收：
- [ ] 单测：正确操作序列通关、错误操作反馈、重复操作、Restart、边界输入
- [ ] 期望序列与真实算法步骤一致（Challenge 与算法无冲突）
- [ ] 完成挑战写入 profile 并计入掌握度

### P10-6 Progress & Mastery
范围：
- `src/core/progress/`：`computeMastery` 确定性规则（PROGRESS_SPEC）+ 分类聚合。
- `/progress` 页：章节完成度、已学/已掌握算法数、Quiz/Predict 正确率、Challenge 完成、最近学习、学习天数、总练习次数、分类掌握、Export/Import/Reset 入口。
- `AlgorithmMeta.complexity?` 结构化三档复杂度（best/average/worst），6 排序 + 2 搜索填充；TeachingPanel 显示。
验收:
- [ ] 掌握度规则可解释、无随机；边界单测（各档位切换）
- [ ] 「Quiz 100% + Predict 80% + Challenge 完成」等组合符合 PROGRESS_SPEC 数值
- [ ] 渲染性能：历史数据聚合用 memo/派生值，不逐帧重算

### P10-7 Notes / Bookmarks / First Run Welcome
范围：
- 每算法 Learning Notes（普通 textarea、防抖自动保存）；算法页星标收藏。
- Bookmarks 展示区（Progress 页内）；First Run Welcome 单屏引导（只出现一次、可 Skip）。
验收：
- [ ] Notes 刷新保留；输入防抖不逐字符写盘
- [ ] 收藏/取消收藏即时反映；Welcome 二次访问不再出现

### P10-8 Share / Import-Export / Graph Presets / Privacy
范围：
- Share：算法页「分享」生成带输入参数的 URL（LEARNING_DATA_SPEC §6）；严格校验（规模上限复用现有校验），异常回退默认输入并友好提示；不含 Notes/Progress/隐私。
- Export/Import：学习数据 JSON 导出；导入校验 schema+version，坏文件拒绝，覆盖前确认；只当纯数据处理。
- Reset Learning Data：二次确认，只删 `algoplayground-learning` key。
- Graph Editor 保存/加载/删除多个图 preset（校验节点/边/权重/自环/重复边）。
- `docs/PRIVACY.md`。
验收：
- [ ] URL 编解码往返单测（各输入类型）+ 非法 URL 回退测试
- [ ] Import 坏文件/错误版本/超大文件拒绝且不崩溃
- [ ] Reset 不触碰同域其他 key

### P10-9 Additional Learning Views
范围：
- Recursion Tree：`RecursionFrame` 向后兼容扩展可选 `tree` 字段；fibonacci 生成器填充；RecursionView 增加 调用栈/递归树 切换（active/waiting/returned 状态着色）。
- DP 教学增强：`DPFrame.transition?`（当前状态/依赖/转移公式/选择原因）；fib-dp 与 knapsack 填充；DPStateView 展示。
- Complexity Explorer：`/complexity` 页 + core 增长函数（O(1)~O(2^n)），n 可调，关联算法（区分平均/最坏），简单 SVG 曲线。
验收：
- [ ] 现有 recursion/dp 全部测试不回归（扩展字段可选）
- [ ] fib(12) 递归树渲染不卡顿（≤465 节点）
- [ ] 复杂度表述区分平均/最坏（如快排）

### P10-10 Final Audit & v1.1.0 Release
范围：十六项审计（架构/学习 UX/算法回归/Predict 正确性/Quiz/Challenge/Progress/Storage/Migration/Privacy/无障碍/安全/性能/测试/E2E/文档）；发现问题即修复；更新 package.json 1.1.0、CHANGELOG、README、ROADMAP；`P10_FINAL_REPORT.md`；全量门禁（lint/typecheck/test/coverage/build/e2e）；线上 Pages 验收；打 tag `v1.1.0` + GitHub Release。
验收：
- [ ] 六项门禁命令全绿；GitHub CI/E2E/Security/Pages 成功
- [ ] 375 项原有测试全部通过；E2E 含新增用户路径全部通过
- [ ] v1.0.0 / v1.0.1 tag 未动；线上深层路由刷新不 404
- [ ] P10_FINAL_REPORT.md 完成（真实数字，以实际执行为准）

## v1.1.0 明确不做

账号系统、服务器、云同步、AI Tutor、聊天机器人、排行榜、好友、付费功能、复杂 CMS、多人协作、在线编译器。新算法（循环队列/双向链表/拓扑排序/Prim/Kruskal）属 Optional Enhancement，仅在核心学习体验全部稳定后考虑，默认不做。
