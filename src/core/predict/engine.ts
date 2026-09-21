/**
 * Predict Next Step 出题引擎：基于 cur/next 两步的 frame diff 确定性出题。
 * 禁止 AI、禁止 Math.random；干扰项从当前帧的候选值确定性构造；
 * 候选不足或步骤不适合出题时返回 null（播放不暂停）。
 * 正确答案永远取自真实 steps[index+1]，结构上不可能与算法行为冲突。
 * 详见 docs/PREDICT_SPEC.md。
 */
import { isArrayFrame, isDPFrame, isGraphFrame, isRecursionFrame, isStructureFrame, isTreeFrame } from '../step/frame';
import type { VizStep } from '../step/step';

export interface PredictQuestion {
  /** 题目类型标识 */
  kind: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  /** 判分后展示：引用真实下一步 */
  explanation: string;
  /** deriveStepKind 结果（评分记录用） */
  stepType: string;
}

/** 组装选项：正确答案 + 去重干扰项，不足 3 项返回 null；按确定性轮换放置答案 */
function buildOptions(
  correct: string,
  distractors: string[],
  kind: string,
  prompt: string,
  explanation: string,
  stepType: string,
): PredictQuestion | null {
  const pool = [correct];
  for (const d of distractors) {
    if (pool.length >= 4) break;
    if (d !== correct && !pool.includes(d)) pool.push(d);
  }
  if (pool.length < 3) return null;
  const pos = correct.length % pool.length; // 确定性轮换，避免答案总在首位
  const options = [...pool.slice(pos), ...pool.slice(0, pos)];
  return { kind, prompt, options, answerIndex: options.indexOf(correct), explanation, stepType };
}

function pairLabel(a: number, b: number): string {
  return `a[${a}] 与 a[${b}]`;
}

/** 数组帧：下一个比较/交换对；mid 数值；命中位置 */
function predictArray(cur: VizStep, next: VizStep): PredictQuestion | null {
  const c = cur.frame;
  const n = next.frame;
  if (!isArrayFrame(c) || !isArrayFrame(n)) return null;
  const len = c.values.length;
  const baseExplain = `真实下一步：${next.description}`;

  // 二分：下一个 mid
  if (n.pointers.mid !== undefined && n.range !== null && c.range !== null) {
    const mid = n.pointers.mid;
    const [lo, hi] = n.range;
    const distractors: string[] = [];
    if (c.pointers.mid !== undefined) distractors.push(String(c.pointers.mid));
    distractors.push(String(Math.min(hi, mid + 1)), String(Math.max(lo, mid - 1)), String(hi), String(lo));
    return buildOptions(
      String(mid),
      distractors,
      'next-mid',
      `当前区间 [${c.range[0]}..${c.range[1]}] 中点为 ${c.pointers.mid}。下一步的 mid 将是多少？`,
      baseExplain,
      'compare',
    );
  }

  // 下一个交换
  if (n.swapping.length === 2) {
    const [a, b] = n.swapping;
    const [ci, cj] = c.comparing.length === 2 ? c.comparing : c.swapping;
    const distractors: string[] = [];
    if (ci !== undefined && cj !== undefined) distractors.push(pairLabel(ci, cj));
    distractors.push(
      pairLabel(Math.max(0, a - 1), a),
      pairLabel(b, Math.min(len - 1, b + 1)),
      pairLabel(0, 1),
    );
    return buildOptions(
      pairLabel(a, b),
      distractors,
      'next-swap',
      '下一步将交换哪两个位置的元素？',
      baseExplain,
      'swap',
    );
  }

  // 下一个比较
  if (n.comparing.length === 2) {
    const [a, b] = n.comparing;
    const [ci, cj] = c.comparing.length === 2 ? c.comparing : c.swapping;
    const distractors: string[] = [];
    if (ci !== undefined && cj !== undefined) distractors.push(pairLabel(ci, cj));
    distractors.push(
      pairLabel(Math.max(0, a - 1), a),
      pairLabel(b, Math.min(len - 1, b + 1)),
      pairLabel(0, 1),
    );
    return buildOptions(
      pairLabel(a, b),
      distractors,
      'next-compare',
      '下一步将比较哪一对元素？',
      baseExplain,
      'compare',
    );
  }

  // 下一个与 pivot 的单元素比较（快排）
  if (n.comparing.length === 1 && c.pivot !== null) {
    const a = n.comparing[0];
    const distractors = [String(Math.max(0, a - 1)), String(Math.min(len - 1, a + 1)), String(n.pivot)];
    return buildOptions(
      String(a),
      distractors,
      'next-compare',
      `下一步将检查哪个下标的元素（与 pivot=${c.values[c.pivot]} 比较）？`,
      baseExplain,
      'compare',
    );
  }

  // 线性查找：下一个检查的下标
  if (n.comparing.length === 1 && n.target !== null && c.target !== null) {
    const a = n.comparing[0];
    const distractors = [String(Math.max(0, a - 1)), String(Math.min(len - 1, a + 1)), String(Math.floor(len / 2))];
    return buildOptions(
      String(a),
      distractors,
      'next-compare',
      `下一步将检查哪个下标（与目标值 ${n.target} 比较）？`,
      baseExplain,
      'compare',
    );
  }
  return null;
}

