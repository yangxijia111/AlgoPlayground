/**
 * 帧类型定义：每种可视化的"完整状态快照"。
 * 核心约定：
 * 1. 帧对象不可变——生成器每步必须构造全新对象（数组字段必须新建）。
 * 2. 所有坐标一律 [0,1] 相对坐标，由渲染器按视口缩放。
 * 3. 颜色不写死在帧里，帧只携带语义状态 ElementState，由 CSS 变量映射。
 */

/** 元素语义状态：渲染器据此取色 */
export type ElementState = 'normal' | 'active' | 'danger' | 'success' | 'special' | 'muted';

// ---------------------------------------------------------------------------
// array：排序 / 搜索
// ---------------------------------------------------------------------------

/** 数组帧：排序与搜索共用 */
export interface ArrayFrame {
  kind: 'array';
  /** 当前数组内容 */
  values: number[];
  /** 正在比较的下标（active） */
  comparing: number[];
  /** 正在交换的下标（danger） */
  swapping: number[];
  /** 已最终确定的下标（success） */
  sorted: number[];
  /** 当前 pivot 下标（special） */
  pivot: number | null;
  /** 当前活动区间 [lo, hi]（闭区间），null 表示无；区间外元素显示为 muted */
  range: [number, number] | null;
  /** 命名指针：i / j / min / lo / hi / mid / write 等 → 下标 */
  pointers: Record<string, number>;
  /** 搜索目标值（仅搜索算法使用） */
  target: number | null;
  /** 已找到的目标下标（success） */
  found: number | null;
  /** 附加文本标注 */
  note: string | null;
}

/** 构造数组帧，未指定的字段填默认值 */
export function arrayFrame(values: number[], patch: Partial<ArrayFrame> = {}): ArrayFrame {
  return {
    kind: 'array',
    values: [...values],
    comparing: [],
    swapping: [],
    sorted: [],
    pivot: null,
    range: null,
    pointers: {},
    target: null,
    found: null,
    note: null,
    ...patch,
  };
}

// ---------------------------------------------------------------------------
// structure：栈 / 队列 / 链表
// ---------------------------------------------------------------------------

export interface StructureNode {
  id: string;
  value: string;
  state: ElementState;
}

export type StructureLayout = 'stack' | 'queue' | 'list';

export interface StructureFrame {
  kind: 'structure';
  layout: StructureLayout;
  /** stack：底→顶；queue：头→尾；list：头→尾 */
  nodes: StructureNode[];
  /** 指针名（top/front/rear/prev/curr/next）→ 节点下标；null 表示指向空 */
  pointers: Record<string, number | null>;
  message: string;
}

export function structureFrame(
  layout: StructureLayout,
  nodes: StructureNode[],
  pointers: Record<string, number | null>,
  message: string,
): StructureFrame {
  return { kind: 'structure', layout, nodes: nodes.map((n) => ({ ...n })), pointers: { ...pointers }, message };
}

// ---------------------------------------------------------------------------
// tree：BST / 遍历
// ---------------------------------------------------------------------------

export interface TreeNodeView {
  /** 节点唯一 id（值可重复，故用 id 标识） */
  id: number;
  value: number;
  x: number;
  y: number;
  state: ElementState;
}

export interface TreeEdgeView {
  from: number;
  to: number;
  state: ElementState;
}

export interface TreeFrame {
  kind: 'tree';
  nodes: TreeNodeView[];
  edges: TreeEdgeView[];
  /** 当前操作涉及的节点 id（active） */
  highlight: number[];
  /** 遍历输出序列（随动画增长） */
  output: string[];
  message: string;
}

// ---------------------------------------------------------------------------
// graph：BFS / DFS / Dijkstra
// ---------------------------------------------------------------------------

export interface GraphNodeView {
  id: string;
  x: number;
  y: number;
  state: ElementState;
  /** null = 不可达/未计算，显示 ∞ */
  distance: number | null;
  /** 前驱节点 id */
  predecessor: string | null;
}

export interface GraphEdgeView {
  id: string;
  from: string;
  to: string;
  directed: boolean;
  weight: number | null;
  state: ElementState;
}

export type FrontierKind = 'queue' | 'stack' | 'set' | 'none';

