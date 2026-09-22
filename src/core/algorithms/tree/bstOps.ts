/**
 * BST 操作的可视化生成器：建树 / 插入 / 搜索 / 删除。
 * 帧中的坐标由 layoutTree 现算，快照自包含。
 */
import type { BSTInput } from '../../registry';
import { layoutTree } from './layout';
import type { ElementState, TreeEdgeView, TreeNodeView } from '../../step/frame';
import type { VizStep } from '../../step/step';
import type { StepSemantic } from '../../step/semantic';
import type { BstNode } from './model';
import { buildTree, findPath, insertNode, pathToMin, removeNode } from './model';

/** BST 操作伪代码（bst-operations 条目）：
 * 0  procedure insert(T, v)
 * 1    若树为空：新建节点作为根
 * 2    curr ← 根
 * 3    while curr ≠ null do
 * 4      if v = curr.value then 重复值，拒绝
 * 5      else if v < curr.value then 沿左子树下行
 * 6      else 沿右子树下行
 * 7    新节点挂到空位
 * 8  procedure search(T, v)      // 同插入的下行路径，命中返回
 * 9  procedure delete(T, v)
 * 10   定位目标节点（下行）
 * 11   叶子：直接摘除；单子：子树顶替
 * 12   双子：用中序后继替换值，再删后继
 * 13 end procedure
 */

interface Ctx {
  counters: { comparisons: number; visits: number };
  output: string[];
}

function makeTreeEmit(counters: Ctx['counters'], output: string[]) {
  return (
    root: BstNode | null,
    states: Record<number, ElementState>,
    activeEdges: Set<string>,
    message: string,
    lines: number[],
    semantic?: StepSemantic,
  ): VizStep => {
    const layout = layoutTree(root);
    const nodes: TreeNodeView[] = layout.nodes.map((n) => ({
      ...n,
      state: states[n.id] ?? 'normal',
    }));
    const edges: TreeEdgeView[] = layout.edges.map((e) => ({
      ...e,
      state: activeEdges.has(`${e.from}-${e.to}`) ? 'active' : 'normal',
    }));
    return {
      frame: { kind: 'tree', nodes, edges, highlight: [], output: [...output], message },
      description: message,
      pseudocodeLines: lines,
      counters: { ...counters },
      ...(semantic ? { semantic } : {}),
    };
  };
}

/** 沿路径生成"下行比较"步骤；返回是否命中目标（命中时最后一个节点即目标） */
function* walkPath(
  root: BstNode | null,
  value: number,
  emit: ReturnType<typeof makeTreeEmit>,
  ctx: Ctx,
  lines: (hit: boolean, less: boolean) => number[],
): Generator<VizStep, boolean, void> {
  const path = findPath(root, value);
  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    ctx.counters.comparisons++;
    const hit = node.value === value;
    const less = value < node.value;
    const states: Record<number, ElementState> = {};
    for (let k = 0; k < i; k++) states[path[k].id] = 'muted';
    states[node.id] = 'active';
    const activeEdges = new Set<string>();
    for (let k = 1; k <= i; k++) activeEdges.add(`${path[k - 1].id}-${path[k].id}`);
    const dir = hit ? '命中' : less ? `目标更小，进入左子树` : `目标更大，进入右子树`;
    yield emit(
      root,
      states,
      activeEdges,
      hit
        ? `比较 ${value} 与节点 ${node.value}：相等，找到目标！`
        : `比较 ${value} 与节点 ${node.value}：${value} ${less ? '<' : '>'} ${node.value}，${dir}`,
      lines(hit, less),
      {
        type: 'tree-descend',
        nodeId: node.id,
        nodeValue: node.value,
        query: value,
        direction: hit ? 'hit' : i === 0 ? 'root' : less ? 'left' : 'right',
      },
    );
    if (hit) return true;
  }
  return false;
}

