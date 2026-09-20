/**
 * 算法注册表：输入模型、元数据与条目类型。
 * 页面完全由注册表驱动（见 docs/ARCHITECTURE.md §4）。
 */
import type { VizStep } from './step/step';

// ---------------------------------------------------------------------------
// 输入模型（判别联合，type 字段区分类别）
// ---------------------------------------------------------------------------

export interface SortInput {
  type: 'sort';
  array: number[];
}

export interface SearchInput {
  type: 'search';
  variant: 'linear' | 'binary';
  array: number[];
  target: number;
}

export type LinearOperation =
  | { op: 'push'; value: string }
  | { op: 'pop' }
  | { op: 'peek' }
  | { op: 'enqueue'; value: string }
  | { op: 'dequeue' }
  | { op: 'front' };

export interface LinearInput {
  type: 'linear';
  structure: 'stack' | 'queue';
  initial: string[];
  operation: LinearOperation;
}

export type LinkedListOperation =
  | { op: 'create' }
  | { op: 'traverse' }
  | { op: 'insert'; position: number; value: string }
  | { op: 'delete'; position: number }
  | { op: 'search'; value: string };

export interface LinkedListInput {
  type: 'linkedlist';
  initial: string[];
  operation: LinkedListOperation;
}

export type TraverseOrder = 'pre' | 'in' | 'post' | 'level';

export type BSTOperation =
  | { op: 'build'; values: number[] }
  | { op: 'insert'; value: number }
  | { op: 'search'; value: number }
  | { op: 'delete'; value: number }
  | { op: 'traverse'; order: TraverseOrder };

export interface BSTInput {
  type: 'bst';
  /** 当前树的插入序值序列（build 从空树开始） */
  startTree: number[];
  operation: BSTOperation;
}

// ---------------------------------------------------------------------------
// 图
// ---------------------------------------------------------------------------

export interface GraphNode {
  id: string;
  /** [0,1] 相对坐标 */
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  directed: boolean;
  /** 1–99 */
  weight: number;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphAlgorithm = 'bfs' | 'dfs' | 'dijkstra';

export interface GraphInput {
  type: 'graph';
  algorithm: GraphAlgorithm;
  graph: GraphModel;
  start: string | null;
  /** 仅 dijkstra 使用；null 表示计算到全部节点 */
  end: string | null;
}

// ---------------------------------------------------------------------------
// 递归 / 回溯 / DP
// ---------------------------------------------------------------------------

export type RecursionKind = 'factorial' | 'fibonacci' | 'hanoi';

export interface RecursionInput {
  type: 'recursion';
  kind: RecursionKind;
  n: number;
}

export interface NQueensInput {
  type: 'nqueens';
  n: number;
}

export interface KnapsackItem {
  name: string;
  weight: number;
  value: number;
}

export type DPInput =
  | { type: 'dp'; kind: 'fibonacci'; n: number }
  | { type: 'dp'; kind: 'knapsack'; items: KnapsackItem[]; capacity: number };

export type AlgorithmInput =
  | SortInput
  | SearchInput
  | LinearInput
  | LinkedListInput
  | BSTInput
  | GraphInput
  | RecursionInput
  | NQueensInput
  | DPInput;

// ---------------------------------------------------------------------------
// 元数据与条目
// ---------------------------------------------------------------------------

export interface AlgorithmMeta {
  id: string;
  name: string;
  enName: string;
  category: string;
  /** 用途 */
  purpose: string;
  /** 核心思想 */
  coreIdea: string;
  timeComplexity: string;
  spaceComplexity: string;
  /** 稳定性（排序类必填） */
  stability?: string;
  /** 伪代码（行数组，步骤的 pseudocodeLines 为其下标） */
  pseudocode: string[];
}

export interface AlgorithmEntry {
  meta: AlgorithmMeta;
  defaultInput: AlgorithmInput;
  /** 校验输入：返回中文错误消息，null 表示通过 */
  validate: (input: AlgorithmInput) => string | null;
  run: (input: AlgorithmInput) => Generator<VizStep, void, void>;
  /** 可参与排序比较模式 */
  compareGroup?: 'sorting';
}

export interface CategoryDef {
  id: string;
  name: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'sorting', name: '排序' },
  { id: 'searching', name: '搜索' },
  { id: 'linear', name: '线性结构' },
  { id: 'tree', name: '树' },
  { id: 'graph', name: '图' },
  { id: 'recursion', name: '递归' },
  { id: 'backtracking', name: '回溯' },
  { id: 'dp', name: '动态规划' },
];

/** 全部算法条目（由各分类模块聚合，见 registry 创建于 registerAll） */
let entries: AlgorithmEntry[] = [];

/** 由应用入口调用一次，完成注册表组装 */
export function registerAll(list: AlgorithmEntry[]): void {
  entries = list;
}

export function allAlgorithms(): readonly AlgorithmEntry[] {
  return entries;
}

export function getAlgorithm(id: string): AlgorithmEntry | undefined {
  return entries.find((e) => e.meta.id === id);
}

export function algorithmsByCategory(categoryId: string): AlgorithmEntry[] {
  return entries.filter((e) => e.meta.category === categoryId);
}
