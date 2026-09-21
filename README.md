# AlgoPlayground

[![CI](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/ci.yml/badge.svg)](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/ci.yml)
[![E2E](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/e2e.yml/badge.svg)](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/e2e.yml)
[![Security](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/security.yml/badge.svg)](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/security.yml)

面向计算机初学者的**交互式数据结构与算法可视化平台**。把抽象的算法执行过程变成可播放、可暂停、可逐步回看的"动画教材"：每一步都有中文解说、伪代码当前行高亮与计数统计。

## 🌐 在线体验

**https://yangxijia111.github.io/AlgoPlayground/**

由 GitHub Actions 自动构建部署（main 分支更新后自动发布）。

## 主要功能

- **统一播放器**：播放/暂停/上一步/下一步/重播/时间轴拖动/0.25x–4x 倍速/键盘快捷键（空格、←/→、R）；算法只产出快照式步骤，任意回退与变速不影响结果、可精确重放
- **教学模式**：每个算法页包含用途、核心思想、伪代码（随动画高亮当前行）、时间/空间复杂度、稳定性、当前步骤中文解说、计数统计与变量状态面板
- **比较模式**：同一组数据最多 3 种排序算法同步播放 + Steps/比较/交换/复杂度对照表
- **交互实验**：随机/自定义数据生成，图编辑器（拖拽节点、增删节点边、权重、起终点），全部输入带中文校验
- **双主题**：Dark 默认 + Light 切换（持久化）；响应式三栏布局

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

- **375 项单元/组件测试**：算法正确性（金标准对照）、步骤完整性、播放器行为、输入校验、组件交互
- **35 项 Playwright E2E**：真实浏览器覆盖首页/排序/播放器/二分/链表/BST/Dijkstra/比较模式/主题持久化/全站导航
- **覆盖率阈值**（`src/core`，v8 provider）：Statements ≥ 98%、Branches ≥ 90%、Functions ≥ 98%、Lines ≥ 98%
- CI 门禁：lint / typecheck / test:coverage / build 全绿；另有独立 E2E 与 Gitleaks 安全扫描工作流

## 项目目录结构

```
AlgoPlayground/
├── docs/               开发文档（产品/需求/架构/规格/测试计划/路线图/最终报告）
├── e2e/                Playwright 端到端用例
├── .github/            CI / E2E / Security / Pages 工作流 + Dependabot
└── src/
    ├── core/           纯逻辑层：类型、播放引擎、注册表、校验
    │   └── algorithms/ 8 个分类共 20 个算法（纯 Generator，零 UI 依赖）
    ├── ui/
    │   ├── components/ 播放器、教学面板、错误边界与 9 种帧渲染器
    │   ├── editors/    各分类输入编辑器（数组/图/背包…）
    │   ├── pages/      算法页 / 比较模式 / 首页
    │   └── hooks/      播放绑定、快捷键、主题
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

完整文档在 [docs/](docs/)：PRODUCT · REQUIREMENTS · ARCHITECTURE · ALGORITHM_SPEC · VISUALIZATION_SPEC · STATE_SPEC · TEST_PLAN · ROADMAP · CHANGELOG · FINAL_REPORT · P9_FINAL_REPORT。

## 已知限制

见 [docs/P9_FINAL_REPORT.md](docs/P9_FINAL_REPORT.md) 的"Known Limitations"一节。

## License

[MIT](LICENSE)