/** 图帧：下一个访问节点 / 松弛目标 */
function predictGraph(cur: VizStep, next: VizStep): PredictQuestion | null {
  const c = cur.frame;
  const n = next.frame;
  if (!isGraphFrame(c) || !isGraphFrame(n)) return null;
  const baseExplain = `真实下一步：${next.description}`;
  const container = c.frontierKind === 'queue' ? '队列' : c.frontierKind === 'stack' ? '栈' : '候选集';

  if (n.current !== null && c.current !== n.current) {
    const distractors = c.frontier
      .filter((x) => x.id !== c.current && x.id !== n.current)
      .map((x) => x.id);
    distractors.push(...c.nodes.filter((x) => x.id !== n.current && x.id !== c.current).map((x) => x.id));
    return buildOptions(
      n.current,
      distractors,
      'next-visit',
      c.frontierKind === 'queue'
        ? `BFS 使用队列：下一个被访问的节点将是哪个？`
        : c.frontierKind === 'stack'
          ? `DFS 使用栈：下一个被访问的节点将是哪个？`
          : `下一个被访问的节点将是哪个？`,
      baseExplain,
      'visit',
    );
  }

  // 松弛：某个节点距离被更新
  const changed = n.nodes.filter((nn) => {
    const cc = c.nodes.find((m) => m.id === nn.id);
    return cc !== undefined && (cc.distance !== nn.distance || cc.predecessor !== nn.predecessor);
  });
  if (changed.length > 0) {
    const t = changed[changed.length - 1];
    const cc = c.nodes.find((m) => m.id === t.id);
    const oldLabel = cc?.distance === null || cc?.distance === undefined ? '∞' : String(cc.distance);
    const distractors = c.nodes
      .filter((m) => m.id !== t.id && m.distance !== null)
      .map((m) => String(m.distance));
    distractors.push(oldLabel, '∞', '0');
    return buildOptions(
      String(t.distance),
      distractors,
      'next-relax',
      `正在松弛节点 ${t.id} 的出边：dist[${t.id}] 将更新为多少？（当前为 ${oldLabel}）`,
      baseExplain,
      'relax',
    );
  }

  // frontier 增加：下一个入队的节点
  if (n.frontier.length > c.frontier.length) {
    const newIds = n.frontier.filter((x) => !c.frontier.some((y) => y.id === x.id)).map((x) => x.id);
    if (newIds.length > 0) {
      const others = c.nodes.map((m) => m.id).filter((id) => !newIds.includes(id));
      return buildOptions(
        newIds[0],
        others,
        'next-frontier-add',
        `下一个被加入${container}的节点是哪个？`,
        baseExplain,
        'frontier-add',
      );
    }
  }
  return null;
}

