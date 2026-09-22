# ROADMAP.md — 路线图与验收标准

流程约束：每个 Phase 必须完成 `实现 → 测试 → lint → typecheck → build → 文档同步(CHANGELOG/本文档状态) → git commit` 后才能进入下一 Phase。核心功能不允许静默跳过；非核心增强若受阻，记录 Known Limitation 后继续。

## P0 基础设施与文档
范围：九份文档；Vite+React+TS(strict) 脚手架；ESLint/Vitest 配置；core 类型（Frame/VizStep）、PlaybackEngine、注册表骨架、通用校验工具；CI 工作流文件。
验收：
- [x] 四项门禁命令全绿
- [x] engine 行为测试通过（STATE_SPEC 不变式 I1–I4）
- [x] 文档体系完整且相互引用一致（自审通过）

## P1 排序模块
范围：6 种排序 Generator + 数据生成器（随机/几乎有序/逆序/重复值，带种子）；ArrayBars 渲染器；AlgorithmPage 三栏骨架；TeachingPanel（伪代码高亮/复杂度/稳定性/步骤解释）；PlayerBar + 时间轴 + 快捷键；数组输入编辑器（自定义/生成/大小）。
验收：
- [x] TEST_PLAN T1.1 / T2（排序部分）/ T3 / T5(PlayerBar、ArrayBars) 通过
- [x] 页面显示比较/交换计数与步数；pivot、merge 范围、已排序区域可见
- [x] 回退/拖动/变速不影响结果

## P2 搜索与线性结构
范围：线性/二分搜索；栈、队列、链表及其 StructureView；对应输入编辑器与校验。
验收：
- [x] T1.2 / T1.3 / T4（相关部分）通过
- [x] 二分无序输入被拦截并可一键排序
- [x] 指针（top/front/rear/curr）随步骤正确移动

## P3 树模块
范围：BST 模型与布局、insert/search/delete（三情形）、四种遍历、TreeView、输出序列显示。
验收：
- [x] T1.4 全部通过（含删根双子情形金标准）
- [x] 结构变化后布局自动重排且无重叠
- [x] 遍历输出序列随动画增长

## P4 图模块
范围：GraphModel、图编辑器（拖拽/增删节点边/权重/起终点）、BFS/DFS/Dijkstra、GraphView（frontier/距离/前驱/路径）。
验收：
- [x] T1.5 / T4（图部分）通过
- [x] 编辑器全部交互可用且有校验
- [x] Dijkstra 展示距离更新与最短路径回溯

## P5 递归、回溯与动态规划
范围：阶乘/斐波那契/汉诺塔（调用栈 + 柱状盘）；N 皇后（棋盘/冲突/回退/解列表）；fib-DP 与 0/1 背包（表格填充）。
验收：
- [x] T1.6 全部通过（含汉诺塔 7 步金标准与 N 皇后解数基准）
- [x] 调用栈实时可视；DP 表逐格填充且依赖格可见

## P6 比较模式
范围：ComparePage——同一数据选 2–3 种排序算法，单一时间轴同步播放，统计表（Steps/Comparisons/Swaps/复杂度）。
验收：
- [x] 三视图同步推进，短者末尾保持终态
- [x] 统计数字与各自单独运行一致

## P7 UI 完善与体验
范围：Home 首页；Light 主题切换与持久化；响应式（三栏→纵向）；键盘快捷键全局化；aria/focus/reduced-motion；README。
验收：
- [x] 两套主题下全部页面可读（颜色变量复查）
- [x] 1024/720 断点布局不破版
- [x] 快捷键不与浏览器默认行为冲突且可在按钮聚焦时安全使用

## P8 全项目审计与 v1.0 发布
范围：全库审查（算法正确性、边界、状态管理、动画状态、性能、内存泄漏、React warning、TS、重复/无用代码、测试、可访问性、响应式、文档），发现问题即修复并复跑门禁；产出 FINAL_REPORT.md（全部算法、架构、测试数量与结果、build 结果、目录结构、已知限制、commit hash、GitHub 地址、v1.1 Roadmap）；创建 GitHub 仓库并推送；打 tag `v1.0.0`。
验收：
- [x] 四项门禁最终全绿
- [x] FINAL_REPORT.md 完整
- [x] GitHub 仓库存在且含全部提交、tag 已推送
- [x] CHANGELOG.md 与实际交付一致

## P9 Public Release Hardening（✅ 完成，v1.0.1 已发布）

范围：文档一致性修正（README 测试数量以实际运行结果为准）；正式 MIT LICENSE；@vitest/coverage-v8 覆盖率与 core 层阈值；Playwright（Chromium）E2E 覆盖 10 类关键用户流程（首页/排序/播放器/二分/链表/BST/Dijkstra/比较模式/主题持久化/全页面导航无崩溃）；React ErrorBoundary；GitHub Pages 官方 Actions 部署（vite build --base=/AlgoPlayground/ + HashRouter 刷新兼容）；Dependabot（npm + github-actions，weekly）；Gitleaks 密钥扫描工作流；CI 升级（coverage 纳入门禁）；Node 20 LTS 统一（engines + .nvmrc）；v1.0.1 发布（tag + GitHub Release）。

