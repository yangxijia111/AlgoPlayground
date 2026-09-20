/**
 * 栈 / 队列 / 链表测试（TEST_PLAN T1.3）。
 */
import { describe, expect, it } from 'vitest';
import { collectSteps } from '../../step/step';
import { checkStepIntegrity } from '../../step/integrity';
import type { LinkedListInput, LinearInput } from '../../registry';
import entries from './index';
import { LINEAR_CAPACITY } from './stackQueue';

function runLinear(structure: 'stack' | 'queue', initial: string[], operation: LinearInput['operation']) {
  const entry = entries.find((e) => e.meta.id === (structure === 'stack' ? 'stack' : 'queue'));
  if (!entry) throw new Error('未注册');
  return collectSteps(entry.run({ type: 'linear', structure, initial, operation }));
}

function runList(initial: string[], operation: LinkedListInput['operation']) {
  const entry = entries.find((e) => e.meta.id === 'linked-list');
  if (!entry) throw new Error('linked-list 未注册');
  return collectSteps(entry.run({ type: 'linkedlist', initial, operation }));
}

const lastNodes = (steps: ReturnType<typeof runLinear> | ReturnType<typeof runList>) => {
  const f = steps[steps.length - 1].frame;
  if (f.kind !== 'structure') throw new Error('帧类型错误');
  return f;
};

describe('stack', () => {
  it('push 后栈顶为新元素', () => {
    const f = lastNodes(runLinear('stack', ['A', 'B'], { op: 'push', value: 'C' }));
    expect(f.nodes.map((n) => n.value)).toEqual(['A', 'B', 'C']);
    expect(f.pointers.top).toBe(2);
  });

  it('pop 移除栈顶', () => {
    const f = lastNodes(runLinear('stack', ['A', 'B', 'C'], { op: 'pop' }));
    expect(f.nodes.map((n) => n.value)).toEqual(['A', 'B']);
    expect(f.pointers.top).toBe(1);
  });

  it('peek 不改变栈', () => {
    const f = lastNodes(runLinear('stack', ['A', 'B'], { op: 'peek' }));
    expect(f.nodes.map((n) => n.value)).toEqual(['A', 'B']);
    expect(f.pointers.top).toBe(1);
  });

  it('空栈 pop 被拒绝且状态不变', () => {
    const steps = runLinear('stack', [], { op: 'pop' });
    const f = lastNodes(steps);
    expect(f.nodes).toHaveLength(0);
    expect(f.message).toContain('拒绝');
  });

  it('满栈 push 被拒绝', () => {
    const full = Array.from({ length: LINEAR_CAPACITY }, (_, i) => `v${i}`);
    const f = lastNodes(runLinear('stack', full, { op: 'push', value: 'X' }));
    expect(f.nodes).toHaveLength(LINEAR_CAPACITY);
    expect(f.message).toContain('栈已满');
  });

  it('步骤完整性', () => {
    const entry = entries.find((e) => e.meta.id === 'stack');
    const steps = runLinear('stack', ['A', 'B'], { op: 'pop' });
    expect(checkStepIntegrity(steps, entry?.meta.pseudocode.length ?? 0)).toEqual([]);
  });
});

describe('queue', () => {
  it('enqueue 加到队尾', () => {
    const f = lastNodes(runLinear('queue', ['A', 'B'], { op: 'enqueue', value: 'C' }));
    expect(f.nodes.map((n) => n.value)).toEqual(['A', 'B', 'C']);
    expect(f.pointers.front).toBe(0);
    expect(f.pointers.rear).toBe(2);
  });

  it('dequeue 移除队首（FIFO）', () => {
    const f = lastNodes(runLinear('queue', ['A', 'B', 'C'], { op: 'dequeue' }));
    expect(f.nodes.map((n) => n.value)).toEqual(['B', 'C']);
    expect(f.pointers.front).toBe(0);
  });

  it('连续 dequeue 遵循 FIFO 顺序', () => {
    // 单操作模型：链式三次单步运行，出队顺序应为 A、B、C
    expect(lastNodes(runLinear('queue', ['A', 'B', 'C'], { op: 'dequeue' })).nodes.map((n) => n.value)).toEqual(['B', 'C']);
    expect(lastNodes(runLinear('queue', ['B', 'C'], { op: 'dequeue' })).nodes.map((n) => n.value)).toEqual(['C']);
    expect(lastNodes(runLinear('queue', ['C'], { op: 'dequeue' })).nodes.map((n) => n.value)).toEqual([]);
    expect(lastNodes(runLinear('queue', ['C'], { op: 'dequeue' })).message).not.toContain('拒绝');
  });

  it('front 只读队首', () => {
    const f = lastNodes(runLinear('queue', ['A', 'B'], { op: 'front' }));
    expect(f.nodes.map((n) => n.value)).toEqual(['A', 'B']);
  });

  it('空队列 dequeue 被拒绝', () => {
    const f = lastNodes(runLinear('queue', [], { op: 'dequeue' }));
    expect(f.message).toContain('拒绝');
  });

  it('步骤完整性', () => {
    const entry = entries.find((e) => e.meta.id === 'queue');
    const steps = runLinear('queue', ['A'], { op: 'enqueue', value: 'B' });
    expect(checkStepIntegrity(steps, entry?.meta.pseudocode.length ?? 0)).toEqual([]);
  });
});

