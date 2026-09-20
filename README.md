# AlgoPlayground

面向计算机初学者的**交互式数据结构与算法可视化平台**。把抽象的算法执行过程变成可播放、可暂停、可逐步回看的"动画教材"：每一步都有中文解说、伪代码当前行高亮与计数统计。

![门禁](https://github.com/yangxijia111/AlgoPlayground/actions/workflows/ci.yml/badge.svg)

## 功能总览

| 分类 | 内容 |
| --- | --- |
| 排序 | 冒泡 · 选择 · 插入 · 归并 · 快速 · 堆排序（随机/几乎有序/逆序/重复值，自定义数组） |
| 搜索 | 线性查找 · 二分查找（区间/mid/命中可视化，无序输入拦截 + 一键排序） |
| 线性结构 | 栈（Push/Pop/Peek）· 队列（Enqueue/Dequeue/Front）· 单链表（建表/遍历/插入/删除/搜索） |
| 树 | BST 插入/查找/删除（叶子/单子/双子三情形）· 前序/中序/后序/层序遍历 |
| 图 | 交互式编辑器（拖拽/增删节点边/权重/有向无向/起终点）+ BFS/DFS/Dijkstra（距离/前驱/最短路径回溯） |
| 递归 | 阶乘 · 斐波那契朴素递归（调用栈全程可视）· 汉诺塔（三柱盘移动） |
| 回溯 | N 皇后（4–8）：尝试/冲突/回退/解列表 |
| 动态规划 | 斐波那契 DP（一维表）· 0/1 背包（二维表逐格填充） |
| 比较模式 | 同一数据最多 3 种排序算法同步播放 + Steps/比较/交换统计表 |

## 播放器

- 播放 / 暂停 / 上一步 / 下一步 / 重播 / 时间轴拖动 / 步数显示
- 速度：0.25x / 0.5x / 1x / 2x / 4x
- 快捷键：`空格` 播放暂停 · `←`/`→` 单步 · `R` 重播
- 架构保证：算法只产出标准化步骤（快照式 Step），播放、回退、变速不影响算法结果——任意操作后动画结果可精确重放

## 教学模式

每个算法页面包含：算法名称与用途、核心思想、伪代码（随动画高亮当前执行行）、时间/空间复杂度、稳定性（排序类）、当前步骤的中文解说、计数统计（比较/交换/访问/递归等）与变量状态面板。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器
```

```bash
npm test           # 全部测试（Vitest）
npm run lint       # ESLint（0 warning 门槛）
npm run typecheck  # TypeScript strict
npm run build      # 产物构建（含 typecheck）
```

## 技术栈与架构

- **React 18 + TypeScript(strict) + Vite**，react-router 路由，渲染以 SVG 为主
- **算法与 UI 完全分离**：`src/core/` 纯 TypeScript（Generator 产出 VizStep，零 React 依赖、零 DOM 操作）；`src/ui/` 只负责把快照渲染成界面
- 统一 PlaybackEngine（headless 可测）驱动播放；统一注册表（meta/validate/run）驱动页面
- Dark / Light 双主题（CSS 变量），响应式三栏布局，`prefers-reduced-motion` 支持
- 详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 测试与质量

- 293 项自动化测试：算法正确性（金标准输入与输出对照）、步骤完整性、播放器行为、输入校验、组件交互
- 每次提交门禁：`lint / typecheck / test / build` 四项全绿（GitHub Actions 同步执行）

## 项目目录结构

```
AlgoPlayground/
├── docs/               开发文档（产品/需求/架构/规格/测试计划/路线图/最终报告）
├── .github/workflows/  CI 门禁（lint / typecheck / test / build）
└── src/
    ├── core/           纯逻辑层：类型、播放引擎、注册表、校验
    │   └── algorithms/ 8 个分类共 20 个算法（纯 Generator，零 UI 依赖）
    ├── ui/
    │   ├── components/ 播放器、教学面板与 9 种帧渲染器
    │   ├── editors/    各分类输入编辑器（数组/图/背包…）
    │   ├── pages/      算法页 / 比较模式 / 首页
    │   └── hooks/      播放绑定、快捷键、主题
    └── test/           测试环境配置
```

## 文档

完整文档在 [docs/](docs/)：PRODUCT · REQUIREMENTS · ARCHITECTURE · ALGORITHM_SPEC · VISUALIZATION_SPEC · STATE_SPEC · TEST_PLAN · ROADMAP · CHANGELOG · FINAL_REPORT。

## 已知限制

见 [FINAL_REPORT.md](docs/FINAL_REPORT.md) 的"已知限制"一节。

## License

MIT
