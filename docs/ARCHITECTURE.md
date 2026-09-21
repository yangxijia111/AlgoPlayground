# ARCHITECTURE.md — 架构设计

## 总体分层

```
┌──────────────────────────────────────────────┐
│  UI 层 (src/ui)        React 组件、页面、样式    │
│    只消费 Step 快照并渲染，禁止实现算法逻辑       │
├──────────────────────────────────────────────┤
│  播放器层 (src/core/player)                    │
│    PlaybackEngine：纯 TS、可订阅、可 headless 测试│
├──────────────────────────────────────────────┤
│  算法层 (src/core/algorithms)                  │
│    纯 Generator：输入 → 产出 VizStep 流          │
│    禁止 import React、禁止操作 DOM、禁止 setTimeout│
├──────────────────────────────────────────────┤
│  类型层 (src/core/step, core/registry)         │
│    Frame/VizStep/输入模型/算法注册表             │
└──────────────────────────────────────────────┘
```

数据流（单向、一次性预计算）：

```
用户输入(表单/编辑器)
   → validate() 校验
   → registry.run(input) 得到 Generator
   → collectSteps() 预计算为 VizStep[]
   → PlaybackEngine(步骤总数)
   → UI 按 engine.index 渲染 steps[index].frame
```

## 核心决策记录（ADR 摘要）

| # | 决策 | 理由 |
| --- | --- | --- |
| ADR-1 | **快照式 Step**：每步携带完整可视化状态快照（Frame），而非增量事件 | 回退/拖动时间轴/重放无需反向折叠或重放事件，实现简单且绝对正确；在数据规模上限（数组≤60、图≤12 节点、DP≤8×32）下内存可控 |
| ADR-2 | **算法 = Generator**：`run(input): Generator<VizStep>` | 天然暂停/顺序产出；纯函数、可单元测试；与播放完全解耦（ADR-1 下消费端只做 `collectSteps`） |
| ADR-3 | **PlaybackEngine 为可订阅类**，React 侧仅用 `useSyncExternalStore` 绑定 | headless 可测（手动 tick 驱动），不依赖 React 渲染周期；避免 setTimeout 把算法与动画绑死 |
| ADR-4 | **渲染选 SVG**（数组柱状图/树/图），DP 表用 HTML 表格 | SVG 支持无级缩放、指针拖拽、CSS 过渡动画；规模小无性能瓶颈 |
| ADR-5 | **状态管理用 React 内置**（useState/useMemo + Context 管 theme），不引入 Redux/Zustand | 跨页面共享的运行时状态只有主题；页面状态（输入、步骤）生命周期与页面一致，本地状态最合适 |
| ADR-6 | **路由 react-router-dom**，一页 = 一个注册表条目 `/:category/:algoId` | 算法数量多且同构，注册表驱动可避免大量重复页面代码 |
| ADR-7 | **帧内含布局坐标**（树/图 x,y ∈ [0,1] 相对坐标） | 快照自包含，渲染器零布局逻辑；图编辑采用"编辑→运行提交"模式（见下） |
| ADR-8 | 比较模式复用同一 PlaybackEngine，`stepCount = max(各算法步数)`，短者在末尾保持终态 | 单一时间轴，实现最简且同步语义清晰 |
| ADR-9 | **学习数据用可订阅纯 TS 单例 store**（`LearningStore` + `useSyncExternalStore`），不引入 Redux/Zustand | 学习数据跨 6+ 页面共享、写操作语义复杂（领域方法），与 PlaybackEngine 同风格可 headless 测试；localStorage 是持久层、内存 store 是运行时单一来源（见 docs/LEARNING_DATA_SPEC.md §4）；写入防抖 300ms + beforeunload flush；损坏数据绝不导致白屏（迁移/校验回退默认档案） |

## 目录结构

