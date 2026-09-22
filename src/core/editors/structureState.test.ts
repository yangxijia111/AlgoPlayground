/**
 * 状态一致性契约测试（STATE_CONSISTENCY_SPEC §2.4）。
 * 锁定：Editor reducer（Reference Model）⇄ Generator 终态 三方一致。
 * 覆盖：stack push/pop/peek、queue enqueue/dequeue/front、linkedlist insert/delete、
 * bst insert/delete（含双子删除反例）、拒绝路径、连续多步操作链。
 */
import { describe, expect, it } from 'vitest';
import { collectSteps } from '../step/step';
import type { VizStep } from '../step/step';
import { isStructureFrame, isTreeFrame } from '../step/frame';
import { getAlgorithm } from '../registry';
import { registerAll } from '../registry';
import { allEntries } from '../algorithms';
import {
  applyLinearOperation,
  applyLinkedListOperation,
  applyBSTOperation,
} from './structureState';
import { buildTree, preOrderValues } from '../algorithms/tree/model';

registerAll(allEntries);

const linearEntry = (structure: 'stack' | 'queue') => getAlgorithm(structure)!;
const linkedListEntry = getAlgorithm('linked-list')!;
const bstEntry = getAlgorithm('bst-operations')!;

/** Generator 终态帧中的结构值序列 */
function finalStructureValues(steps: VizStep[]): string[] {
  const last = steps[steps.length - 1];
  if (!last || !isStructureFrame(last.frame)) throw new Error('终态不是结构帧');
  return last.frame.nodes.map((n) => n.value);
}

/** Generator 终态帧中的树（转先序序列比较） */
function finalTreePreOrder(steps: VizStep[]): number[] {
  const last = steps[steps.length - 1];
  if (!last || !isTreeFrame(last.frame)) throw new Error('终态不是树帧');
  // TreeFrame 只有布局坐标，重建结构：用值+布局无法直接还原树——改用中序+层级不可靠。
  // 正确路径：对 bst 条目，Generator 终态的节点集合与父子关系记录在 frame.edges（from/to 为节点 id）。
  const nodes = new Map(last.frame.nodes.map((n) => [n.id, n]));
  const children = new Map<number, { left?: number; right?: number }>();
  for (const e of last.frame.edges) {
    const parent = children.get(e.from) ?? {};
    const fromVal = nodes.get(e.from)?.value ?? 0;
    const toVal = nodes.get(e.to)?.value ?? 0;
    if (toVal < fromVal) parent.left = e.to;
    else parent.right = e.to;
    children.set(e.from, parent);
  }
  // 找根（无入边的节点）后先序遍历
  const hasParent = new Set(last.frame.edges.map((e) => e.to));
  const root = last.frame.nodes.find((n) => !hasParent.has(n.id));
  const out: number[] = [];
  const walk = (id: number | undefined) => {
    if (id === undefined) return;
    const node = nodes.get(id);
    if (!node) return;
    out.push(node.value);
    const c = children.get(id);
    walk(c?.left);
    walk(c?.right);
  };
  walk(root?.id);
  return out;
}

// ---------------------------------------------------------------------------
// Stack / Queue
// ---------------------------------------------------------------------------