export interface GraphFrame {
  kind: 'graph';
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
  /** 当前处理的节点 */
  current: string | null;
  /** 队列/栈/待定集当前内容（有序） */
  frontier: { id: string; state: ElementState }[];
  frontierKind: FrontierKind;
  message: string;
}

// ---------------------------------------------------------------------------
// recursion：阶乘 / 斐波那契 / 汉诺塔
// ---------------------------------------------------------------------------

export interface CallFrameView {
  id: string;
  /** 如 "fact(3)" */
  label: string;
  state: 'active' | 'waiting' | 'returned';
  /** 返回值文本（returned 时有值） */
  returnValue: string | null;
}

export interface PegView {
  name: string;
  /** 盘号列表，底→顶 */
  disks: number[];
}

/** 递归树节点状态（沿用调用栈语义，另含未激活灰态） */
export type RecursionTreeNodeState = 'active' | 'waiting' | 'returned' | 'normal';

export interface RecursionTreeNodeView {
  /** 唯一 id（调用序号） */
  id: string;
  /** 如 "fib(4)" */
  label: string;
  /** 父节点 id；根为 null */
  parent: string | null;
  state: RecursionTreeNodeState;
  /** 返回值文本（returned 时有值） */
  returnValue: string | null;
}

export interface RecursionFrame {
  kind: 'recursion';
  /** 调用栈，底→顶 */
  callStack: CallFrameView[];
  /** 汉诺塔三柱（非汉诺塔为 null） */
  pegs: PegView[] | null;
  /** 最近一次移动，如 "盘 3: A → C" */
  lastMove: string | null;
  /** 结果/备忘条目 */
  memo: { key: string; value: string }[] | null;
  message: string;
  /** 可选：递归树视图数据（v1.1 起由斐波那契递归填充；向后兼容字段） */
  tree?: { nodes: RecursionTreeNodeView[]; currentId: string | null };
}

// ---------------------------------------------------------------------------
// nqueens：N 皇后
// ---------------------------------------------------------------------------

export interface NQueensFrame {
  kind: 'nqueens';
  n: number;
  /** queens[row] = col，-1 表示该行未放置 */
  queens: number[];
  /** 当前尝试位置 */
  tryingRow: number;
  tryingCol: number;
  /** 当前尝试是否冲突 */
  attacking: boolean;
  /** 已找到的解（每解为长度 n 的列号数组） */
  solutions: number[][];
  message: string;
}

// ---------------------------------------------------------------------------
// dp：斐波那契 DP / 0-1 背包
// ---------------------------------------------------------------------------

export interface DPTransition {
  /** 转移公式，如 "dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt]+val)" */
  formula: string;
  /** 候选值对比 */
  candidates: { label: string; value: number }[];
  /** 最终选择及原因（短语） */
  chosen: string;
}

export interface DPFrame {
  kind: 'dp';
  rowHeaders: string[];
  colHeaders: string[];
  /** 行优先展开，null = 未填 */
  cells: (number | null)[];
  /** 当前正在填写的格子下标（行优先） */
  current: number | null;
  /** 依赖格子的下标列表 */
  dependencies: number[];
  message: string;
  /** 附加信息（如背包物品清单） */
  extras: { label: string; items: string[] };
  /** 可选：本格转移公式与候选对比（v1.1 教学增强；向后兼容字段） */
  transition?: DPTransition;
}

// ---------------------------------------------------------------------------
// 联合类型与守卫
// ---------------------------------------------------------------------------

export type Frame =
  | ArrayFrame
  | StructureFrame
  | TreeFrame
  | GraphFrame
  | RecursionFrame
  | NQueensFrame
  | DPFrame;

export function isArrayFrame(f: Frame): f is ArrayFrame {
  return f.kind === 'array';
}
export function isStructureFrame(f: Frame): f is StructureFrame {
  return f.kind === 'structure';
}
export function isTreeFrame(f: Frame): f is TreeFrame {
  return f.kind === 'tree';
}
export function isGraphFrame(f: Frame): f is GraphFrame {
  return f.kind === 'graph';
}
export function isRecursionFrame(f: Frame): f is RecursionFrame {
  return f.kind === 'recursion';
}
export function isNQueensFrame(f: Frame): f is NQueensFrame {
  return f.kind === 'nqueens';
}
export function isDPFrame(f: Frame): f is DPFrame {
  return f.kind === 'dp';
}
