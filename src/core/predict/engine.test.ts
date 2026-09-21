/**
 * Predict 出题引擎测试：与真实 nextStep 的一致性、确定性、干扰项合法性。
 */
import { describe, expect, it } from 'vitest';
import { allEntries } from '../algorithms';
import { getAlgorithm, registerAll } from '../registry';
import { collectSteps } from '../step/step';
import { generatePredictQuestion, gradePredict, type PredictQuestion } from './engine';
import type { ArrayFrame, GraphFrame, StructureFrame } from '../step/frame';

registerAll(allEntries);

function stepsOf(algoId: string) {
  const entry = getAlgorithm(algoId);
  if (!entry) throw new Error(`算法不存在：${algoId}`);
  return collectSteps(entry.run(entry.defaultInput));
}

/** 收集一段步骤序列上全部可出题目 */
function questionsOf(steps: ReturnType<typeof collectSteps>): { index: number; q: PredictQuestion }[] {
  const out: { index: number; q: PredictQuestion }[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const q = generatePredictQuestion(steps, i);
    if (q) out.push({ index: i, q });
  }
  return out;
}

describe('出题一致性：答案永远等于真实下一步', () => {
  it('冒泡排序：next-compare / next-swap 与真实帧一致', () => {
    const steps = stepsOf('bubble-sort');
    const qs = questionsOf(steps);
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame as ArrayFrame;
      if (q.kind === 'next-compare') {
        expect(q.options[q.answerIndex]).toBe(next.comparing.map((x) => `a[${x}]`).join(' 与 '));
      }
      if (q.kind === 'next-swap') {
        expect(q.options[q.answerIndex]).toBe(next.swapping.map((x) => `a[${x}]`).join(' 与 '));
      }
    }
  });

  it('二分查找：next-mid 与真实中点一致', () => {
    const steps = stepsOf('binary-search');
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-mid');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame as ArrayFrame;
      expect(q.options[q.answerIndex]).toBe(String(next.pointers.mid));
    }
  });

  it('BFS：next-visit 与真实 current 一致', () => {
    const steps = stepsOf('bfs');
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-visit');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame as GraphFrame;
      expect(q.options[q.answerIndex]).toBe(next.current);
    }
  });

  it('Dijkstra：next-relax 与真实距离一致', () => {
    const steps = stepsOf('dijkstra');
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-relax');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame as GraphFrame;
      const cur = steps[index]!.frame as GraphFrame;
      const changed = next.nodes.filter((nn) => {
        const cc = cur.nodes.find((m) => m.id === nn.id);
        return cc !== undefined && (cc.distance !== nn.distance || cc.predecessor !== nn.predecessor);
      });
      expect(changed.length).toBeGreaterThan(0);
      const target = changed[changed.length - 1]!;
      expect(q.options[q.answerIndex]).toBe(String(target.distance));
    }
  });

  it('栈：next-push 与真实新栈顶一致', () => {
    const entry = getAlgorithm('stack')!;
    const steps = collectSteps(entry.run({ type: 'linear', structure: 'stack', initial: ['a', 'b'], operation: { op: 'push', value: 'c' } }));
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-push');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame as StructureFrame;
      expect(q.options[q.answerIndex]).toBe(next.nodes[next.nodes.length - 1]?.value);
    }
  });

  it('快排：next-compare（单元素与 pivot 比较）与真实帧一致', () => {
    const steps = stepsOf('quick-sort');
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-compare');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame as ArrayFrame;
      expect(q.options[q.answerIndex]).toBe(String(next.comparing[0]));
    }
  });

  it('斐波那契 DP：next-dp-cell 与真实填入值一致', () => {
    const steps = stepsOf('fib-dp');
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-dp-cell');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame;
      if (next.kind !== 'dp' || next.current === null) continue;
      expect(q.options[q.answerIndex]).toBe(String(next.cells[next.current]));
    }
  });

  it('阶乘：next-call 与真实栈顶一致', () => {
    const steps = stepsOf('factorial');
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-call');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame;
      if (next.kind !== 'recursion') continue;
      expect(q.options[q.answerIndex]).toBe(next.callStack[next.callStack.length - 1]?.label);
    }
  });

  it('BST：next-tree-node 与真实 active 节点一致', () => {
    const entry = getAlgorithm('bst-operations')!;
    const steps = collectSteps(entry.run({ type: 'bst', startTree: [8, 3, 10, 1, 6], operation: { op: 'search', value: 6 } }));
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-tree-node');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame;
      if (next.kind !== 'tree') continue;
      const active = next.nodes.find((m) => m.state === 'active');
      if (active) expect(q.options[q.answerIndex]).toBe(String(active.value));
    }
  });
});

