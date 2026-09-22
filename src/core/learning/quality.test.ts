/**
 * Predict / Challenge 质量测试（CROSS_LAYER_TEST_SPEC §7）：
 * - Predict：题目答案必须与 semantic payload 一致（不依赖 description 文本解析）
 * - Challenge：全部期望动作可映射回真实 VizStep 且与该步 semantic 匹配
 */
import { describe, expect, it } from 'vitest';
import { registerAll, getAlgorithm } from '../registry';
import { allEntries } from '../algorithms';
import { collectSteps } from '../step/step';
import type { VizStep } from '../step/step';
import type { AlgorithmInput } from '../registry';
import { generatePredictQuestion } from '../predict/engine';
import { CHALLENGE_DEFS } from '../challenge/defs';
import { createMachine } from '../challenge/machine';
import type { ChallengeAction } from '../challenge/types';

registerAll(allEntries);

const run = (id: string, input: AlgorithmInput): VizStep[] => {
  const entry = getAlgorithm(id);
  if (!entry) throw new Error(`算法不存在：${id}`);
  return collectSteps(entry.run(input));
};

/** semantic 与 ChallengeAction 的匹配（挑战质量：期望动作可映射回真实步骤语义） */
function semanticMatchesAction(s: VizStep['semantic'], a: ChallengeAction): boolean {
  if (!s) return false;
  switch (a.kind) {
    case 'swap':
      return s.type === 'swap' && s.indices[0] === a.indices[0] && s.indices[1] === a.indices[1];
    case 'compare':
      return s.type === 'compare' && s.indices.length === a.indices.length && a.indices.every((v, i) => s.indices[i] === v);
    case 'pick':
      return (
        (s.type === 'visit-node' && s.nodeId === a.value) ||
        (s.type === 'tree-descend' && String(s.nodeValue) === a.value) ||
        (s.type === 'compare' && s.purpose === 'binary-mid' && String(s.values[0]) === a.value)
      );
    case 'op':
      return (
        (s.type === 'push' && a.op === 'push' && s.value === a.value) ||
        (s.type === 'pop' && a.op === 'pop') ||
        (s.type === 'enqueue' && a.op === 'enqueue' && s.value === a.value) ||
        (s.type === 'dequeue' && a.op === 'dequeue')
      );
  }
}