export function* bstOpsGen(input: BSTInput): Generator<VizStep, void, void> {
  const op = input.operation;
  if (op.op === 'traverse') return; // 遍历由 traversalGen 负责
  const ctx: Ctx = { counters: { comparisons: 0, visits: 0 }, output: [] };
  const emit = makeTreeEmit(ctx.counters, ctx.output);

  if (op.op === 'build') {
    let cur: BstNode | null = null;
    let nextId = 1;
    const seen = new Set<number>();
    yield emit(null, {}, new Set(), '初始状态：空树，准备逐个插入建树', [0, 1]);
    for (const v of op.values) {
      if (seen.has(v)) {
        yield emit(cur, {}, new Set(), `值 ${v} 已存在，跳过重复值`, [4]);
        continue;
      }
      seen.add(v);
      cur = insertNode(cur, v, nextId++);
      const placed = findPath(cur, v).at(-1)!;
      yield emit(cur, { [placed.id]: 'special' }, new Set(), `插入 ${v}：按 BST 规则挂到空位`, [7], {
        type: 'tree-insert-place',
        nodeId: placed.id,
        value: v,
      });
    }
    yield emit(cur, {}, new Set(), `建树完成：共 ${seen.size} 个节点，中序序列为升序`, [0]);
    return;
  }

  const { root } = buildTree(input.startTree);

  if (op.op === 'insert') {
    yield emit(root, {}, new Set(), `准备插入 ${op.value}（当前树共 ${countAll(root)} 个节点）`, [0, 2]);
    if (root === null) {
      const newRoot = insertNode(null, op.value, 1000);
      yield emit(newRoot, { 1000: 'special' }, new Set(), `树为空：新建节点 ${op.value} 作为根`, [1, 7]);
      yield emit(newRoot, {}, new Set(), `插入完成`, [7]);
      return;
    }
    const hit = yield* walkPath(root, op.value, emit, ctx, (hit2, less) =>
      hit2 ? [4] : less ? [3, 5] : [3, 6],
    );
    if (hit) {
      yield emit(root, {}, new Set(), `值 ${op.value} 已存在于树中，插入被拒绝`, [4]);
      return;
    }
    // 挂到空位：重新插入一次（值不存在）
    const newRoot = insertNode(root, op.value, 1000);
    ctx.counters.visits++;
    yield emit(newRoot, { 1000: 'special' }, new Set(), `到达空位：新建节点 ${op.value} 挂到此处`, [7], {
      type: 'tree-insert-place',
      nodeId: 1000,
      value: op.value,
    });
    yield emit(newRoot, {}, new Set(), `插入完成：树共 ${countAll(newRoot)} 个节点`, [7]);
    return;
  }

  if (op.op === 'search') {
    yield emit(root, {}, new Set(), `准备查找 ${op.value}`, [8, 2]);
    const hit = yield* walkPath(root, op.value, emit, ctx, (hit2, less) =>
      hit2 ? [8] : less ? [5] : [6],
    );
    if (hit) {
      yield emit(root, {}, new Set(), `查找成功：${op.value} 存在于树中（共比较 ${ctx.counters.comparisons} 次）`, [8]);
    } else {
      yield emit(root, {}, new Set(), `查找失败：${op.value} 不在树中（共比较 ${ctx.counters.comparisons} 次）`, [8]);
    }
    return;
  }

  // delete
  yield emit(root, {}, new Set(), `准备删除 ${op.value}`, [9, 2]);
  const hit = yield* walkPath(root, op.value, emit, ctx, (hit2, less) =>
    hit2 ? [10] : less ? [5] : [6],
  );
  if (!hit) {
    yield emit(root, {}, new Set(), `树中不存在 ${op.value}，删除被拒绝`, [10]);
    return;
  }
  const target = findPath(root, op.value).at(-1)!;
  if (target.left === null && target.right === null) {
    yield emit(root, { [target.id]: 'danger' }, new Set(), `节点 ${op.value} 是叶子，直接摘除`, [11], {
      type: 'tree-delete',
      value: op.value,
      caseType: 'leaf',
    });
    yield emit(removeNode(root, op.value), {}, new Set(), `删除完成：树共 ${countAll(removeNode(root, op.value))} 个节点`, [11]);
    return;
  }
  if (target.left === null || target.right === null) {
    yield emit(root, { [target.id]: 'danger' }, new Set(), `节点 ${op.value} 只有一个孩子：用子树顶替它的位置`, [11], {
      type: 'tree-delete',
      value: op.value,
      caseType: 'one-child',
    });
    yield emit(removeNode(root, op.value), {}, new Set(), `删除完成：树共 ${countAll(removeNode(root, op.value))} 个节点`, [11]);
    return;
  }
  // 双子：中序后继
  yield emit(root, { [target.id]: 'danger' }, new Set(), `节点 ${op.value} 有两个孩子：寻找中序后继（右子树最小值）`, [12], {
    type: 'tree-delete',
    value: op.value,
    caseType: 'two-children',
  });
  const sPath = pathToMin(target.right!);
  for (let i = 0; i < sPath.length; i++) {
    const node = sPath[i];
    const states: Record<number, ElementState> = { [target.id]: 'danger' };
    for (let k = 0; k < i; k++) states[sPath[k].id] = 'muted';
    states[node.id] = 'active';
    // 后继下探是 delete 的内部过程（非目标值下降），作为 transition 不带语义
    yield emit(root, states, new Set(), `在右子树中下探：当前最小候选 ${node.value}`, [12]);
  }
  const successor = sPath.at(-1)!;
  // 用后继值替换目标值（可视化：目标节点值变为后继值，special 标记）
  const substituted: BstNode = { ...target, value: successor.value };
  const rootAfterSub = replaceNode(root, target.id, substituted);
  yield emit(
    rootAfterSub,
    { [target.id]: 'special' },
    new Set(),
    `用后继值 ${successor.value} 替换节点值，随后删除右子树中的后继节点`,
    [12],
    {
      type: 'tree-delete',
      value: op.value,
      caseType: 'two-children',
      successorValue: successor.value,
    },
  );
  yield emit(removeNode(rootAfterSub, successor.value), {}, new Set(), `删除完成：树共 ${countAll(removeNode(rootAfterSub, successor.value))} 个节点`, [12]);
}

/** 用相同 id 的替换节点交换树中的节点（保持结构），返回新根 */
function replaceNode(root: BstNode | null, id: number, replacement: BstNode): BstNode | null {
  if (root === null) return null;
  if (root.id === id) return replacement;
  return {
    ...root,
    left: replaceNode(root.left, id, replacement),
    right: replaceNode(root.right, id, replacement),
  };
}

function countAll(root: BstNode | null): number {
  if (!root) return 0;
  return 1 + countAll(root.left) + countAll(root.right);
}
