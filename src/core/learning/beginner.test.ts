/**
 * Beginner 详解引擎测试：用真实算法生成器验证步骤类型推导与详解内容。
 */
import { describe, expect, it } from 'vitest';
import { allEntries } from '../algorithms';
import { registerAll, getAlgorithm } from '../registry';
import { collectSteps } from '../step/step';
import { deriveStepKind, explainStepBeginner, getBeginnerNote } from './beginner';

registerAll(allEntries);

function stepsOf(algoId: string) {
  const entry = getAlgorithm(algoId);
  if (!entry) throw new Error(`算法不存在：${algoId}`);
  return collectSteps(entry.run(entry.defaultInput));
}

describe('deriveStepKind（真实生成器步骤）', () => {
  it('冒泡排序：比较与交换交替出现', () => {
    const steps = stepsOf('bubble-sort');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('compare');
    expect(kinds).toContain('swap');
  });

  it('二分查找：mid 比较与命中', () => {
    const steps = stepsOf('binary-search');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('compare');
    expect(kinds).toContain('found');
  });

  it('BFS：访问节点与 frontier 变化', () => {
    const steps = stepsOf('bfs');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('visit');
  });

  it('Dijkstra：松弛步骤存在', () => {
    const steps = stepsOf('dijkstra');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('relax');
  });

  it('栈：push/pop/peek', () => {
    const steps = stepsOf('stack');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('push');
  });

  it('斐波那契递归：call 与 return', () => {
    const steps = stepsOf('fibonacci-recursion');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('call');
    expect(kinds).toContain('return');
  });

  it('斐波那契 DP：填格步骤', () => {
    const steps = stepsOf('fib-dp');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('fill');
  });

  it('BST：下降步骤', () => {
    const steps = stepsOf('bst-operations');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('tree-descend');
  });

  it('首步（无 prev）为 init 或可识别类型，不抛异常', () => {
    for (const entry of allEntries) {
      const steps = collectSteps(entry.run(entry.defaultInput));
      if (steps.length === 0) continue;
      expect(() => deriveStepKind(steps[0]!, null)).not.toThrow();
    }
  });
});

describe('explainStepBeginner（详解内容）', () => {
  it('快排比较步：包含下标、值与 pivot 语义', () => {
    const steps = stepsOf('quick-sort');
    const hit = steps
      .map((s, i) => ({ s, ex: explainStepBeginner(s, i > 0 ? steps[i - 1] : null) }))
      .find(({ s }) => s.frame.kind === 'array' && s.frame.comparing.length > 0 && s.frame.pivot !== null);
    expect(hit).toBeDefined();
    expect(hit!.ex).toContain('基准');
    expect(hit!.ex).toContain('a[');
  });

  it('冒泡比较步：包含两个元素与结论', () => {
    const steps = stepsOf('bubble-sort');
    const idx = steps.findIndex((s) => s.frame.kind === 'array' && s.frame.comparing.length > 0);
    const ex = explainStepBeginner(steps[idx]!, idx > 0 ? steps[idx - 1] : null);
    expect(ex).toContain('比较');
    expect(ex).toContain('a[');
  });

  it('BFS 访问步：解释队列语义', () => {
    const steps = stepsOf('bfs');
    const idx = steps.findIndex((s, i) => {
      if (i === 0) return false;
      const p = steps[i - 1]!;
      return s.frame.kind === 'graph' && p.frame.kind === 'graph' && p.frame.current !== s.frame.current;
    });
    expect(idx).toBeGreaterThan(0);
    const ex = explainStepBeginner(steps[idx]!, steps[idx - 1]!);
    expect(ex).toContain('队列');
    expect(ex).toContain('访问');
  });

  it('Dijkstra 松弛步：解释距离更新与前驱', () => {
    const steps = stepsOf('dijkstra');
    const idx = steps.findIndex((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null) === 'relax');
    expect(idx).toBeGreaterThan(0);
    const ex = explainStepBeginner(steps[idx]!, steps[idx - 1]!);
    expect(ex).toContain('松弛');
    expect(ex).toContain('前驱');
  });

  it('斐波那契 DP 填格步：解释依赖关系', () => {
    const steps = stepsOf('fib-dp');
    const idx = steps.findIndex((s) => deriveStepKind(s, null) === 'fill');
    const ex = explainStepBeginner(steps[idx]!, idx > 0 ? steps[idx - 1] : null);
    expect(ex).toContain('填');
  });

  it('汉诺塔移动步：解释规则', () => {
    const steps = stepsOf('hanoi');
    const idx = steps.findIndex((s) => deriveStepKind(s, null) === 'move');
    expect(idx).toBeGreaterThanOrEqual(0);
    const ex = explainStepBeginner(steps[idx]!, idx > 0 ? steps[idx - 1] : null);
    expect(ex).toContain('盘');
  });

  it('确定性：同输入两次生成完全一致（无随机）', () => {
    const steps = stepsOf('quick-sort');
    for (let i = 1; i < steps.length; i++) {
      const a = explainStepBeginner(steps[i]!, steps[i - 1]!);
      const b = explainStepBeginner(steps[i]!, steps[i - 1]!);
      expect(a).toBe(b);
    }
  });

  it('init 步骤返回 null（不强凑解释）', () => {
    const steps = stepsOf('bubble-sort');
    expect(explainStepBeginner(steps[0]!, null)).toBeNull();
  });

  it('全部算法的全部步骤均可安全调用（不抛异常）', () => {
    for (const entry of allEntries) {
      const steps = collectSteps(entry.run(entry.defaultInput));
      for (let i = 0; i < steps.length; i++) {
        expect(() => explainStepBeginner(steps[i]!, i > 0 ? steps[i - 1]! : null)).not.toThrow();
      }
    }
  });
});

