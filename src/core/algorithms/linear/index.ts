/**
 * 线性结构注册条目：栈、队列、单链表。
 */
import type { AlgorithmEntry, AlgorithmInput, LinkedListInput, LinearInput } from '../../registry';
import { linkedListGen } from './linkedList';
import { queueGen, stackGen } from './stackQueue';
import { LINEAR_CAPACITY } from './stackQueue';

const DEFAULT_LINEAR = ['A', 'B', 'C', 'D'];

export function validateLinearInput(input: AlgorithmInput): string | null {
  if (input.type !== 'linear') return '输入类型错误';
  if (input.initial.length > LINEAR_CAPACITY) return `元素个数不能超过 ${LINEAR_CAPACITY}`;
  for (const v of input.initial) {
    if (v.trim() === '') return '元素值不能为空';
    if (v.length > 6) return '每个元素的值不能超过 6 个字符';
  }
  if ((input.operation.op === 'push' || input.operation.op === 'enqueue') && input.operation.value.trim() === '') {
    return '请输入要插入的值';
  }
  if ((input.operation.op === 'push' || input.operation.op === 'enqueue') && input.operation.value.length > 6) {
    return '插入的值不能超过 6 个字符';
  }
  return null;
}

export function validateLinkedListInput(input: AlgorithmInput): string | null {
  if (input.type !== 'linkedlist') return '输入类型错误';
  if (input.initial.length > LINEAR_CAPACITY) return `元素个数不能超过 ${LINEAR_CAPACITY}`;
  for (const v of input.initial) {
    if (v.trim() === '') return '元素值不能为空';
    if (v.length > 6) return '每个元素的值不能超过 6 个字符';
  }
  const op = input.operation;
  if (op.op === 'insert') {
    if (!Number.isInteger(op.position)) return '插入位置必须是整数';
    if (op.position < 0 || op.position > input.initial.length) {
      return `插入位置必须在 0–${input.initial.length} 之间`;
    }
    if (op.value.trim() === '') return '请输入要插入的值';
    if (op.value.length > 6) return '插入的值不能超过 6 个字符';
  }
  if (op.op === 'delete') {
    if (input.initial.length === 0) return '链表为空，无法删除';
    if (!Number.isInteger(op.position)) return '删除位置必须是整数';
    if (op.position < 0 || op.position >= input.initial.length) {
      return `删除位置必须在 0–${input.initial.length - 1} 之间`;
    }
  }
  if (op.op === 'search') {
    if (op.value.trim() === '') return '请输入要查找的值';
    if (op.value.length > 6) return '查找的值不能超过 6 个字符';
  }
  return null;
}

function linearEntry(partial: {
  meta: AlgorithmEntry['meta'];
  structure: 'stack' | 'queue';
  run: (input: LinearInput) => Generator<import('../../step/step').VizStep, void, void>;
}): AlgorithmEntry {
  return {
    meta: partial.meta,
    defaultInput: {
      type: 'linear',
      structure: partial.structure,
      initial: [...DEFAULT_LINEAR],
      operation: partial.structure === 'stack' ? { op: 'push', value: 'E' } : { op: 'enqueue', value: 'E' },
    },
    validate: validateLinearInput,
    // validateLinearInput 已保证 input.type === 'linear'
    run: (input) => partial.run(input as LinearInput),
  };
}

const entries: AlgorithmEntry[] = [
  linearEntry({
    structure: 'stack',
    run: stackGen,
    meta: {
      id: 'stack',
      name: '栈',
      enName: 'Stack',
      category: 'linear',
      purpose: '后进先出（LIFO）的线性结构，用于函数调用栈、括号匹配、撤销操作等场景。',
      coreIdea: '所有插入（push）与删除（pop）都发生在栈顶；peek 只读栈顶不删除。最后一个入栈的元素最先出栈。',
      timeComplexity: 'push/pop/peek 均 O(1)',
      spaceComplexity: 'O(n)',
      pseudocode: [
        'procedure push(S, x)',
        '  if |S| ≥ capacity then error "栈满"',
        '  将 x 压入栈顶',
        '  top 指向新栈顶',
        'procedure pop(S)',
        '  if |S| = 0 then error "栈空"',
        '  移除并返回栈顶元素',
        'procedure peek(S)',
        '  if |S| = 0 then error "栈空"',
        '  返回栈顶元素（不移除）',
        'end procedure',
      ],
    },
  }),
  linearEntry({
    structure: 'queue',
    run: queueGen,
    meta: {
      id: 'queue',
      name: '队列',
      enName: 'Queue',
      category: 'linear',
      purpose: '先进先出（FIFO）的线性结构，用于任务排队、广度优先搜索、消息队列等场景。',
      coreIdea: '插入（enqueue）只在队尾进行，删除（dequeue）只在队首进行；front 只读队首不删除。最先进队的元素最先出队。',
      timeComplexity: 'enqueue/dequeue/front 均 O(1)',
      spaceComplexity: 'O(n)',
      pseudocode: [
        'procedure enqueue(Q, x)',
        '  if |Q| ≥ capacity then error "队满"',
        '  将 x 加入队尾',
        '  rear 指向新队尾',
        'procedure dequeue(Q)',
        '  if |Q| = 0 then error "队空"',
        '  移除并返回队首元素',
        'procedure front(Q)',
        '  if |Q| = 0 then error "队空"',
        '  返回队首元素（不移除）',
        'end procedure',
      ],
    },
  }),
  {
    meta: {
      id: 'linked-list',
      name: '单链表',
      enName: 'Singly Linked List',
      category: 'linear',
      purpose: '链式存储的线性结构，插入删除无需移动元素，用于实现栈、队列、哈希桶等。',
      coreIdea: '每个节点保存值与指向后继的 next 指针；插入/删除只需修改相邻节点的指针，但访问第 i 个元素必须从头开始遍历。',
      timeComplexity: '查找/遍历 O(n)，定位后插入/删除 O(1)',
      spaceComplexity: 'O(n)',
      pseudocode: [
        'procedure create(values)          // 尾插建表',
        '  依次为每个值建立节点并链接',
        'procedure traverse(head)',
        '  curr ← head',
        '  while curr ≠ null do',
        '    访问 curr；curr ← curr.next',
        'procedure insert(pos, x)',
        '  定位到 pos-1（prev）',
        '  新节点.next ← prev.next；prev.next ← 新节点',
        'procedure delete(pos)',
        '  定位到 pos-1（prev）',
        '  prev.next ← 被删节点的下一个',
        'procedure search(x)',
        '  从头逐个比较，命中返回位置',
      ],
    },
    defaultInput: {
      type: 'linkedlist',
      initial: [...DEFAULT_LINEAR],
      operation: { op: 'traverse' },
    },
    validate: validateLinkedListInput,
    // validateLinkedListInput 已保证 input.type === 'linkedlist'
    run: (input) => linkedListGen(input as LinkedListInput),
  },
];

export default entries;