describe('linked-list', () => {
  it('create 按输入顺序建表（从空表尾插）', () => {
    const f = lastNodes(runList(['A', 'B', 'C'], { op: 'create' }));
    expect(f.nodes.map((n) => n.value)).toEqual(['A', 'B', 'C']);
  });

  it('traverse 按序访问全部节点', () => {
    const steps = runList(['A', 'B', 'C'], { op: 'traverse' });
    const f = lastNodes(steps);
    expect(f.message).toContain('遍历完成');
    // 最后一步全部 success
    expect(f.nodes.every((n) => n.state === 'success')).toBe(true);
  });

  it('空链表遍历正常结束', () => {
    const f = lastNodes(runList([], { op: 'traverse' }));
    expect(f.message).toContain('空');
  });

  it('insert 头部/中间/尾部', () => {
    expect(lastNodes(runList(['B', 'C'], { op: 'insert', position: 0, value: 'A' })).nodes.map((n) => n.value)).toEqual(['A', 'B', 'C']);
    expect(lastNodes(runList(['A', 'C'], { op: 'insert', position: 1, value: 'B' })).nodes.map((n) => n.value)).toEqual(['A', 'B', 'C']);
    expect(lastNodes(runList(['A', 'B'], { op: 'insert', position: 2, value: 'C' })).nodes.map((n) => n.value)).toEqual(['A', 'B', 'C']);
  });

  it('delete 头部/中间/尾部', () => {
    expect(lastNodes(runList(['A', 'B', 'C'], { op: 'delete', position: 0 })).nodes.map((n) => n.value)).toEqual(['B', 'C']);
    expect(lastNodes(runList(['A', 'B', 'C'], { op: 'delete', position: 1 })).nodes.map((n) => n.value)).toEqual(['A', 'C']);
    expect(lastNodes(runList(['A', 'B', 'C'], { op: 'delete', position: 2 })).nodes.map((n) => n.value)).toEqual(['A', 'B']);
  });

  it('search 命中/未命中', () => {
    const hit = lastNodes(runList(['A', 'B', 'C'], { op: 'search', value: 'B' }));
    expect(hit.message).toContain('找到');
    expect(hit.nodes[1].state).toBe('success');
    const miss = lastNodes(runList(['A', 'B', 'C'], { op: 'search', value: 'Z' }));
    expect(miss.message).toContain('不存在');
  });

  it('计数器：search 的比较次数正确', () => {
    const steps = runList(['A', 'B', 'C'], { op: 'search', value: 'C' });
    expect(steps[steps.length - 1].counters.comparisons).toBe(3);
  });

  it('步骤完整性（全部操作）', () => {
    const entry = entries.find((e) => e.meta.id === 'linked-list');
    const len = entry?.meta.pseudocode.length ?? 0;
    expect(checkStepIntegrity(runList(['A', 'B'], { op: 'create' }), len)).toEqual([]);
    expect(checkStepIntegrity(runList(['A', 'B'], { op: 'traverse' }), len)).toEqual([]);
    expect(checkStepIntegrity(runList(['A', 'B'], { op: 'insert', position: 1, value: 'X' }), len)).toEqual([]);
    expect(checkStepIntegrity(runList(['A', 'B'], { op: 'delete', position: 0 }), len)).toEqual([]);
    expect(checkStepIntegrity(runList(['A', 'B'], { op: 'search', value: 'B' }), len)).toEqual([]);
  });
});

describe('线性结构输入校验', () => {
  it('链表插入位置越界被拒绝', () => {
    const entry = entries.find((e) => e.meta.id === 'linked-list');
    const err = entry?.validate({ type: 'linkedlist', initial: ['A'], operation: { op: 'insert', position: 2, value: 'X' } });
    expect(err).toContain('0–1');
  });
  it('空链表删除被拒绝', () => {
    const entry = entries.find((e) => e.meta.id === 'linked-list');
    const err = entry?.validate({ type: 'linkedlist', initial: [], operation: { op: 'delete', position: 0 } });
    expect(err).toContain('为空');
  });
  it('空值入栈被拒绝', () => {
    const entry = entries.find((e) => e.meta.id === 'stack');
    const err = entry?.validate({ type: 'linear', structure: 'stack', initial: [], operation: { op: 'push', value: '  ' } });
    expect(err).toContain('值');
  });
});
