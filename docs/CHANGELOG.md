# CHANGELOG.md

本文件记录 AlgoPlayground 的每个 Phase 交付。格式参考 Keep a Changelog；版本号语义：0.x 为开发期，1.0.0 为首个稳定版。

## [Unreleased]

### P0 — 基础设施与文档 ✅
- 新增 docs/ 文档体系：PRODUCT / REQUIREMENTS / ARCHITECTURE / ALGORITHM_SPEC / VISUALIZATION_SPEC / STATE_SPEC / TEST_PLAN / ROADMAP / CHANGELOG。
- 新增项目脚手架：Vite + React 18 + TypeScript(strict) + ESLint + Vitest(jsdom)。
- 新增 core 层：Frame/VizStep 类型体系、PlaybackEngine（headless 可测）、注册表骨架、输入校验工具。
- 新增 GitHub Actions 工作流（lint/typecheck/test/build 门禁）。

（后续 Phase 在完成时追加于此）

### P1 — 排序模块 ✅
- 新增 6 种排序算法 Generator：冒泡（早停）、选择、插入、归并（辅助副本写回）、快速（Lomuto）、堆排序；全部纯逻辑、零 UI 依赖。
- 新增带种子数据生成器：随机 / 几乎有序 / 逆序 / 大量重复值。
- 新增 UI：三栏布局（左导航 / 中可视化+编辑器+播放器 / 右教学面板）；数组柱状图渲染器（比较/交换/已排序/pivot/区间/指针）；伪代码当前行高亮；中文步骤解说；比较/交换/写入计数与步数显示。
- 新增统一播放器：播放/暂停/上一步/下一步/重播/0.25x–4x 速度/时间轴拖动/键盘快捷键（空格、←/→、R）。
- 排序输入编辑器：模式生成 + 大小调节（4–60）+ 自定义数组（校验：整数、-99–999、≤60 个）。
- 测试：排序正确性（6 算法 × 11 输入集）、已知计数金标准、步骤完整性、播放器引擎、组件交互、输入校验、数据生成器，共 159 项。


### P2 — 搜索与线性结构 ✅
- 新增线性查找与二分查找（区间/mid/命中高亮，二分无序输入拦截 + 一键排序）。
- 新增栈（Push/Pop/Peek）、队列（Enqueue/Dequeue/Front）可视化：空/满操作拒绝步骤、top/front/rear 指针、容量 12。
- 新增单链表：建表/遍历/按位置插入/删除/搜索，prev/curr 指针可视化，支持连续链式操作。
- StructureView 渲染器（栈垂直/队列水平/链表箭头）与三个输入编辑器。
- 测试累计 207 项全绿（新增搜索 26 项、线性结构 22 项）。

### P3 — 树模块 ✅
- 新增 BST 纯数据模型与自动布局（中序序号 → x、深度 → y），结构变化后自动重排且无重叠。
- 新增 BST 插入/搜索/删除动画：下行路径高亮，删除覆盖叶子、单孩子、双子（中序后继顶替）三情形；重复值/不存在值拒绝。
- 新增四种遍历动画（前序/中序/后序递归、层序队列驱动），输出序列随步骤增长展示。
- TreeView SVG 渲染器与 BST/遍历两个编辑器（支持链式操作与重建）。
- 测试累计 236 项全绿（新增 29 项：模型/布局/操作/遍历/校验）。

### P4 — 图模块 ✅
- 新增 BFS/DFS/Dijkstra 可视化生成器：字母序邻居保证确定性；visited/frontier（队列/栈/未确定集）/当前节点/边状态/距离徽标/前驱全程展示；Dijkstra 支持指定终点提前结束并回溯高亮最短路径；不可达节点显示 ∞。
- 新增交互式图编辑器：四种模式（移动/加节点/连边/删除），节点拖拽、有向开关、权重设置与修改、起终点下拉选择；自环/重复边/权重越界/节点上限（12）等全部校验。
- GraphView SVG 渲染器（箭头、权重标签、距离徽标、前驱标注、frontier 面板）。
- 测试累计 257 项全绿（新增 21 项：访问序金标准、距离/前驱、路径回溯、孤立节点、校验）。