```
AlgoPlayground/
├── docs/                    # 本文档体系
├── index.html
├── package.json / tsconfig.json / vite.config.ts / .eslintrc.cjs
└── src/
    ├── main.tsx / App.tsx           # 入口与路由
    ├── styles/global.css            # CSS 变量主题（dark/light）
    ├── core/                        # ★ 纯逻辑层，禁止 import React
    │   ├── step/frame.ts            #   各类 Frame + 工厂函数 + 类型守卫
    │   ├── step/step.ts             #   VizStep、collectSteps
    │   ├── player/engine.ts         #   PlaybackEngine
    │   ├── registry.ts              #   算法注册表（meta/run/validate/默认输入）
    │   ├── validation.ts            #   通用输入校验（返回中文错误）
    │   └── algorithms/
    │       ├── data.ts              #   排序数据生成器（带种子随机）
    │       ├── sorting/…            #   6 种排序
    │       ├── searching/…          #   线性/二分
    │       ├── linear/…             #   栈/队列/链表
    │       ├── tree/…               #   BST、遍历、树布局
    │       ├── graph/…              #   图模型、BFS/DFS/Dijkstra、默认图
    │       ├── recursion/…          #   阶乘/斐波那契/汉诺塔
    │       ├── backtracking/…       #   N 皇后
    │       └── dp/…                 #   斐波那契 DP、0/1 背包
    └── ui/
        ├── components/              # PlayerBar、TeachingPanel、各 Frame 渲染器…
        ├── pages/                   # AlgorithmPage、ComparePage、Home
        ├── editors/                 # 各类别输入编辑器（数组/图/背包…）
        └── hooks/                   # usePlayback、useTheme、useKeyboard
```

## 关键机制

### 1. Step 与 Frame

见 [VISUALIZATION_SPEC.md](VISUALIZATION_SPEC.md)。要点：`VizStep = { frame, description, pseudocodeLines, counters }`，`frame` 为 7 种帧类型的判别联合。

### 2. 图编辑与预计算快照的协调

帧内的节点坐标是运行那一刻模型坐标的拷贝。图编辑器（拖动节点/增删节点边/改权重）只修改编辑器本地模型；点击"运行算法"时把整个模型提交，算法重新预计算，新帧即携带新坐标。该方案避免了渲染期坐标覆盖表，保持帧快照自包含（v1.0 取舍：拖动后需点击运行才能看到新布局的动画）。

### 3. PlaybackEngine

```ts
class PlaybackEngine {
  constructor(stepCount: number, baseMs = 500)
  tick(dtMs: number): void      // rAF 驱动；播放中按 baseMs/speed 累积推进
  play() pause() toggle() next() prev() seek(i) restart() setSpeed(x)
  subscribe(cb): () => void     // 供 useSyncExternalStore
  getSnapshot(): PlayerSnapshot // { index,total,playing,speed,finished }
}
```

推进公式：每步耗时 `baseMs / speed`。到达最后一步自动暂停（finished）。手动 next/prev 会暂停。`speed` 变化重置累积器，不影响 index。

### 4. 注册表

```ts
interface AlgorithmEntry {
  meta: AlgorithmMeta;          // 名称/分类/用途/核心思想/复杂度/稳定性/伪代码
  defaultInput: AlgorithmInput; // 判别联合输入模型
  validate(input): string | null;
  run(input): Generator<VizStep>;
  compareGroup?: 'sorting';     // 可进入比较模式
}
```

页面完全由条目驱动：`AlgorithmPage` 按路由取条目 → 按 `input.type` 选编辑器 → 按帧类型选渲染器 → 复用同一 PlayerBar/TeachingPanel。

### 5. 主题

`document.documentElement.dataset.theme = 'dark' | 'light'`；颜色全部走 CSS 变量；帧状态色（比较/交换/已排序/访问…）在两套主题下各有一组变量。

## 规模上限（内存与可读性保护）

| 维度 | 上限 | 超限处理 |
| --- | --- | --- |
| 排序/搜索数组 | 60 | 校验拒绝并提示 |
| 栈/队列/链表元素 | 12 | 校验拒绝 |
| BST 节点 | 31 | 校验拒绝 |
| 图节点/边 | 12 / 24 | 校验拒绝 |
| 递归 n | 阶乘 12 / 斐波那契 12 / 汉诺塔 8 | 校验拒绝 |
| N 皇后 n | 4–8 | 校验拒绝 |
| 背包 | 物品 ≤ 8、容量 ≤ 20 | 校验拒绝 |
