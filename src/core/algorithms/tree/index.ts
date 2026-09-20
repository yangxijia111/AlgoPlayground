/**
 * 树模块注册条目：BST 操作（插入/搜索/删除）与二叉树遍历。
 */
import type { AlgorithmEntry, AlgorithmInput, BSTInput } from '../../registry';
import { bstOpsGen } from './bstOps';
import { traversalGen } from './traversal';

export const BST_MAX_NODES = 31;
const DEFAULT_TREE = [50, 30, 70, 20, 40, 60, 80];

function checkValue(v: number, name: string): string | null {
  if (!Number.isInteger(v)) return `${name}必须是整数`;
  if (v < -99 || v > 999) return `${name}超出取值范围 -99–999`;
  return null;
}

export function validateBSTInput(input: AlgorithmInput): string | null {
  if (input.type !== 'bst') return '输入类型错误';
  if (input.startTree.length > BST_MAX_NODES) return `树的节点数不能超过 ${BST_MAX_NODES}`;
  for (const v of input.startTree) {
    const err = checkValue(v, '树中存在非法值');
    if (err) return err;
  }
  const op = input.operation;
  if (op.op === 'build') {
    if (op.values.length > BST_MAX_NODES) return `树的节点数不能超过 ${BST_MAX_NODES}`;
    for (const v of op.values) {
      const err = checkValue(v, '树中存在非法值');
      if (err) return err;
    }
    return null;
  }
  if (op.op === 'traverse') return null;
  const verr = checkValue(op.value, '值');
  if (verr) return verr;
  const exists = input.startTree.includes(op.value);
  if (op.op === 'insert' && exists) return `值 ${op.value} 已存在于树中`;
  if (op.op === 'delete' && !exists) return `树中不存在 ${op.value}，无法删除`;
  return null;
}

function bstEntry(partial: {
  meta: AlgorithmEntry['meta'];
  defaultOperation: BSTInput['operation'];
  run: (input: BSTInput) => Generator<import('../../step/step').VizStep, void, void>;
}): AlgorithmEntry {
  return {
    meta: partial.meta,
    defaultInput: { type: 'bst', startTree: [...DEFAULT_TREE], operation: partial.defaultOperation },
    validate: validateBSTInput,
    // validateBSTInput 已保证 input.type === 'bst'
    run: (input) => partial.run(input as BSTInput),
  };
}

const entries: AlgorithmEntry[] = [
  bstEntry({
    defaultOperation: { op: 'insert', value: 55 },
    run: bstOpsGen,
    meta: {
      id: 'bst-operations',
      name: '二叉搜索树',
      enName: 'Binary Search Tree',
      category: 'tree',
      purpose: '支持高效插入、查找、删除的有序二叉树结构。',
      coreIdea: '任意节点满足"左子树 < 根 < 右子树"：插入与查找都从根下行，每次比较排除一半可能；删除分叶子、单孩子、双孩子（用中序后继顶替）三种情形。',
      timeComplexity: '平均 O(log n)，最坏 O(n)',
      spaceComplexity: 'O(n)',
      pseudocode: [
        'procedure insert(T, v)',
        '  若树为空：新建节点作为根',
        '  curr ← 根',
        '  while curr ≠ null do',
        '    if v = curr.value then 重复值，拒绝',
        '    else if v < curr.value then 沿左子树下行',
        '    else 沿右子树下行',
        '  新节点挂到空位',
        'procedure search(T, v)   // 同插入的下行路径，命中返回',
        'procedure delete(T, v)',
        '  定位目标节点（下行）',
        '  叶子：直接摘除；单子：子树顶替',
        '  双子：用中序后继替换值，再删后继',
        'end procedure',
      ],
    },
  }),
  bstEntry({
    defaultOperation: { op: 'traverse', order: 'in' },
    // 遍历页的"重建"操作复用 BST 建树动画
    run: (input) => (input.operation.op === 'build' ? bstOpsGen(input) : traversalGen(input)),
    meta: {
      id: 'tree-traversal',
      name: '二叉树遍历',
      enName: 'Tree Traversal',
      category: 'tree',
      purpose: '按特定顺序访问二叉树的全部节点（前序/中序/后序/层序）。',
      coreIdea: '前/中/后序是深度优先递归，区别在于"访问根"的时机；层序是广度优先，借助队列逐层出队访问、孩子依次入队。BST 的中序遍历输出升序序列。',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(h)（递归栈/队列，h 为树高）',
      pseudocode: [
        'procedure dfsVisit(root)    // 前序/中序/后序',
        '  访问当前节点（时机取决于遍历序）',
        '  递归遍历左子树',
        '  递归遍历右子树',
        'procedure levelOrder(root)  // 层序',
        '  根节点入队',
        '  循环：出队并访问，其孩子依次入队',
        'end procedure',
      ],
    },
  }),
];

export default entries;
