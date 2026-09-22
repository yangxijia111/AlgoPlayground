# AlgoPlayground

[![CI](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/ci.yml/badge.svg)](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/ci.yml)
[![E2E](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/e2e.yml/badge.svg)](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/e2e.yml)
[![Security](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/security.yml/badge.svg)](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/security.yml)

面向计算机初学者的**交互式数据结构与算法学习平台**。把抽象的算法执行过程变成可播放、可暂停、可逐步回看的"动画教材"，并围绕它构建完整学习闭环：知识讲解 → 看动画 → 单步观察 → 初学者解释 → 猜下一步 → 小测验 → 挑战 → 复习 → 掌握度 → 学习记录。轻量、本地优先、无需登录、无后端、零数据收集。

## 🌐 在线体验

**https://yangxijia111.github.io/AlgoPlayground/**

由 GitHub Actions 自动构建部署（main 分支更新后自动发布）。

## 主要功能

- **学习路线**：13 章初学者路线（含 4 节基础概念课），覆盖全部算法；章节完成度与「推荐下一步」，不强制解锁
- **统一播放器**：播放/暂停/单步/重播/时间轴拖动/0.25x–4x 倍速/键盘快捷键；快照式步骤，任意回退与变速可精确重放
- **Beginner Mode**：全局新手/标准切换；开启后每一步显示 frame 推导的确定性逐步详解 + 算法要点（本地生成，不调用 AI）
- **Predict Next Step**：播放每推进几步自动暂停出题（或手动「考考我」），预测算法的下一步并即时判分解释；答案永远取自真实下一步
- **Quiz**：20 个算法组 60+ 道中文题（单选/多选/判断，覆盖概念/复杂度/稳定性/推演/机制），即时判分与解析、进度保存
- **Challenge Mode**：7 个动手挑战（冒泡一轮/选择一轮/二分定位/栈/队列操作/BST 查找/BFS 访问序）——由你执行算法的每一步，错误时给出算法原因
- **Progress & Mastery**：可解释的确定性掌握度（0–100 五级）、分类掌握条形、最近学习、学习天数；数据导入/导出/一键重置
- **笔记与收藏**：每算法学习笔记（防抖自动保存）+ 星标收藏
- **分享**：一键复制含当前输入数据的链接；打开即还原，严格校验非法回退
- **复杂度探索器**：六类增长曲线（对数轴）、操作数对照表、算法三档复杂度（最好/平均/最坏）
- **递归树 & DP 增强**：斐波那契递归可切换调用栈/递归树视图；DP 填格显示转移公式与候选对比
- **术语表 & 概念课**：25 个术语的集中解释（点击弹出，不离开页面）
- **比较模式**：同一组数据最多 3 种排序算法同步播放 + 统计对照
- **交互实验**：随机/自定义数据、图编辑器（拖拽/增删/权重/起终点 + 保存图预设）
- **双主题**：Dark 默认 + Light 切换（持久化）；响应式布局；全部新功能键盘可达

## 支持的算法（20 个）

| 分类 | 内容 |
| --- | --- |
| 排序 | 冒泡 · 选择 · 插入 · 归并 · 快速 · 堆排序 |
| 搜索 | 线性查找 · 二分查找 |
| 线性结构 | 栈 · 队列 · 单链表（建表/遍历/插入/删除/搜索） |
| 树 | BST 插入/查找/删除 · 前序/中序/后序/层序遍历 |
| 图 | BFS · DFS · Dijkstra（含最短路径回溯，图可交互编辑） |
| 递归 | 阶乘 · 斐波那契朴素递归 · 汉诺塔（调用栈全程可视） |
| 回溯 | N 皇后（4–8） |
| 动态规划 | 斐波那契 DP · 0/1 背包 |

## 技术栈与架构

React 18 + TypeScript(strict) + Vite；渲染以 SVG 为主；HashRouter。

架构核心是算法与 UI 的彻底解耦：

```
Algorithm (纯 Generator)
  → Generator<VizStep>（快照式步骤：完整帧 + 中文解说 + 伪代码行 + 计数器）
    → PlaybackEngine（headless 可测试，rAF 驱动）
      → React UI（按当前步渲染快照）
```