describe('状态一致性契约：栈', () => {
  it('[A1 反例锁定] [A,B,C] pop 后编辑器状态必须是 [A,B]（v1.1.0 UI 曾错为 [B,C]）', () => {
    const r = applyLinearOperation(['A', 'B', 'C'], 'stack', { op: 'pop' });
    expect(r.next).toEqual(['A', 'B']);
    expect(r.removed).toBe('C');
  });

  it.each([
    ['push 满员拒绝', new Array(12).fill('x'), { op: 'push', value: 'C' } as const, new Array(12).fill('x')],
    ['pop 空 refused', [], { op: 'pop' } as const, []],
    ['peek 不变', ['A'], { op: 'peek' } as const, ['A']],
  ])('%s', (_name, before, op, expected) => {
    const r = applyLinearOperation(before, 'stack', op);
    expect(r.next).toEqual(expected);
  });

  it.each([
    [['A', 'B', 'C'], { op: 'push', value: 'D' }],
    [['A', 'B', 'C'], { op: 'pop' }],
    [['A'], { op: 'pop' }],
    [[], { op: 'push', value: 'X' }],
    [['A', 'B'], { op: 'peek' }],
  ])('reducer === Generator 终态（stack %j %j）', (before, op) => {
    const r = applyLinearOperation(before as string[], 'stack', op as never);
    const steps = collectSteps(
      linearEntry('stack').run({
        type: 'linear',
        structure: 'stack',
        initial: before as string[],
        operation: op as never,
      }),
    );
    expect(r.next).toEqual(finalStructureValues(steps));
  });

  it('连续操作链：push→push→pop→push 后三方一致', () => {
    let state: string[] = [];
    const ops = [
      { op: 'push', value: 'A' },
      { op: 'push', value: 'B' },
      { op: 'pop' },
      { op: 'push', value: 'C' },
    ] as const;
    for (const op of ops) {
      const before = state;
      const r = applyLinearOperation(before, 'stack', op);
      const steps = collectSteps(
        linearEntry('stack').run({ type: 'linear', structure: 'stack', initial: before, operation: op as never }),
      );
      expect(r.next).toEqual(finalStructureValues(steps));
      state = r.next;
    }
    expect(state).toEqual(['A', 'C']);
  });
});

describe('状态一致性契约：队列', () => {
  it.each([
    [['A', 'B', 'C'], { op: 'dequeue' }, ['B', 'C']],
    [['A'], { op: 'dequeue' }, []],
    [[], { op: 'dequeue' }, []],
    [['A'], { op: 'enqueue', value: 'B' }, ['A', 'B']],
    [['A'], { op: 'front' }, ['A']],
  ])('reducer === Generator 终态（queue %j %j）', (before, op, _expected) => {
    const r = applyLinearOperation(before as string[], 'queue', op as never);
    const steps = collectSteps(
      linearEntry('queue').run({
        type: 'linear',
        structure: 'queue',
        initial: before as string[],
        operation: op as never,
      }),
    );
    expect(r.next).toEqual(finalStructureValues(steps));
  });

  it('连续操作链：enqueue→dequeue→dequeue（空拒绝）→enqueue', () => {
    let state: string[] = [];
    const ops = [
      { op: 'enqueue', value: 'P' },
      { op: 'enqueue', value: 'Q' },
      { op: 'dequeue' },
      { op: 'dequeue' },
      { op: 'enqueue', value: 'R' },
    ] as const;
    for (const op of ops) {
      const before = state;
      const r = applyLinearOperation(before, 'queue', op);
      const steps = collectSteps(
        linearEntry('queue').run({ type: 'linear', structure: 'queue', initial: before, operation: op as never }),
      );
      expect(r.next).toEqual(finalStructureValues(steps));
      state = r.next;
    }
    expect(state).toEqual(['R']);
  });
});

// ---------------------------------------------------------------------------
// LinkedList
// ---------------------------------------------------------------------------

describe('状态一致性契约：链表', () => {
  it.each([
    ['insert 头', ['A', 'B'], { op: 'insert', position: 0, value: 'X' }],
    ['insert 中', ['A', 'B'], { op: 'insert', position: 1, value: 'X' }],
    ['insert 尾', ['A', 'B'], { op: 'insert', position: 2, value: 'X' }],
    ['delete 头', ['A', 'B'], { op: 'delete', position: 0 }],
    ['delete 尾', ['A', 'B'], { op: 'delete', position: 1 }],
    ['delete 越界拒绝', ['A'], { op: 'delete', position: 5 }],
    ['search 不变', ['A', 'B'], { op: 'search', value: 'A' }],
  ])('%s：reducer === Generator 终态', (_name, before, op) => {
    const r = applyLinkedListOperation(before as string[], op as never);
    const steps = collectSteps(
      linkedListEntry.run({ type: 'linkedlist', initial: before as string[], operation: op as never }),
    );
    expect(r.next).toEqual(finalStructureValues(steps));
  });

  it('连续操作链：insert→delete→insert 后三方一致', () => {
    let state: string[] = ['A', 'B'];
    const ops = [
      { op: 'insert', position: 1, value: 'X' },
      { op: 'delete', position: 0 },
      { op: 'insert', position: 0, value: 'Y' },
    ] as const;
    for (const op of ops) {
      const before = state;
      const r = applyLinkedListOperation(before, op);
      const steps = collectSteps(
        linkedListEntry.run({ type: 'linkedlist', initial: before, operation: op as never }),
      );
      expect(r.next).toEqual(finalStructureValues(steps));
      state = r.next;
    }
    expect(state).toEqual(['Y', 'X', 'B']);
  });
});