describe('题目质量', () => {
  it('全部算法全步骤可安全出题；题目选项 3–4 个、answerIndex 合法', () => {
    for (const entry of allEntries) {
      const steps = collectSteps(entry.run(entry.defaultInput));
      for (const { q } of questionsOf(steps)) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.options.length).toBeLessThanOrEqual(4);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(q.options.length);
        expect(q.prompt.length).toBeGreaterThan(0);
        expect(q.explanation).toContain('真实下一步');
        expect(q.options.every((o) => o.length > 0)).toBe(true);
      }
    }
  });

  it('确定性：同输入同位置两次出题完全一致', () => {
    const steps = stepsOf('quick-sort');
    for (let i = 0; i < steps.length - 1; i++) {
      const a = generatePredictQuestion(steps, i);
      const b = generatePredictQuestion(steps, i);
      expect(a).toEqual(b);
    }
  });

  it('末步不可出题；init 步不可出题', () => {
    const steps = stepsOf('bubble-sort');
    expect(generatePredictQuestion(steps, steps.length - 1)).toBeNull();
    expect(generatePredictQuestion(steps, 0)).toBeNull();
  });
});

describe('判分', () => {
  it('选中正确项得分，选错不得分', () => {
    const steps = stepsOf('bubble-sort');
    const qs = questionsOf(steps);
    const { q } = qs[0]!;
    expect(gradePredict(q, q.answerIndex)).toBe(true);
    expect(gradePredict(q, (q.answerIndex + 1) % q.options.length)).toBe(false);
  });
});

describe('补充分支：structure pop/dequeue 与 frontier-add', () => {
  it('栈 pop：next-pop 与真实弹出值一致', () => {
    const entry = getAlgorithm('stack')!;
    const steps = collectSteps(entry.run({ type: 'linear', structure: 'stack', initial: ['a', 'b', 'c'], operation: { op: 'pop' } }));
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-pop');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const cur = steps[index]!.frame as StructureFrame;
      expect(q.options[q.answerIndex]).toBe(cur.nodes[cur.nodes.length - 1]?.value);
    }
  });

  it('队列 enqueue/dequeue：与真实帧一致', () => {
    const entry = getAlgorithm('queue')!;
    const enq = collectSteps(entry.run({ type: 'linear', structure: 'queue', initial: ['a', 'b'], operation: { op: 'enqueue', value: 'c' } }));
    expect(questionsOf(enq).some(({ q }) => q.kind === 'next-enqueue')).toBe(true);
    const deq = collectSteps(entry.run({ type: 'linear', structure: 'queue', initial: ['a', 'b', 'c'], operation: { op: 'dequeue' } }));
    const qs = questionsOf(deq).filter(({ q }) => q.kind === 'next-dequeue');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const cur = steps0(index, deq);
      expect(q.options[q.answerIndex]).toBe(cur.nodes[0]?.value);
    }
    function steps0(i: number, arr: ReturnType<typeof collectSteps>) {
      return arr[i]!.frame as StructureFrame;
    }
  });

  it('BFS：frontier-add 出题与真实入队一致（若存在该类步骤）', () => {
    const steps = stepsOf('bfs');
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-frontier-add');
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame as GraphFrame;
      const cur = steps[index]!.frame as GraphFrame;
      const newIds = next.frontier.filter((x) => !cur.frontier.some((y) => y.id === x.id)).map((x) => x.id);
      expect(newIds.length).toBeGreaterThan(0);
      expect(q.options).toContain(newIds[0]!);
      expect(q.options[q.answerIndex]).toBe(newIds[0]);
    }
  });

  it('线性查找：next-compare 与真实下标一致', () => {
    const entry = getAlgorithm('linear-search')!;
    const steps = collectSteps(entry.run({ type: 'search', variant: 'linear', array: [4, 8, 15], target: 15 }));
    const qs = questionsOf(steps).filter(({ q }) => q.kind === 'next-compare');
    expect(qs.length).toBeGreaterThan(0);
    for (const { index, q } of qs) {
      const next = steps[index + 1]!.frame as ArrayFrame;
      expect(q.options[q.answerIndex]).toBe(String(next.comparing[0]));
    }
  });
});