`src/core/` 为零 React 依赖的纯逻辑层；页面由统一注册表（meta/validate/run）驱动。详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器（Node ≥ 20）
```

## 开发、测试与构建

```bash
npm run lint            # ESLint（0 warning 门槛）
npm run typecheck       # TypeScript strict
npm test                # 单元/组件测试（Vitest）
npm run test:coverage   # 单测 + core 层覆盖率阈值校验
npm run test:e2e        # Playwright E2E（Chromium，自动 build + preview）
npm run build           # 类型检查 + 产物构建
```

## 测试与覆盖率

- **587 项单元/组件测试**：算法正确性（金标准对照）、步骤完整性、播放器行为、输入校验、学习数据存储与迁移、Predict 出题一致性、Quiz 判分与题库校验、挑战状态机、掌握度规则、分享 URL 编解码等
- **66 项 Playwright E2E**：真实浏览器覆盖首页/排序/播放器/二分/链表/BST/Dijkstra/比较模式/主题持久化/全站导航 + 学习路线/新手模式/预测/测验/挑战/进度/笔记收藏/欢迎引导/分享/图预设/递归树/复杂度探索器
- **覆盖率阈值**（`src/core`，v8 provider）：Statements ≥ 98%、Branches ≥ 90%、Functions ≥ 98%、Lines ≥ 98%（当前 98.4/91.1/99.7/98.4）
- CI 门禁：lint / typecheck / test:coverage / build 全绿；另有独立 E2E 与 Gitleaks 安全扫描工作流

## 项目目录结构

```
AlgoPlayground/
├── docs/               开发文档（产品/需求/架构/规格/测试计划/路线图/最终报告）
├── e2e/                Playwright 端到端用例
├── .github/            CI / E2E / Security / Pages 工作流 + Dependabot
└── src/
    ├── core/           纯逻辑层：类型、播放引擎、注册表、校验
    │   ├── algorithms/ 8 个分类共 22 个算法条目（纯 Generator，零 UI 依赖）
    │   ├── learning/   学习路线/概念课/新手详解/术语表/复杂度核心
    │   ├── storage/    学习数据单一来源（版本化 + 迁移 + 防抖持久化）
    │   ├── predict/    猜下一步出题引擎（frame-diff 确定性）
    │   ├── quiz/       测验判分 + 题库（60+ 题与组件分离）
    │   ├── challenge/  挑战状态机 + 7 个挑战定义
    │   ├── progress/   掌握度规则 + 进度聚合
    │   └── share/      分享 URL 编解码
    ├── ui/
    │   ├── components/ 播放器、教学面板、测验/预测/笔记卡片、错误边界与帧渲染器
    │   ├── editors/    各分类输入编辑器（数组/图/背包…）
    │   ├── pages/      算法页 / 学习路线 / 挑战 / 进度 / 术语表 / 复杂度 / 比较模式 / 首页
    │   └── hooks/      播放绑定、快捷键、主题、学习数据订阅
    └── test/           测试环境配置
```

## CI

| Workflow | 触发 | 内容 |
| --- | --- | --- |
| CI | push/PR | lint → typecheck → test:coverage（含阈值） → build |
| E2E | push/PR | Playwright（Chromium）全量端到端 |
| Security | push/PR/每周 | Gitleaks 扫描代码与完整 Git 历史 |
| Pages | push main | 构建（base=/AlgoPlayground/）并部署 GitHub Pages |
| Dependabot | 每周 | npm 与 GitHub Actions 依赖更新 |

## 文档

完整文档在 [docs/](docs/)：PRODUCT · REQUIREMENTS · ARCHITECTURE · ALGORITHM_SPEC · VISUALIZATION_SPEC · STATE_SPEC · TEST_PLAN · ROADMAP · CHANGELOG · FINAL_REPORT · P9_FINAL_REPORT · LEARNING_EXPERIENCE_SPEC · LEARNING_DATA_SPEC · PREDICT_SPEC · QUIZ_SPEC · CHALLENGE_SPEC · PROGRESS_SPEC · P10_ROADMAP · P10_FINAL_REPORT · PRIVACY。

## 隐私

**零数据收集**：无账号、无后端、无遥测；学习数据只保存在浏览器本地，可随时导出或重置。见 [docs/PRIVACY.md](docs/PRIVACY.md)。

## 已知限制

见 [docs/P10_FINAL_REPORT.md](docs/P10_FINAL_REPORT.md) 的"Known Limitations"一节。

## License

[MIT](LICENSE)
