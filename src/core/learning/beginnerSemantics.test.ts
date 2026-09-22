/**
 * 教学正确性测试（CROSS_LAYER_TEST_SPEC §6）：
 * Beginner 解释必须与算法真实语义一致，禁止泛化/夸大/猜测。
 * 重点锁定 P11 修复的三处错误：swap 泛化「冒泡」、BST「每层排除一半」、Dijkstra relax 猜目标。
 */
import { describe, expect, it } from 'vitest';
import { collectSteps } from '../step/step';
import type { VizStep } from '../step/step';
import { explainStepBeginner } from './beginner';
import { registerAll } from '../registry';
import { allEntries } from '../algorithms';
import { getAlgorithm } from '../registry';
import type { AlgorithmInput, GraphInput } from '../registry';

registerAll(allEntries);

const run = (id: string, input: AlgorithmInput): VizStep[] => {
  const entry = getAlgorithm(id);
  if (!entry) throw new Error(`算法不存在：${id}`);
  return collectSteps(entry.run(input));
};

function beginnerTexts(steps: VizStep[]): string[] {
  return steps.map((s, i) => explainStepBeginner(s, i > 0 ? steps[i - 1]! : null) ?? '');
}

describe('教学正确性：swap 不得泛化为「冒泡」', () => {
  it('heap-sort 的交换解释不得包含「冒泡」', () => {
    const steps = run('heap-sort', { type: 'sort', array: [5, 3, 8, 1, 9, 2] });
    const texts = beginnerTexts(steps);
    const swapTexts = texts.filter((t) => t.includes('交换'));
    expect(swapTexts.length).toBeGreaterThan(0);
    for (const t of swapTexts) expect(t).not.toContain('冒泡');
  });

  it('quick-sort 的交换解释不得包含「冒泡」', () => {
    const steps = run('quick-sort', { type: 'sort', array: [5, 2, 8, 1, 9, 3] });
    const texts = beginnerTexts(steps);
    const swapTexts = texts.filter((t) => t.includes('交换'));
    expect(swapTexts.length).toBeGreaterThan(0);
    for (const t of swapTexts) expect(t).not.toContain('冒泡');
  });

  it('selection-sort 的交换解释必须体现「最小值」就位语义', () => {
    const steps = run('selection-sort', { type: 'sort', array: [7, 3, 5, 2] });
    const texts = beginnerTexts(steps);
    const swapText = texts.find((t) => t.includes('最小值') && t.includes('换到'));
    expect(swapText).toBeDefined();
  });

  it('bubble-sort 的交换解释包含「冒泡」语义', () => {
    const steps = run('bubble-sort', { type: 'sort', array: [5, 2, 4, 1] });
    const texts = beginnerTexts(steps);
    const swapText = texts.find((t) => t.includes('交换') && t.includes('冒泡'));
    expect(swapText).toBeDefined();
  });

  it('heap-sort 的堆顶交换解释提到「堆顶/最大」；heapify 下沉解释提到「堆性质/下沉」', () => {
    const steps = run('heap-sort', { type: 'sort', array: [4, 10, 3, 5, 1] });
    const texts = beginnerTexts(steps);
    expect(texts.some((t) => t.includes('堆顶'))).toBe(true);
    expect(texts.some((t) => t.includes('下沉'))).toBe(true);
  });
});

describe('教学正确性：BST 不得声称平衡性质', () => {
  it('BST 下降解释不得包含「排除一半」', () => {
    const steps = run('bst-operations', { type: 'bst', startTree: [8, 3, 10, 1, 6, 14], operation: { op: 'search', value: 6 } });
    const texts = beginnerTexts(steps);
    for (const t of texts) {
      expect(t).not.toContain('排除一半');
      expect(t).not.toContain('排除一半候选');
    }
  });

  it('BST 下降解释包含 O(log n) 与最坏 O(n) 的准确表述', () => {
    const steps = run('bst-operations', { type: 'bst', startTree: [8, 3, 10, 1, 6, 14], operation: { op: 'search', value: 6 } });
    const texts = beginnerTexts(steps);
    const descendText = texts.find((t) => t.includes('左子树') || t.includes('右子树'));
    expect(descendText).toBeDefined();
    expect(descendText).toContain('O(log n)');
    expect(descendText).toContain('O(n)');
  });
});