describe('getBeginnerNote', () => {
  it('核心算法有要点，未知算法返回 null', () => {
    expect(getBeginnerNote('quick-sort')).toContain('基准');
    expect(getBeginnerNote('bfs')).toContain('队列');
    expect(getBeginnerNote('nope')).toBeNull();
  });

  it('22 个算法中至少 19 个有要点', () => {
    const withNote = allEntries.filter((e) => getBeginnerNote(e.meta.id) !== null);
    expect(withNote.length).toBeGreaterThanOrEqual(19);
  });
});

describe('deriveStepKind 补充分支', () => {
  it('队列：enqueue/dequeue 推导', () => {
    const entry = getAlgorithm('queue')!;
    const steps = collectSteps(entry.run(entry.defaultInput));
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds.length).toBeGreaterThan(0);
  });

  it('N 皇后：尝试放置推导', () => {
    const steps = stepsOf('n-queens');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('try-place');
  });

  it('树遍历：输出步骤推导', () => {
    const entry = getAlgorithm('tree-traversal')!;
    const steps = collectSteps(entry.run(entry.defaultInput));
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('tree-output');
  });

  it('阶乘：调用与返回', () => {
    const steps = stepsOf('factorial');
    const kinds = steps.map((s, i) => deriveStepKind(s, i > 0 ? steps[i - 1] : null));
    expect(kinds).toContain('call');
    expect(kinds).toContain('return');
  });
});

describe('explainStepBeginner 补充分支', () => {
  it('二分查找 mid 步：解释区间收缩', () => {
    const steps = stepsOf('binary-search');
    const idx = steps.findIndex((s) => s.frame.kind === 'array' && s.frame.pointers.mid !== undefined);
    expect(idx).toBeGreaterThanOrEqual(0);
    const ex = explainStepBeginner(steps[idx]!, idx > 0 ? steps[idx - 1] : null);
    expect(ex).toContain('mid');
    expect(ex).toContain('区间');
  });

  it('队列出队：解释 FIFO', () => {
    const entry = getAlgorithm('queue')!;
    const steps = collectSteps(entry.run({ type: 'linear', structure: 'queue', initial: ['a', 'b'], operation: { op: 'dequeue' } }));
    const exs = steps.map((s, i) => explainStepBeginner(s, i > 0 ? steps[i - 1] : null));
    expect(exs.some((e) => e !== null && e.includes('队'))).toBe(true);
  });

  it('N 皇后冲突步：解释回溯', () => {
    const steps = stepsOf('n-queens');
    const exs = steps.map((s, i) => explainStepBeginner(s, i > 0 ? steps[i - 1] : null));
    expect(exs.some((e) => e !== null && (e.includes('冲突') || e.includes('回退')))).toBe(true);
  });

  it('BST 下降步：解释左右子树规则', () => {
    const entry = getAlgorithm('bst-operations')!;
    const steps = collectSteps(entry.run({ type: 'bst', startTree: [8, 3, 10], operation: { op: 'search', value: 10 } }));
    const exs = steps.map((s, i) => explainStepBeginner(s, i > 0 ? steps[i - 1] : null));
    expect(exs.some((e) => e !== null && e.includes('左子树'))).toBe(true);
  });

  it('树遍历输出步：解释遍历顺序', () => {
    const entry = getAlgorithm('tree-traversal')!;
    const steps = collectSteps(entry.run(entry.defaultInput));
    const exs = steps.map((s, i) => explainStepBeginner(s, i > 0 ? steps[i - 1] : null));
    expect(exs.some((e) => e !== null && e.includes('输出序列'))).toBe(true);
  });
});
