# VISUALIZATION_SPEC.md — 可视化规格

## 1. 帧类型（src/core/step/frame.ts，判别联合）

| kind | 用途 | 关键字段 |
| --- | --- | --- |
| `array` | 排序、搜索 | values, comparing[], swapping[], sorted[], pivot, range, pointers, target, found, note |
| `structure` | 栈/队列/链表 | layout, nodes[{id,value,state}], pointers(名→下标), message |
| `tree` | BST/遍历 | nodes[{id,value,x,y,state}], edges, highlight[], output[], message |
| `graph` | BFS/DFS/Dijkstra | nodes[{id,x,y,state,distance,predecessor}], edges[{state,weight,directed}], current, frontier, frontierKind, message |
| `recursion` | 递归 | callStack[{label,state,returnValue}], pegs, lastMove, memo, message |
| `nqueens` | N 皇后 | n, queens[], tryingRow/Col, attacking, solutions, message |
| `dp` | DP 表 | rowHeaders, colHeaders, cells(行优先，null=未填), current, dependencies, message, extras |

所有坐标一律 [0,1] 相对坐标，由渲染器按视口缩放。帧对象不可变——生成器每步构造新对象（数组字段必须新建）。

## 2. 颜色语义（CSS 变量，dark/light 各一套）

| 语义 | 变量后缀 | 含义 |
| --- | --- | --- |
| normal | `-default` | 常规元素 |
| active | `-active` | 当前比较/访问/操作对象（黄） |
| danger | `-danger` | 交换/删除/冲突（红） |
| success | `-success` | 已排序/已访问/找到/路径（绿） |
| special | `-special` | pivot/新节点/入队/尝试放置（紫） |
| muted | `-muted` | 区间外/未涉及（灰） |

渲染器只认 `ElementState`（normal/active/danger/success/special/muted），不写死颜色。

## 3. 各渲染器规则

### ArrayBars（array）
- SVG；柱高 ∝ 值（min 8% 底高）；`range` 区间外元素降为 muted。
- comparing→active、swapping→danger、sorted→success、pivot→special、found→success 并加光圈。
- n ≤ 30 时柱顶显示数值、柱下显示下标；指针（i/j/min/mid…）画在轴下方对应位置。
- 目标值（搜索）在面板与柱顶目标标记中同时呈现。

### StructureView（structure）
- stack：垂直堆叠，底在下、顶在上，top 指针在侧边；push 新元素 active、pop 前 danger。
- queue：水平排列，头在左；front/rear 指针在上下侧。
- list：水平节点 + 箭头（→ … → NULL）；prev/curr/next 指针标注在节点下方；插入节点以 active 高亮出现，删除节点先 danger 再消失。
- pointers 以"指针名"文本跟随对应元素。

### TreeView（tree）
- SVG 圆形节点 + 直线边；节点半径固定，字号随视口自适应。
- highlight→active、访问/输出→success、新节点→special、被删→danger。
- 输出序列显示在视图下方（等宽字体 chips）。

### GraphView（graph）
- SVG：节点圆形（内显 id），distance 徽标显示在节点右上（null 显示 ∞），predecessor 以"← B"形式显示在节点下。
- 边：无向直线/有向箭头；权重标在边中点（小圆底）；state=active 正在松弛/考察，success 属于最短路/树边，muted 未涉及。
- current 节点加光圈；frontier 面板（队列/栈/集合）显示在视图上方，frontier 内元素同步 special。
- 动画视图为只读渲染；节点拖拽在输入编辑器画布中进行，点击"运行算法"后新坐标生效（见 ARCHITECTURE §关键机制 2）。

### RecursionView（recursion）
- 左侧：调用栈纵向列表，栈顶在上；active=高亮边框，returned=灰化并显示返回值。
- hanoi：右侧三柱 SVG，盘子宽度 ∝ 盘号，彩色按盘号；lastMove 显示在柱区上方。
- memo（fib 可选）：键值 chips。

### NQueensBoard（nqueens）
- CSS Grid 棋盘，深浅格交替；皇后 ♛ 字符；当前尝试格加光圈；attacking 时当前皇后与冲突格标 danger。
- 已找到的解以小型棋盘缩略图列表展示在右侧。

### DPTable（dp）
- HTML 表格；未填格显示 "·"，current 格高亮边框，dependencies 淡黄底，已完成终格 success。
- extras.items 渲染为表格下方的物品清单。

## 4. 布局算法

### 树布局 layoutTree
1. 中序遍历得到每个节点的序号 idx ∈ [0, n-1]，`x = (idx + 0.5) / n`。
2. `y = (depth + 0.5) / (maxDepth + 1)`。
3. 无子树偏移优化（v1.0 接受稀疏树的中序等距布局，保证无重叠）。

### 图默认布局
预设图给手工坐标；用户新增节点按"未占用网格位"放置（0.5 边距的 4×3 网格扫描第一个空闲位）。全部坐标 ∈ [0.05, 0.95]。

## 5. 布局与响应式

- 三栏：左 220px（算法树）/ 中自适应 / 右 320px（教学面板）；< 1024px 时右栏移到下方，< 720px 时左栏折叠为顶部抽屉。
- 可视化区高度 clamp(320px, 52vh, 640px)；SVG viewBox 自适应容器。
- 动画：元素状态切换用 150ms CSS transition；`prefers-reduced-motion: reduce` 时关闭过渡。