/** 结构帧：下一个 push/pop/enqueue/dequeue 的元素 */
function predictStructure(cur: VizStep, next: VizStep): PredictQuestion | null {
  const c = cur.frame;
  const n = next.frame;
  if (!isStructureFrame(c) || !isStructureFrame(n)) return null;
  const baseExplain = `真实下一步：${next.description}`;
  const isStack = c.layout === 'stack';
  const noun = isStack ? '栈' : '队列';

  if (n.nodes.length === c.nodes.length + 1) {
    const added = n.nodes[n.nodes.length - 1];
    if (!added) return null;
    const distractors = c.nodes.map((x) => x.value);
    return buildOptions(
      added.value,
      distractors,
      isStack ? 'next-push' : 'next-enqueue',
      `下一个${isStack ? '入栈' : '入队'}的元素是什么？`,
      baseExplain,
      isStack ? 'push' : 'enqueue',
    );
  }
  if (n.nodes.length === c.nodes.length - 1 && c.nodes.length > 0) {
    const leaving = isStack ? c.nodes[c.nodes.length - 1] : c.nodes[0];
    if (!leaving) return null;
    const distractors = c.nodes.filter((x) => x.id !== leaving.id).map((x) => x.value);
    return buildOptions(
      leaving.value,
      distractors,
      isStack ? 'next-pop' : 'next-dequeue',
      isStack ? '下一个出栈（弹出栈顶）的元素是什么？' : '下一个出队（离开队头）的元素是什么？',
      baseExplain,
      isStack ? 'pop' : 'dequeue',
    );
  }
  void noun;
  return null;
}

/** 树帧：下一步走到哪个节点 */
function predictTree(cur: VizStep, next: VizStep): PredictQuestion | null {
  const c = cur.frame;
  const n = next.frame;
  if (!isTreeFrame(c) || !isTreeFrame(n)) return null;
  const newlyActive = n.nodes.find(
    (m) => m.state === 'active' && !c.nodes.some((x) => x.id === m.id && x.state === 'active'),
  );
  if (!newlyActive) return null;
  const distractors = c.nodes
    .filter((x) => x.id !== newlyActive.id)
    .sort((a, b) => Math.abs(a.value - newlyActive.value) - Math.abs(b.value - newlyActive.value))
    .map((x) => String(x.value));
  const current = c.nodes.find((x) => x.state === 'active');
  return buildOptions(
    String(newlyActive.value),
    distractors,
    'next-tree-node',
    current
      ? `BST 下降：当前在节点 ${current.value}。下一步将走到哪个节点？`
      : '下一步将走到哪个节点？',
    `真实下一步：${next.description}`,
    'tree-descend',
  );
}

/** DP 帧：下一格的值 */
function predictDP(cur: VizStep, next: VizStep): PredictQuestion | null {
  const c = cur.frame;
  const n = next.frame;
  if (!isDPFrame(c) || !isDPFrame(n)) return null;
  if (n.current === null || n.current === c.current) return null;
  const val = n.cells[n.current];
  if (val === null || val === undefined) return null;
  const distractors = n.dependencies.map((i) => String(n.cells[i] ?? 0));
  distractors.push('0', String(val + 1));
  return buildOptions(
    String(val),
    distractors,
    'next-dp-cell',
    `下一个将填入的格子值是多少？`,
    `真实下一步：${next.description}`,
    'fill',
  );
}

/** 递归帧：下一个发生的调用 */
function predictRecursion(cur: VizStep, next: VizStep): PredictQuestion | null {
  const c = cur.frame;
  const n = next.frame;
  if (!isRecursionFrame(c) || !isRecursionFrame(n)) return null;
  if (n.callStack.length !== c.callStack.length + 1) return null;
  const top = n.callStack[n.callStack.length - 1];
  if (!top) return null;
  const distractors = c.callStack.map((f) => f.label);
  return buildOptions(
    top.label,
    distractors,
    'next-call',
    '下一个发生的函数调用是？',
    `真实下一步：${next.description}`,
    'call',
  );
}

/**
 * 出题入口：基于 steps[index]（当前）与 steps[index+1]（真实下一步）生成题目。
 * 返回 null 表示该步不适合出题。
 */
export function generatePredictQuestion(steps: VizStep[], index: number): PredictQuestion | null {
  if (index < 0 || index + 1 >= steps.length) return null;
  const cur = steps[index];
  const next = steps[index + 1];
  // 出题与否由各帧分支根据 next 的真实变化决定；每题自带语义 stepType
  const q =
    predictArray(cur, next) ??
    predictGraph(cur, next) ??
    predictStructure(cur, next) ??
    predictTree(cur, next) ??
    predictDP(cur, next) ??
    predictRecursion(cur, next);
  return q;
}

/** 判分 */
export function gradePredict(question: PredictQuestion, selectedIndex: number): boolean {
  return selectedIndex === question.answerIndex;
}