describe('教学正确性：Dijkstra relax 解释必须等于 semantic 真实数据', () => {
  // 与 Dijkstra 实现相同的默认图（含多条可松弛边）
  const graphInput: GraphInput = {
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
        { id: 'e5', from: 'C', to: 'D', directed: false, weight: 9 },
      ],
    },
    start: 'A',
    end: null,
  };

  it('每个 graph-relax 步的 Beginner 解释包含 semantic.to / newDistance / predecessor，且与旧值一致', () => {
    const steps = run('dijkstra', graphInput);
    const relaxSteps = steps.filter((s) => s.semantic?.type === 'graph-relax');
    expect(relaxSteps.length).toBeGreaterThanOrEqual(3); // A→C, C→B(4→3), B→D, C→D(9→?) 多次松弛
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]!;
      const sem = s.semantic;
      if (!sem || sem.type !== 'graph-relax') continue;
      const text = explainStepBeginner(s, i > 0 ? steps[i - 1]! : null) ?? '';
      expect(text).toContain(`dist[${sem.to}]`);
      expect(text).toContain(String(sem.newDistance));
      expect(text).toContain(`predecessor=${sem.predecessor}`);
      if (sem.oldDistance !== null) {
        expect(text).toContain(String(sem.oldDistance));
      } else {
        expect(text).toContain('∞');
      }
    }
  });

  it('解释中的松弛目标与帧中 predecessor 变化的目标一致（禁止猜「最后一个带前驱的节点」）', () => {
    const steps = run('dijkstra', graphInput);
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1]!;
      const cur = steps[i]!;
      const sem = cur.semantic;
      if (!sem || sem.type !== 'graph-relax') continue;
      // semantic.to 的前驱必须在这一步从 null/其他值 变为 semantic.predecessor
      const prevNode = prev.frame.kind === 'graph' ? prev.frame.nodes.find((n) => n.id === sem.to) : undefined;
      const curNode = cur.frame.kind === 'graph' ? cur.frame.nodes.find((n) => n.id === sem.to) : undefined;
      expect(prevNode).toBeDefined();
      expect(curNode).toBeDefined();
      expect(curNode?.distance).toBe(sem.newDistance);
      expect(prevNode?.distance).toBe(sem.oldDistance);
      expect(curNode?.predecessor).toBe(sem.predecessor);
    }
  });

  it('graph-finalize（定型）解释提到定型语义', () => {
    const steps = run('dijkstra', graphInput);
    const texts = beginnerTexts(steps);
    expect(texts.some((t) => t.includes('定型'))).toBe(true);
  });
});

describe('教学正确性：semantic-first 生效', () => {
  it('所有带 semantic 的关键步骤都能产出非空解释（除少数过程类型）', () => {
    const steps = run('bubble-sort', { type: 'sort', array: [5, 2, 4, 1] });
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]!;
      if (!s.semantic) continue;
      if (s.semantic.type === 'compare' || s.semantic.type === 'swap') {
        expect(explainStepBeginner(s, i > 0 ? steps[i - 1]! : null)).not.toBeNull();
      }
    }
  });

  it('fallback 路径（无 semantic）仍然工作：swap 文案为中性', () => {
    const step: VizStep = {
      frame: {
        kind: 'array',
        values: [1, 3],
        comparing: [],
        swapping: [0, 1],
        sorted: [],
        pivot: null,
        range: null,
        pointers: {},
        target: null,
        found: null,
        note: null,
      },
      description: '交换',
      pseudocodeLines: [0],
      counters: { comparisons: 0, swaps: 1, writes: 0 },
      // 故意不带 semantic，走 frame-diff 兼容路径
    };
    const text = explainStepBeginner(step, null);
    expect(text).toContain('交换');
    expect(text).not.toContain('冒泡');
  });
});