// ---------------------------------------------------------------------------
// BST
// ---------------------------------------------------------------------------

describe('状态一致性契约：BST', () => {
  it('[A2 反例锁定] 双子删除：先序表示重建树 === Generator 终态树（且不同于旧 filter 行为）', () => {
    const seq = [8, 3, 10, 1, 6, 4, 7, 14];
    const r = applyBSTOperation(seq, { op: 'delete', value: 3 });
    // 旧错误行为：filter 得 [8,10,1,6,4,7,14]，其重建树与真实删除产物不同构
    expect(r.next).not.toEqual(seq.filter((x) => x !== 3));
    const generatorSteps = collectSteps(
      bstEntry.run({ type: 'bst', startTree: seq, operation: { op: 'delete', value: 3 } }),
    );
    const generatorPre = finalTreePreOrder(generatorSteps);
    expect(r.next).toEqual(generatorPre);
    // 重建同构验证：先序序列重建 === Generator 终态（比较先序即比较树）
    expect(preOrderValues(buildTree(r.next).root)).toEqual(generatorPre);
  });

  it.each([
    ['叶子删除', [8, 3, 10, 1], 1],
    ['单子删除', [8, 3, 10, 6], 3],
    ['双子删除(根)', [8, 3, 10, 1, 6, 14], 8],
    ['不存在拒绝', [8, 3], 99],
  ])('%s：reducer 先序 === Generator 终态先序', (_name, seq, value) => {
    const r = applyBSTOperation(seq, { op: 'delete', value: value });
    const steps = collectSteps(bstEntry.run({ type: 'bst', startTree: seq, operation: { op: 'delete', value } }));
    if (r.rejected) {
      // 值不存在：Generator 也拒绝，终态 === 原树
      expect(finalTreePreOrder(steps)).toEqual(preOrderValues(buildTree(seq).root));
    } else {
      expect(r.next).toEqual(finalTreePreOrder(steps));
    }
  });

  it.each([
    { seq: [8], v: 55 },
    { seq: [8, 3, 10, 1, 6, 14, 4, 7, 13, 99], v: 55 },
    { seq: [50, 30, 70], v: 40 },
  ])('insert：append 序列重建树 === Generator 终态树（$seq 插 $v）', ({ seq, v }) => {
    const r = applyBSTOperation(seq, { op: 'insert', value: v });
    const steps = collectSteps(bstEntry.run({ type: 'bst', startTree: seq, operation: { op: 'insert', value: v } }));
    expect(preOrderValues(buildTree(r.next).root)).toEqual(finalTreePreOrder(steps));
  });

  it('连续操作链：insert→delete(双子)→insert 后表示仍与 Generator 一致', () => {
    let seq = [8, 3, 10, 1, 6, 4, 7, 14];
    const runOp = (op: { op: 'insert'; value: number } | { op: 'delete'; value: number }) => {
      const before = seq;
      const r = applyBSTOperation(before, op);
      const steps = collectSteps(bstEntry.run({ type: 'bst', startTree: before, operation: op }));
      expect(preOrderValues(buildTree(r.next).root)).toEqual(finalTreePreOrder(steps));
      seq = r.next;
    };
    runOp({ op: 'insert', value: 5 });
    runOp({ op: 'delete', value: 3 }); // 双子（1 与 6 子树）
    runOp({ op: 'insert', value: 2 });
    runOp({ op: 'delete', value: 8 }); // 根双子
  });
});
