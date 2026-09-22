/**
 * 单链表操作的可视化生成器：建表 / 遍历 / 插入 / 删除 / 搜索。
 * 帧使用 StructureFrame（layout: list），指针 prev/curr 以节点下标表示。
 */
import type { LinkedListInput } from '../../registry';
import { structureFrame } from '../../step/frame';
import type { ElementState, StructureNode } from '../../step/frame';
import type { VizStep } from '../../step/step';
import type { StepSemantic } from '../../step/semantic';
import { LINEAR_CAPACITY } from './stackQueue';

export function* linkedListGen(input: LinkedListInput): Generator<VizStep, void, void> {
  const c = { comparisons: 0, inserts: 0, removes: 0, visits: 0 };
  const op = input.operation;
  let vals: string[];
  if (op.op === 'create') {
    vals = [];
  } else {
    vals = [...input.initial];
  }

  const emit = (
    nodes: StructureNode[],
    pointers: Record<string, number | null>,
    message: string,
    lines: number[],
    semantic?: StepSemantic,
  ): VizStep => ({
    frame: structureFrame('list', nodes, pointers, message),
    description: message,
    pseudocodeLines: lines,
    counters: { ...c },
    ...(semantic ? { semantic } : {}),
  });

  const makeNodes = (list: string[], marks: Record<number, ElementState> = {}, prefix = 'l') =>
    list.map((v, i) => ({ id: `${prefix}${i}-${v}`, value: v, state: marks[i] ?? 'normal' }));

  switch (op.op) {
    case 'create': {
      yield emit([], {}, '初始状态：空链表，准备依次尾插建立链表', [0, 1]);
      for (const v of input.initial) {
        vals = [...vals, v];
        c.inserts++;
        yield emit(makeNodes(vals, { [vals.length - 1]: 'active' }), {}, `建立节点 ${v}，链接到表尾`, [1], {
          type: 'list-node-create',
          value: v,
        });
      }
      yield emit(makeNodes(vals), {}, `建表完成：链表共 ${vals.length} 个节点`, [1]);
      return;
    }

    case 'traverse': {
      yield emit(makeNodes(vals), { curr: vals.length > 0 ? 0 : null }, `初始链表（${vals.length} 个节点），准备从头遍历`, [2, 3]);
      if (vals.length === 0) {
        yield emit([], { curr: null }, '链表为空，遍历结束', [4]);
        return;
      }
      for (let i = 0; i < vals.length; i++) {
        c.visits++;
        const marks: Record<number, ElementState> = {};
        for (let k = 0; k < i; k++) marks[k] = 'success';
        marks[i] = 'active';
        yield emit(makeNodes(vals, marks), { curr: i }, `curr 访问节点 ${i}：值 ${vals[i]}`, [4, 5], {
          type: 'list-visit',
          index: i,
          value: vals[i]!,
        });
      }
      const allOk: Record<number, ElementState> = {};
      for (let k = 0; k < vals.length; k++) allOk[k] = 'success';
      yield emit(makeNodes(vals, allOk), { curr: null }, `遍历完成：共访问 ${vals.length} 个节点，到达 NULL`, [5]);
      return;
    }

    case 'insert': {
      const { position: pos, value } = op;
      // 防御：位置越界（pos > length 或负数）拒绝，结构不变（与 applyLinkedListOperation 一致）
      if (pos < 0 || pos > vals.length || vals.length >= LINEAR_CAPACITY) {
        yield emit(makeNodes(vals), {}, `位置 ${pos} 越界（合法范围 0–${vals.length}）或链表已满，插入被拒绝`, [6]);
        return;
      }
      yield emit(
        makeNodes(vals),
        { prev: pos > 0 ? pos - 1 : null, curr: pos < vals.length ? pos : null },
        `初始链表（${vals.length} 个节点），准备在位置 ${pos} 插入 ${value}`,
        [6],
      );
      for (let i = 0; i < pos; i++) {
        const marks: Record<number, ElementState> = {};
        for (let k = 0; k < i; k++) marks[k] = 'muted';
        marks[i] = 'active';
        yield emit(makeNodes(vals, marks), { prev: i, curr: i + 1 < vals.length ? i + 1 : null }, `定位：prev 移动到节点 ${i}（值 ${vals[i]}）`, [7], {
          type: 'list-visit',
          index: i,
          value: vals[i]!,
        });
      }
      if (pos === 0) {
        c.inserts++;
        const next = makeNodes(vals, {}, 'a');
        yield emit([{ id: 'new', value, state: 'active' }, ...next], { curr: 1 <= vals.length ? 1 : null }, `${value} 将插入表头：新节点的 next 指向原头节点`, [8], {
          type: 'list-insert',
          position: pos,
          value,
        });
      } else {
        c.inserts++;
        const marks: Record<number, ElementState> = { [pos - 1]: 'success' };
        const next = makeNodes(vals, marks, 'a');
        const newNode: StructureNode = { id: 'new', value, state: 'active' };
        yield emit([...next.slice(0, pos), newNode, ...next.slice(pos)], { prev: pos - 1 }, `新节点 ${value} 接入：prev.next 指向新节点，新节点.next 指向原后继`, [8], {
          type: 'list-insert',
          position: pos,
          value,
        });
      }
      const finalVals = [...vals.slice(0, pos), value, ...vals.slice(pos)];
      yield emit(makeNodes(finalVals, {}, 'f'), { prev: null, curr: null }, `插入完成：链表长度变为 ${finalVals.length}`, [8]);
      return;
    }

    case 'delete': {
      const { position: pos } = op;
      // 防御：位置越界或空表拒绝，结构不变（与 applyLinkedListOperation 一致）
      if (pos < 0 || pos >= vals.length) {
        yield emit(makeNodes(vals), {}, `位置 ${pos} 越界（合法范围 0–${Math.max(0, vals.length - 1)}）或链表为空，删除被拒绝`, [9]);
        return;
      }
      yield emit(
        makeNodes(vals),
        { prev: pos > 0 ? pos - 1 : null, curr: pos < vals.length ? pos : null },
        `初始链表（${vals.length} 个节点），准备删除位置 ${pos} 的节点`,
        [9],
      );
      for (let i = 0; i < pos; i++) {
        const marks: Record<number, ElementState> = {};
        for (let k = 0; k < i; k++) marks[k] = 'muted';
        marks[i] = 'active';
        yield emit(makeNodes(vals, marks), { prev: i, curr: i + 1 < vals.length ? i + 1 : null }, `定位：prev 移动到节点 ${i}（值 ${vals[i]}）`, [10], {
          type: 'list-visit',
          index: i,
          value: vals[i]!,
        });
      }
      yield emit(makeNodes(vals, { [pos]: 'danger' }), { prev: pos > 0 ? pos - 1 : null }, `删除节点 ${pos}（值 ${vals[pos]}）：prev.next 将跳过它`, [11], {
        type: 'list-delete',
        position: pos,
        value: vals[pos]!,
      });
      c.removes++;
      const finalVals = vals.filter((_, i) => i !== pos);
      yield emit(makeNodes(finalVals, {}, 'd'), { prev: null, curr: null }, `删除完成：${vals[pos]} 已移除，链表长度变为 ${finalVals.length}`, [11]);
      return;
    }

    case 'search': {
      yield emit(makeNodes(vals), { curr: vals.length > 0 ? 0 : null }, `初始链表（${vals.length} 个节点），查找值 ${op.value}`, [12, 13]);
      for (let i = 0; i < vals.length; i++) {
        c.comparisons++;
        const marks: Record<number, ElementState> = {};
        for (let k = 0; k < i; k++) marks[k] = 'muted';
        marks[i] = 'active';
        yield emit(makeNodes(vals, marks), { curr: i }, `比较节点 ${i}：${vals[i]} ${vals[i] === op.value ? '=' : '≠'} ${op.value}`, [13], {
          type: 'list-compare',
          index: i,
          value: vals[i]!,
          target: op.value,
          equal: vals[i] === op.value,
        });
        if (vals[i] === op.value) {
          const marks2: Record<number, ElementState> = { [i]: 'success' };
          yield emit(makeNodes(vals, marks2), { curr: i }, `找到目标！位置 ${i} 的值是 ${op.value}，共比较 ${c.comparisons} 次`, [13]);
          return;
        }
      }
      yield emit(makeNodes(vals), { curr: null }, `扫描完毕：链表中不存在 ${op.value}，查找失败`, [13]);
      return;
    }
  }
}