describe('Predict 质量测试：answer 与 semantic payload 一致', () => {
  it('swap 题：answer 是 semantic.indices 的 pair 标签', () => {
    const steps = run('bubble-sort', { type: 'sort', array: [5, 2, 4, 1] });
    let checked = 0;
    for (let i = 0; i + 1 < steps.length; i++) {
      const sem = steps[i + 1]!.semantic;
      if (!sem || sem.type !== 'swap') continue;
      const q = generatePredictQuestion(steps, i);
      expect(q).not.toBeNull();
      if (q!.kind === 'next-swap') {
        const [a, b] = sem.indices;
        const label = `a[${Math.min(a, b)}] 与 a[${Math.max(a, b)}]`;
        expect(q!.options[q!.answerIndex]).toBe(label);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('graph-relax 题：answer 是 semantic.newDistance 的字符串', () => {
    const steps = run('dijkstra', {
      type: 'graph',
      algorithm: 'dijkstra',
      graph: {
        nodes: [
          { id: 'A', x: 0.1, y: 0.5 },
          { id: 'B', x: 0.4, y: 0.2 },
          { id: 'C', x: 0.4, y: 0.8 },
          { id: 'D', x: 0.8, y: 0.5 },
        ],
        edges: [
          { id: 'e1', from: 'A', to: 'B', directed: false, weight: 4 },
          { id: 'e2', from: 'A', to: 'C', directed: false, weight: 1 },
          { id: 'e3', from: 'C', to: 'B', directed: false, weight: 2 },
          { id: 'e4', from: 'B', to: 'D', directed: false, weight: 5 },
        ],
      },
      start: 'A',
      end: null,
    });
    let checked = 0;
    for (let i = 0; i + 1 < steps.length; i++) {
      const sem = steps[i + 1]!.semantic;
      if (!sem || sem.type !== 'graph-relax') continue;
      const q = generatePredictQuestion(steps, i);
      expect(q).not.toBeNull();
      if (q!.kind === 'next-relax') {
        expect(q!.options[q!.answerIndex]).toBe(String(sem.newDistance));
        // 题面包含真实目标与旧值
        expect(q!.prompt).toContain(sem.to);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(2);
  });

  it('visit-node 题：answer 是 semantic.nodeId', () => {
    const steps = run('bfs', {
      type: 'graph',
      algorithm: 'bfs',
      graph: {
        nodes: [
          { id: 'A', x: 0.1, y: 0.5 },
          { id: 'B', x: 0.4, y: 0.2 },
          { id: 'C', x: 0.4, y: 0.8 },
        ],
        edges: [
          { id: 'e1', from: 'A', to: 'B', directed: false, weight: 1 },
          { id: 'e2', from: 'A', to: 'C', directed: false, weight: 1 },
        ],
      },
      start: 'A',
      end: null,
    });
    for (let i = 0; i + 1 < steps.length; i++) {
      const sem = steps[i + 1]!.semantic;
      if (!sem || sem.type !== 'visit-node') continue;
      const q = generatePredictQuestion(steps, i);
      expect(q).not.toBeNull();
      if (q!.kind === 'next-visit') expect(q!.options[q!.answerIndex]).toBe(sem.nodeId);
    }
  });

  it('dp-fill 题：answer 是 semantic.value', () => {
    const steps = run('fib-dp', { type: 'dp', kind: 'fibonacci', n: 8 });
    let checked = 0;
    for (let i = 0; i + 1 < steps.length; i++) {
      const sem = steps[i + 1]!.semantic;
      if (!sem || sem.type !== 'dp-fill') continue;
      const q = generatePredictQuestion(steps, i);
      if (q !== null && q.kind === 'next-dp-cell') {
        expect(q.options[q.answerIndex]).toBe(String(sem.value));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('call 题：answer 是 semantic.label', () => {
    const steps = run('factorial', { type: 'recursion', kind: 'factorial', n: 5 });
    let checked = 0;
    for (let i = 0; i + 1 < steps.length; i++) {
      const sem = steps[i + 1]!.semantic;
      if (!sem || sem.type !== 'call') continue;
      const q = generatePredictQuestion(steps, i);
      expect(q).not.toBeNull();
      if (q!.kind === 'next-call') {
        expect(q!.options[q!.answerIndex]).toBe(sem.label);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(2);
  });

  it('tree-descend 题：answer 是 semantic.nodeValue', () => {
    const steps = run('bst-operations', {
      type: 'bst',
      startTree: [8, 3, 10, 1, 6, 14],
      operation: { op: 'search', value: 6 },
    });
    for (let i = 0; i + 1 < steps.length; i++) {
      const sem = steps[i + 1]!.semantic;
      if (!sem || sem.type !== 'tree-descend') continue;
      const q = generatePredictQuestion(steps, i);
      expect(q).not.toBeNull();
      if (q!.kind === 'next-tree-node') expect(q!.options[q!.answerIndex]).toBe(String(sem.nodeValue));
    }
  });
});

describe('Challenge 质量测试：期望动作可映射回真实 VizStep 语义', () => {
  it('全部 ChallengeDef：每个期望动作的 stepIndex 对应的步骤 semantic 与动作匹配', () => {
    for (const def of CHALLENGE_DEFS) {
      const m = createMachine(def);
      expect(m.interactive.length, `${def.id} 无期望动作`).toBeGreaterThan(0);
      // 重新构建同一步骤序列验证映射（def.buildSteps 是纯函数，可重复调用）
      const steps = def.buildSteps();
      for (const is of m.interactive) {
        expect(is.stepIndex).toBeLessThan(steps.length);
        const step = steps[is.stepIndex]!;
        expect(
          semanticMatchesAction(step.semantic, is.action),
          `${def.id}：第 ${is.stepIndex} 步 semantic(${step.semantic?.type ?? 'none'}) 与动作 ${JSON.stringify(is.action)} 不匹配`,
        ).toBe(true);
      }
      // takeActions 截断的挑战：期望序列是完整序列的前缀
      if (def.takeActions !== undefined) {
        expect(m.interactive.length).toBeLessThanOrEqual(def.takeActions);
      }
    }
  });

  it('期望序列数量：与已知值一致（防手写漂移）', () => {
    const counts: Record<string, number> = {};
    for (const def of CHALLENGE_DEFS) counts[def.id] = createMachine(def).interactive.length;
    expect(counts['bubble-pass']).toBe(6);
    expect(counts['selection-round']).toBe(4);
    expect(counts['stack-ops']).toBe(3);
    expect(counts['queue-ops']).toBe(3);
  });
});
