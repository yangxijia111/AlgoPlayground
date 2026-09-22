/**
 * 编辑器领域状态 pure reducer（STATE_CONSISTENCY_SPEC §2）。
 * 职责：以「操作前状态 + 操作」计算「操作后状态」，与 Generator 终态严格一致。
 * React 编辑器只负责调用；禁止组件内自写 slice/filter 近似结构语义。
 * 契约测试锁定：reducer.next === Generator 最后一帧解析出的结构状态。
 */
import type { BSTOperation, LinearOperation, LinkedListOperation } from '../registry';
import { LINEAR_CAPACITY } from '../algorithms/linear/stackQueue';
import { buildTree, findNode, removeNode, preOrderValues } from '../algorithms/tree/model';

// ---------------------------------------------------------------------------
// 栈 / 队列
// ---------------------------------------------------------------------------

export interface LinearOpResult {
  /** 操作后的元素序列（栈：底→顶；队列：头→尾） */
  next: string[];
  /** 操作被拒绝（空结构出队/栈空 pop、容量已满）时 next === before */
  rejected: boolean;
  /** 被移除的元素（仅 pop/dequeue 成功时非 null） */
  removed: string | null;
}

/** 与 stackGen/queueGen 终态严格一致的参考模型（structure 决定方向语义，与 op 名共同约束） */
export function applyLinearOperation(
  initial: string[],
  _structure: 'stack' | 'queue',
  op: LinearOperation,
): LinearOpResult {
  switch (op.op) {
    case 'push':
    case 'enqueue': {
      if (initial.length >= LINEAR_CAPACITY) return { next: initial, rejected: true, removed: null };
      return { next: [...initial, op.value], rejected: false, removed: null };
    }
    case 'pop': {
      if (initial.length === 0) return { next: initial, rejected: true, removed: null };
      return { next: initial.slice(0, -1), rejected: false, removed: initial[initial.length - 1] ?? null };
    }
    case 'dequeue': {
      if (initial.length === 0) return { next: initial, rejected: true, removed: null };
      return { next: initial.slice(1), rejected: false, removed: initial[0] ?? null };
    }
    // peek/front 不改变结构
    case 'peek':
    case 'front':
      return { next: initial, rejected: false, removed: null };
  }
}

// ---------------------------------------------------------------------------
// 链表
// ---------------------------------------------------------------------------

export interface LinkedListOpResult {
  next: string[];
  rejected: boolean;
}

/** 与 linkedListGen 终态严格一致的参考模型 */
export function applyLinkedListOperation(initial: string[], op: LinkedListOperation): LinkedListOpResult {
  switch (op.op) {
    case 'create':
      return { next: initial, rejected: false };
    case 'traverse':
      return { next: initial, rejected: false };
    case 'insert': {
      if (op.position < 0 || op.position > initial.length) return { next: initial, rejected: true };
      if (initial.length >= LINEAR_CAPACITY) return { next: initial, rejected: true };
      return { next: [...initial.slice(0, op.position), op.value, ...initial.slice(op.position)], rejected: false };
    }
    case 'delete': {
      if (op.position < 0 || op.position >= initial.length) return { next: initial, rejected: true };
      return { next: initial.filter((_, i) => i !== op.position), rejected: false };
    }
    case 'search':
      return { next: initial, rejected: false };
  }
}

// ---------------------------------------------------------------------------
// BST（关键：删除用「删除产物树的先序序列」表示，重建后与 Generator 终态同构）
// ---------------------------------------------------------------------------

export interface BSTOpResult {
  /** 操作后的插入序列表示 */
  next: number[];
  rejected: boolean;
}

/**
 * 与 bstOpsGen 终态严格一致的参考模型。
 * - insert：append 后按序重建 === 原树插入新节点（结构性一致）；
 * - delete：真实删除（含双子中序后继替换）后取先序序列 ——
 *   先序序列是唯一能重建同构 BST 的插入序列；
 * - search/traverse：结构不变；build：返回去重后的实际插入序列。
 */
export function applyBSTOperation(startTree: number[], op: BSTOperation): BSTOpResult {
  switch (op.op) {
    case 'build': {
      const { root } = buildTree(op.values);
      return { next: preOrderValues(root), rejected: false };
    }
    case 'insert': {
      const { root } = buildTree(startTree);
      if (findNode(root, op.value) !== null) return { next: startTree, rejected: true };
      // append 重建 === 原树插入 v（同构）；保留自然序列避免 UI chips 无谓重排
      return { next: [...startTree, op.value], rejected: false };
    }
    case 'search':
    case 'traverse':
      return { next: startTree, rejected: false };
    case 'delete': {
      const { root } = buildTree(startTree);
      if (findNode(root, op.value) === null) return { next: startTree, rejected: true };
      return { next: preOrderValues(removeNode(root, op.value)), rejected: false };
    }
  }
}

/** 供 UI 直接复用：删除序列中的值（先序规范化），返回 null 表示值不存在 */
export function deleteFromSequence(startTree: number[], value: number): number[] | null {
  const r = applyBSTOperation(startTree, { op: 'delete', value });
  return r.rejected ? null : r.next;
}
