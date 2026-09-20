/**
 * 栈与队列的可视化生成器：基于 StructureFrame（layout: stack | queue）。
 * 每次运行执行一个操作（push/pop/peek 或 enqueue/dequeue/front）。
 */
import type { LinearInput } from '../../registry';
import { structureFrame } from '../../step/frame';
import type { ElementState, StructureNode } from '../../step/frame';
import type { VizStep } from '../../step/step';

/** 线性结构容量上限（REQUIREMENTS FR-3.3） */
export const LINEAR_CAPACITY = 12;

type Emit = (nodes: StructureNode[], pointers: Record<string, number | null>, message: string, lines: number[]) => VizStep;

function makeEmit(counters: Record<string, number>, layout: 'stack' | 'queue'): Emit {
  return (nodes, pointers, message, lines) => ({
    frame: structureFrame(layout, nodes, pointers, message),
    description: message,
    pseudocodeLines: lines,
    counters: { ...counters },
  });
}

function makeNodes(vals: string[], marks: Record<number, ElementState> = {}, prefix = 'n'): StructureNode[] {
  return vals.map((v, i) => ({ id: `${prefix}${i}-${v}`, value: v, state: marks[i] ?? 'normal' }));
}

export function* stackGen(input: LinearInput): Generator<VizStep, void, void> {
  const c = { inserts: 0, removes: 0 };
  const emit = makeEmit(c, 'stack');
  let vals = [...input.initial];
  const topPtr = (list: string[]) => ({ top: list.length > 0 ? list.length - 1 : null });
  const op = input.operation;

  switch (op.op) {
    case 'push': {
      yield emit(makeNodes(vals), topPtr(vals), `初始栈（${vals.length} 个元素），准备将 ${op.value} 入栈`, [0]);
      if (vals.length >= LINEAR_CAPACITY) {
        yield emit(makeNodes(vals), topPtr(vals), `栈已满（容量 ${LINEAR_CAPACITY}）！入栈操作被拒绝`, [1]);
        return;
      }
      vals = [...vals, op.value];
      c.inserts++;
      yield emit(makeNodes(vals, { [vals.length - 1]: 'active' }), topPtr(vals), `${op.value} 入栈，成为新的栈顶`, [2]);
      yield emit(makeNodes(vals), topPtr(vals), `入栈完成：栈顶 top 指向 ${vals[vals.length - 1]}`, [3]);
      return;
    }
    case 'pop': {
      yield emit(makeNodes(vals), topPtr(vals), `初始栈（${vals.length} 个元素），准备出栈`, [4]);
      if (vals.length === 0) {
        yield emit(makeNodes(vals), topPtr(vals), '栈为空！出栈操作被拒绝', [5]);
        return;
      }
      const popped = vals[vals.length - 1];
      yield emit(makeNodes(vals, { [vals.length - 1]: 'danger' }), topPtr(vals), `弹出栈顶元素 ${popped}`, [6]);
      vals = vals.slice(0, -1);
      c.removes++;
      yield emit(
        makeNodes(vals),
        topPtr(vals),
        vals.length > 0 ? `出栈完成：${popped} 已移除，栈顶为 ${vals[vals.length - 1]}` : `出栈完成：${popped} 已移除，栈已空`,
        [6],
      );
      return;
    }
    case 'peek': {
      yield emit(makeNodes(vals), topPtr(vals), `初始栈（${vals.length} 个元素），查看栈顶（peek）`, [7]);
      if (vals.length === 0) {
        yield emit(makeNodes(vals), topPtr(vals), '栈为空！没有栈顶元素可查看', [8]);
        return;
      }
      yield emit(
        makeNodes(vals, { [vals.length - 1]: 'active' }),
        topPtr(vals),
        `栈顶元素为 ${vals[vals.length - 1]}（peek 不移除元素）`,
        [9],
      );
      yield emit(makeNodes(vals), topPtr(vals), '查看完成，栈保持不变', [9]);
      return;
    }
  }
}

export function* queueGen(input: LinearInput): Generator<VizStep, void, void> {
  const c = { inserts: 0, removes: 0 };
  const emit = makeEmit(c, 'queue');
  let vals = [...input.initial];
  const ptrs = (list: string[]) => ({
    front: list.length > 0 ? 0 : null,
    rear: list.length > 0 ? list.length - 1 : null,
  });
  const op = input.operation;

  switch (op.op) {
    case 'enqueue': {
      yield emit(makeNodes(vals), ptrs(vals), `初始队列（${vals.length} 个元素），准备将 ${op.value} 入队`, [0]);
      if (vals.length >= LINEAR_CAPACITY) {
        yield emit(makeNodes(vals), ptrs(vals), `队列已满（容量 ${LINEAR_CAPACITY}）！入队操作被拒绝`, [1]);
        return;
      }
      vals = [...vals, op.value];
      c.inserts++;
      yield emit(makeNodes(vals, { [vals.length - 1]: 'active' }), ptrs(vals), `${op.value} 从队尾入队`, [2]);
      yield emit(makeNodes(vals), ptrs(vals), `入队完成：队首 ${vals[0]}，队尾 ${vals[vals.length - 1]}`, [3]);
      return;
    }
    case 'dequeue': {
      yield emit(makeNodes(vals), ptrs(vals), `初始队列（${vals.length} 个元素），准备出队`, [4]);
      if (vals.length === 0) {
        yield emit(makeNodes(vals), ptrs(vals), '队列为空！出队操作被拒绝', [5]);
        return;
      }
      const out = vals[0];
      yield emit(makeNodes(vals, { 0: 'danger' }), ptrs(vals), `队首元素 ${out} 出队`, [6]);
      vals = vals.slice(1);
      c.removes++;
      yield emit(
        makeNodes(vals, {}, 'q'),
        ptrs(vals),
        vals.length > 0 ? `出队完成：${out} 已移除，队首为 ${vals[0]}` : `出队完成：${out} 已移除，队列已空`,
        [6],
      );
      return;
    }
    case 'front': {
      yield emit(makeNodes(vals), ptrs(vals), `初始队列（${vals.length} 个元素），查看队首（front）`, [7]);
      if (vals.length === 0) {
        yield emit(makeNodes(vals), ptrs(vals), '队列为空！没有队首元素可查看', [8]);
        return;
      }
      yield emit(
        makeNodes(vals, { 0: 'active' }),
        ptrs(vals),
        `队首元素为 ${vals[0]}（front 不移除元素）`,
        [9],
      );
      yield emit(makeNodes(vals), ptrs(vals), '查看完成，队列保持不变', [9]);
      return;
    }
  }
}