### P5 — 递归、回溯与动态规划 ✅
- 新增阶乘（调用栈压栈/返回全程）、斐波那契朴素双递归（先左后右调用序，调用计数体现指数爆炸）、汉诺塔（调用栈 + 三柱盘移动，全程合法性断言）。
- 新增 N 皇后（4–8）：当前尝试/冲突原因/回退/解列表（缩略图棋盘）；n=4..8 解数 2/10/4/40/92 全部通过。
- 新增斐波那契 DP（一维表）与 0/1 背包（二维表）：逐格填充、当前格与依赖格高亮、物品清单展示。
- RecursionView/NQueensBoard/DPTable 渲染器与三个输入编辑器（递归 n、皇后规模、背包物品与容量）。
- 测试累计 289 项全绿（新增 32 项，含背包已知答案 35/13 与金标准）。

### P6 — 排序比较模式 ✅
- 新增 ComparePage：同一数组最多选择 3 种排序算法，单一时间轴同步播放（短算法终态保持）；统计表（Steps/比较/交换/时间复杂度）与稳定性对照；统计数字与单独运行一致的测试保证。
- usePlayback 改为按步骤数驱动（多视图共用引擎更直接）。
- 测试累计 293 项全绿（新增 4 项组件测试）。

### P7 — UI 完善与体验 ✅
- 新增 Dark/Light 双主题切换（CSS 变量 + localStorage 持久化，dark 默认）。
- 首页新增比较模式入口卡片；README 完整交付（功能、快速开始、架构、测试）。
- 快捷键防冲突：焦点在按钮上时空格/回交还给按钮；输入控件内不拦截。
- 可访问性与响应式核查：aria 标签、焦点样式、prefers-reduced-motion、1024/720 断点。

### P8 — 全项目审计与 v1.0.0 发布 ✅
- 全库审计：死代码清理（counters 助手、checkInt）；AlgorithmPage 输入状态语义修正；树编辑器按条目 id 选择（修复遍历页"重建"误切编辑器）。
- 新增注册表全量扫描测试（T2 中心化：20 条目 × 元数据/校验一致性/步骤完整性）。
- 浏览器人工走查 7 个关键页面（截图验证），修复汉诺塔盘子宽度视觉 bug。
- 文档同步：图编辑机制描述（ARCHITECTURE/STATE_SPEC/VISUALIZATION_SPEC）、TEST_PLAN 两处金标准修正（fib(6) 调用数 15；背包用例 A = 35）。
- 交付 FINAL_REPORT.md；版本号升至 1.0.0；创建 GitHub 仓库并推送，打 tag v1.0.0。
- 最终门禁：lint ✅ / typecheck ✅ / test 358 ✅ / build ✅。

## [1.0.0] — 2026-09-20

首个稳定版本：20 个算法可视化 + 统一播放器 + 教学面板 + 排序比较模式 + 图交互编辑器 + 双主题；358 项自动化测试全绿。

## [1.0.1] — 2026-09-21

### P9 — Public Release Hardening