约束：不重写项目、不改快照架构、不动 v1.0.0 tag；E2E 禁止任意 sleep；coverage 阈值按真实结果设定。

验收：
- [x] LICENSE 存在且 GitHub 可识别
- [x] README/文档测试数量与实际一致（375 单测 + 35 E2E）
- [x] npm run test:coverage 可用且达到设定阈值（98.99/92.10/99.29/98.99）
- [x] npm run test:e2e 全部通过（本地 Chromium，35 项）
- [x] Pages workflow 存在且线上页面可访问（首页/冒泡/Dijkstra/比较模式均已实测）
- [x] Dependabot 与安全扫描工作流存在（Gitleaks 已通过；Dependabot 已自动开 PR）
- [x] CI 升级后全绿（coverage 纳入门禁）
- [x] v1.0.1 tag + GitHub Release 完成
- [x] P9_FINAL_REPORT.md 完成

## P10 Learning Experience（✅ 完成，v1.1.0 已发布）

范围：将项目从「算法可视化工具」升级为「交互式学习平台」。学习闭环：知识讲解 → 看动画 → 单步观察 → 初学者解释 → 猜下一步 → 小测验 → 挑战 → 复习 → 掌握度 → 学习记录。轻量、本地优先、无登录、无后端、无 AI API。

拆解与验收标准见 [P10_ROADMAP.md](P10_ROADMAP.md)（P10-0 架构 → P10-1 学习路线 → P10-2 Beginner+术语 → P10-3 预测 → P10-4 测验 → P10-5 挑战 → P10-6 掌握度 → P10-7 笔记收藏 → P10-8 分享/导入导出 → P10-9 递归树/DP/复杂度 → P10-10 审计与发布）。规格：LEARNING_EXPERIENCE_SPEC / LEARNING_DATA_SPEC / PREDICT_SPEC / QUIZ_SPEC / CHALLENGE_SPEC / PROGRESS_SPEC。

## P11 Deep Architecture & Correctness Hardening（进行中，目标 v1.1.1）

范围：不加新功能，强化正确性与一致性。1) 跨层状态一致性：修复 LinearInputEditor Stack pop 方向错误、BST 删除的插入序列近似失真（改先序序列表示）、Share 恢复后编辑器 shadow state 同步（inputEpoch 重挂）。2) 语义层：VizStep 增加一等 `semantic`（discriminated union），全部算法 Generator 按类别迁移；Beginner / Predict / Challenge 改为 semantic-first（frame-diff 降级为兼容 fallback）。3) 教学正确性：swap 泛化「冒泡」、BST「每层排除一半」、Dijkstra relax 猜目标三处修复。4) Share：协议 v2（`v=2&d=...` 单 payload + graph 紧凑编码），v1 链接向后兼容；修复 binary variant 丢失、step 不恢复、beginner 丢弃、graph 2000 上限。5) Storage：schema v2（revision + migration）、PersistenceStatus（write-failed/quota-exceeded 不再静默）、跨标签页域合并（storage event 传输抽象 + fake transport 测试）、strict import（跨字段 invariant、真实日期校验、严格图校验、1MB 限制）。6) 测试体系：fast-check 属性测试、跨层契约（Editor⇄Generator⇄Reference）、metamorphic、Semantic Coverage Contract、8 项新 E2E。

规格：P11_ARCHITECTURE_AUDIT / SEMANTIC_STEP_SPEC / STATE_CONSISTENCY_SPEC / SHARE_HYDRATION_SPEC / STORAGE_RELIABILITY_SPEC / CROSS_LAYER_TEST_SPEC / P11_ROADMAP。

验收标准（全部满足才发布 v1.1.1）：
- [ ] Stack 连续状态链修复且有契约测试锁定
- [ ] StepSemantic 完成，主要算法关键步骤语义覆盖（Coverage Contract 通过）
- [ ] Beginner / Predict / Challenge semantic-first，三处教学错误修复且有正确性测试
- [ ] Share v2 + v1 兼容：variant / step（含 clamp）/ beginner（session 生效）/ 最大合法图 roundtrip 全部可用
- [ ] Storage v2：invariant / 真实日期 / 严格图校验 / Import 拒绝坏数据 / 持久化状态可见 / 跨标签页不丢数据
- [ ] 属性 / 契约 / metamorphic 测试存在且通过
- [ ] 原 587 单测 + 66 E2E 全部保持通过
- [ ] lint / typecheck / test / coverage / build / e2e 与 CI（含 Security、Pages）全绿
- [ ] README / CHANGELOG / FINAL_REPORT 同步；v1.1.1 tag 创建后不移动

## 状态

| Phase | 状态 |
| --- | --- |
| P0 | ✅ 完成 |
| P1 | ✅ 完成 |
| P2 | ✅ 完成 |
| P3 | ✅ 完成 |
| P4 | ✅ 完成 |
| P5 | ✅ 完成 |
| P6 | ✅ 完成 |
| P7 | ✅ 完成 |
| P8 | ✅ 完成（v1.0.0 已发布） |
| P9 | ✅ 完成（v1.0.1 已发布） |
| P10 | ✅ 完成（v1.1.0 已发布） |
| P11 | 🚧 进行中（目标 v1.1.1） |
