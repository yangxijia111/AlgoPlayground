/**
 * 二叉树遍历的可视化生成器：前序 / 中序 / 后序（递归）与层序（队列）。
 * 访问过的节点标记 success，当前节点标记 active；层序中在队列中的节点标记 special。
 */
import type { BSTInput, TraverseOrder } from '../../registry';
import { layoutTree } from './layout';
import type { ElementState, TreeEdgeView, TreeNodeView } from '../../step/frame';
import type { VizStep } from '../../step/step';
import type { BstNode } from './model';
import { buildTree } from './model';

/** 遍历伪代码（tree-traversal 条目）：
 * 0 procedure dfsVisit(root)          // 前序/中序/后序
 * 1   访问当前节点（时机取决于遍历序）
 * 2   递归遍历左子树
 * 3   递归遍历右子树
 * 4 procedure levelOrder(root)        // 层序
 * 5   根节点入队
 * 6   循环：出队并访问，其孩子依次入队
 * 7 end procedure
 */

const ORDER_LABELS: Record<TraverseOrder, string> = {
  pre: '前序遍历（根-左-右）',
  in: '中序遍历（左-根-右）',
  post: '后序遍历（左-右-根）',
  level: '层序遍历（逐层，借助队列）',
};

const VISIT_LABELS: Record<'pre' | 'in' | 'post', string> = {
  pre: '前序访问',
  in: '中序访问',
  post: '后序访问',
};

interface TraversalCtx {
  counters: { visits: number; comparisons: number };
  output: string[];
  visited: Set<number>;
}

interface Emit {
  (root: BstNode | null, current: number | null, queued: Set<number>, message: string, lines: number[]): VizStep;
}

function makeEmit(ctx: TraversalCtx): Emit {
  return (root, current, queued, message, lines) => {
    const layout = layoutTree(root);
    const nodes: TreeNodeView[] = layout.nodes.map((n) => {
      let state: ElementState = 'normal';
      if (ctx.visited.has(n.id)) state = 'success';
      if (queued.has(n.id)) state = 'special';
      if (n.id === current) state = 'active';
      return { ...n, state };
    });
    const edges: TreeEdgeView[] = layout.edges.map((e) => ({
      ...e,
      state: ctx.visited.has(e.to) ? 'success' : 'normal',
    }));
    return {
      frame: {
        kind: 'tree',
        nodes,
        edges,
        highlight: current === null ? [] : [current],
        output: [...ctx.output],
        message,
      },
      description: message,
      pseudocodeLines: lines,
      counters: { ...ctx.counters },
    };
  };
}

export function* traversalGen(input: BSTInput): Generator<VizStep, void, void> {
  const op = input.operation;
  if (op.op !== 'traverse') return;
  const { root } = buildTree(input.startTree);
  const ctx: TraversalCtx = { counters: { visits: 0, comparisons: 0 }, output: [], visited: new Set() };
  const emit = makeEmit(ctx);
  const n = countAll(root);

  yield emit(root, null, new Set(), `初始状态：${ORDER_LABELS[op.order]}，共 ${n} 个节点`, op.order === 'level' ? [4, 5] : [0]);

  if (root === null) {
    yield emit(null, null, new Set(), '树为空，遍历结束', [7]);
    return;
  }

  // 递归 DFS（前/中/后序共用，访问时机不同）
  function* dfs(node: BstNode, order: 'pre' | 'in' | 'post'): Generator<VizStep, void, void> {
    function* visit(): Generator<VizStep, void, void> {
      ctx.counters.visits++;
      ctx.output.push(String(node.value));
      ctx.visited.add(node.id);
      yield emit(root, node.id, new Set(), `${VISIT_LABELS[order]}节点 ${node.value}（当前输出：${ctx.output.join(', ')}）`, [1]);
    }
    if (order === 'pre') yield* visit();
    if (node.left) yield* dfs(node.left, order);
    if (order === 'in') yield* visit();
    if (node.right) yield* dfs(node.right, order);
    if (order === 'post') yield* visit();
  }

  switch (op.order) {
    case 'pre':
      yield* dfs(root, 'pre');
      break;
    case 'in':
      yield* dfs(root, 'in');
      break;
    case 'post':
      yield* dfs(root, 'post');
      break;
    case 'level': {
      const queue: BstNode[] = [root];
      yield emit(root, null, new Set([root.id]), `根节点 ${root.value} 入队，队列：[${root.value}]`, [5]);
      while (queue.length > 0) {
        const node = queue.shift()!;
        ctx.counters.visits++;
        ctx.output.push(String(node.value));
        ctx.visited.add(node.id);
        yield emit(root, node.id, new Set(queue.map((q) => q.id)), `节点 ${node.value} 出队并访问（输出：${ctx.output.join(', ')}）`, [6]);
        if (node.left) {
          queue.push(node.left);
          yield emit(root, node.id, new Set(queue.map((q) => q.id)), `左孩子 ${node.left.value} 入队，队列：[${queue.map((q) => q.value).join(', ')}]`, [6]);
        }
        if (node.right) {
          queue.push(node.right);
          yield emit(root, node.id, new Set(queue.map((q) => q.id)), `右孩子 ${node.right.value} 入队，队列：[${queue.map((q) => q.value).join(', ')}]`, [6]);
        }
      }
      break;
    }
  }

  yield emit(root, null, new Set(), `遍历完成：${ORDER_LABELS[op.order]} 输出为 [ ${ctx.output.join(', ')} ]，共访问 ${ctx.counters.visits} 个节点`, op.order === 'level' ? [6] : [1]);
}

function countAll(root: BstNode | null): number {
  if (!root) return 0;
  return 1 + countAll(root.left) + countAll(root.right);
}