- 新增正式 MIT LICENSE 文件（GitHub 可识别）。
- 新增 GitHub Pages 在线 Demo：官方 Actions 部署，`vite build --base=/AlgoPlayground/` 子路径处理，HashRouter 保证深层链接刷新不 404。
- 新增 Playwright（Chromium）E2E：35 项用例覆盖首页、冒泡排序、播放器（Next/Prev/Restart/Speed/Timeline）、二分查找、链表插入、BST 插入/搜索、Dijkstra 距离与最短路径、比较模式、主题持久化、全站 18 页导航无崩溃；全部基于 locator/expect/poll 的确定性等待。
- 新增覆盖率体系：@vitest/coverage-v8，`npm run test:coverage`；core 层真实覆盖率 Statements 98.99% / Branches 92.10% / Functions 99.29% / Lines 98.99%，阈值设为 98/90/98/98。
- 补充关键测试（375 项单测）：步骤完整性检查器全部失败分支、7 个帧类型守卫、注册表查找函数、formatDistance、图预设满网格回退。
- 新增 React ErrorBoundary（公开 Demo 崩溃兜底）。
- CI 升级：coverage 纳入门禁并上传报告；新增独立 E2E、Security（Gitleaks 全历史扫描）、Pages 工作流；Dependabot（npm + github-actions，weekly）。
- Node 版本统一：engines >=20 + .nvmrc（20）。
- 文档一致性：README 测试数量更新为实际运行结果（此前残留 293，实际 375 + 35 E2E）。

## [Unreleased] — v1.1.0 开发中（P10 Learning Experience）

### P10-0 — Learning Architecture ✅
- 新增学习数据类型层 `src/core/learning/types.ts`：LearningProfile v1 schema（progress/quiz/predict/challenge/bookmarks/notes/savedGraphs/settings/activityDays），版本化（storageVersion）。
- 新增 `src/core/storage/`：防御性加载与校验（无数据/损坏 JSON/未来版本三类回退，绝不白屏；未来版本拒绝加载且不写入）；`LearningStore` 可订阅单例（领域方法唯一写入口、不可变更新、300ms 防抖持久化、flush、localStorage 不可用时内存降级）；迁移框架 `MIGRATIONS` 预留 v1→v2 通路。
- React 绑定 `useLearningProfile`（useSyncExternalStore）；App 挂载 beforeunload/visibilitychange 即时持久化。
- ADR-9 记录状态管理选型（ARCHITECTURE.md）。
- 新增 42 项测试，累计 417 项全绿；coverage 98.69/92.40/99.48/98.69 达标。

### P10-1 — Learning Path ✅
- 新增学习路线数据 `src/core/learning/path.ts`：13 章初学者路线覆盖全部 22 个算法 + 4 节概念课；章节完成度/推荐下一步/整体进度派生函数（纯函数、可测）。
- 新增概念课内容 `src/core/learning/concepts.ts`：算法是什么/数据结构是什么/时间复杂度/空间复杂度（What/Why/Key Points 结构化内容 + 关联算法）。
- 新增 `/learn` 学习路线页（章节卡片、进度条、已完成标记、推荐下一步，不强制解锁）与 `/learn/concept/:id` 概念课页（访问即记录 `concept:<id>` 进度）。
- 侧栏新增「学习路线」入口；算法条目显示学习状态圆点（已访问点亮）。
- 算法页挂接进度记录：进入页面 viewCount+1（StrictMode 安全），播放到末步标记 animationWatched。
- 新增 15 项测试与 3 项 E2E（路线导航/概念课/状态点亮），累计 432 项单测 + 38 项 E2E 全绿。

### P10-2 — Beginner Mode + Glossary ✅
- 新增 Beginner Mode 逐步详解引擎 `src/core/learning/beginner.ts`：`deriveStepKind`（从 Frame 语义字段推导 21 种步骤类型）+ `explainStepBeginner`（按帧类型生成含具体下标/值的中文详解；确定性、本地生成、不调用 AI）；识别不了的步骤不强凑解释（返回 null）。
- 新增每算法初学者要点 `getBeginnerNote`（22 个算法中 19 个核心算法已覆盖，集中管理，不动算法注册表文件）。
- 顶栏新增「🎓 新手」全局切换（Beginner/Standard，存入 settings 跨页面保持）；TeachingPanel「当前步骤」卡片双模式：Standard 与 v1.0.1 完全一致，Beginner 显示逐步详解 + 要点标签。
- 新增术语表 `src/core/learning/glossary.ts`（25 个术语，含任务要求的全部 22 项）；`/glossary` 术语表页（卡片索引 + 相关算法跳转）；概念课文本支持 `[[term:id]]` 标记，渲染为可点击术语引用（TermTip 弹窗，Esc/外点关闭，键盘可操作，不离开当前页面）。
- 新增 34 项测试（引擎推导/详解内容/确定性/术语数据完整性/UI 弹窗/全局切换集成）+ 3 项 E2E；累计 470 项单测 + 41 项 E2E 全绿。

### P10-3 — Predict Next Step ✅
- 新增出题引擎 `src/core/predict/engine.ts`：基于 cur/next 两步 frame diff 确定性出题（九种题型：下一比较对/下一交换/二分 mid/下一访问节点/松弛距离/入栈出栈/入队出队/BST 下一节点/DP 下一格/下一递归调用）；干扰项从当前帧候选值确定性构造（无 AI、无随机、可重放）；候选不足或步骤不适合时返回 null 不打扰。
- 一致性由结构保证：正确答案永远取自真实 steps[index+1]；一致性测试遍历代表算法全程断言 options[answerIndex] 与真实下一帧字段相等。
- 算法页新增「🤔 预测模式」：播放每推进 4 步自动暂停出题（可关闭），或手动「考考我」；答题流程 选择 → 提交 → 对/错反馈 → 真实下一步解释 → 继续动画。
- 评分入库：attempts（algorithmId/stepIndex/stepType/correct/时间）计入掌握度；会话内正确率实时显示。
- 新增 16 项单测 + 2 项 E2E；累计 486 项单测 + 43 项 E2E 全绿。

### P10-4 — Quiz System ✅
- 新增 Quiz 类型与判分 `src/core/quiz/types.ts`：single/multiple/judge 三题型；多选需全部选对；越界/空选择防御性判错。判分纯函数、零 UI 依赖。
- 新增题库 62 道（sortingSearching.ts + structuresAlgo.ts）：20 个核心算法组各 3–5 道高质量中文题，覆盖 concept/complexity/stability/trace/mechanism 五类；每题带必填解析与难度分级；题目与 React 组件完全分离。
- 题库完整性静态校验测试：id 唯一、algorithmId 存在于注册表、options/answer 与题型匹配、核心算法 ≥3 题且 ≥2 类别。
- 算法页新增「📝 随堂小测」：顺序作答、即时判分与解析、提交后锁定、下一题/再做一轮、历史对错圆点（刷新保留）；答题记录经 store 入库（attemptCount 累加、lastCorrect 覆盖）。
- 新增 17 项单测 + 2 项 E2E；累计 513 项单测 + 45 项 E2E 全绿；coverage 98.43/91.86/99.57/98.43。

### P10-5 — Challenge Mode ✅
- 新增挑战核心 `src/core/challenge/`：`ChallengeDef/ChallengeAction/ChallengeMachine/ChallengeResult` 类型 + 纯函数状态机（createMachine/submitAction/restartMachine，不可变更新，headless 可测）。
- 期望序列完全复用现有 `Generator<VizStep>`：排序取比较/交换步、结构类拼接多次单操作运行、树/图取被访问节点——挑战与真实算法结构上不可能冲突；「挑战动作与真实算法一致」测试逐一通关验证。
- 首批 7 个挑战全部可玩：冒泡一轮（点两格比较/交换）、选择一轮、二分定位（点中点）、栈/队列操作序列（操作按钮）、BST 查找与 BFS 访问顺序（点树上/图上节点）。
- 错误反馈具教学价值：说明算法此刻应该做什么（如「BFS 用队列，下一步应访问最早入队的节点」），错误反馈引用期望动作 + 真实步骤解说。
- TreeView/GraphView 新增可选 `onSelectNode`（默认不传行为不变）；新增 `/challenges` 列表与 `/challenges/:id` 玩法页；完成挑战写入 store（attempts/bestMistakes）计入掌握度。
- 新增 13 项状态机单测 + 7 项 E2E；累计 526 项单测 + 52 项 E2E 全绿。
