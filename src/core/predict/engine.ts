/**
 * Predict Next Step 出题引擎（P11 semantic-first）：
 * 优先读取 steps[index+1].semantic 构造题目——正确答案直接取自语义 payload，
 * 结构上与算法行为强绑定；semantic 缺失时回退 frame-diff 兼容路径。
 * 禁止 AI、禁止 Math.random；干扰项从当前帧/上下文的合法候选确定性构造；
 * 候选不足时返回 null（播放不暂停）。
 * 详见 docs/PREDICT_SPEC.md 与 docs/SEMANTIC_STEP_SPEC.md §4。
 */
import { isArrayFrame, isDPFrame, isGraphFrame, isRecursionFrame, isStructureFrame, isTreeFrame } from '../step/frame';
import type { VizStep } from '../step/step';
import type { StepSemantic } from '../step/semantic';

export interface PredictQuestion {
  /** 题目类型标识 */
  kind: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  /** 判分后展示：引用真实下一步 */
  explanation: string;
  /** 语义类型（评分记录用；semantic 缺失时为 frame-diff 推导结果） */
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

// ---------------------------------------------------------------------------
// semantic-first：按下一步的 StepSemantic 出题（答案 = 语义 payload 的真实值）
// ---------------------------------------------------------------------------

function semanticQuestion(cur: VizStep, next: VizStep, s: StepSemantic): PredictQuestion | null {
  const baseExplain = `真实下一步：${next.description}`;
  switch (s.type) {
    case 'compare': {
      if (s.purpose === 'binary-mid') {
        // 下一个 mid（由 range-narrow 之后紧跟的 compare 步骤出 mid 数值题）
        const f = next.frame;
        if (!isArrayFrame(f) || f.pointers.mid === undefined) return null;
        const mid = f.pointers.mid;
        const c = cur.frame;
        const cf = isArrayFrame(c) ? c : null;
        const distractors: string[] = [];
        if (cf?.pointers.mid !== undefined) distractors.push(String(cf.pointers.mid));
        distractors.push(String(mid + 1), String(Math.max(0, mid - 1)), String(f.values.length - 1), '0');
        return buildOptions(
          String(mid),
          distractors,
          'next-mid',
          `当前区间内下一步的中点 mid 将是多少？`,
          baseExplain,
          'compare',
        );
      }
      if (s.purpose === 'linear-scan') {
        const a = s.indices[0]!;
        const cf = isArrayFrame(cur.frame) ? cur.frame : null;
        const len = cf ? cf.values.length : a + 3;
        const distractors = [String(Math.max(0, a - 1)), String(Math.min(len - 1, a + 1)), String(Math.floor(len / 2))];
        return buildOptions(
          String(a),
          distractors,
          'next-compare',
          `下一步将检查哪个下标（与目标值比较）？`,
          baseExplain,
          'compare',
        );
      }
      if (s.purpose === 'quick-scan') {
        // 快排扫描：聚焦「检查哪个下标」（pivot 位置已知），与 v1.1.0 题型一致
        const a = s.indices[0]!;
        const h = s.indices[1]!;
        const cf = isArrayFrame(cur.frame) ? cur.frame : null;
        const len = cf ? cf.values.length : a + 3;
        const distractors = [String(Math.max(0, a - 1)), String(Math.min(len - 1, a + 1)), String(h)];
        return buildOptions(
          String(a),
          distractors,
          'next-compare',
          `下一步将检查哪个下标的元素（与 pivot=${s.values[1]} 比较）？`,
          baseExplain,
          'compare',
        );
      }
      if (s.indices.length === 2) {
        const [a, b] = s.indices as [number, number];
        const cf = isArrayFrame(cur.frame) ? cur.frame : null;
        const len = cf ? cf.values.length : Math.max(a, b) + 2;
        const ci = cf && cf.comparing.length === 2 ? (cf.comparing as [number, number]) : undefined;
        const distractors: string[] = ci ? [pairLabel(ci[0], ci[1])] : [];
        distractors.push(pairLabel(Math.max(0, a - 1), a), pairLabel(b, Math.min(len - 1, b + 1)), pairLabel(0, 1));
        return buildOptions(pairLabel(a, b), distractors, 'next-compare', '下一步将比较哪两个位置的元素？', baseExplain, 'compare');
      }
      // 单元素比较（快排扫描 / 插入）
      const a = s.indices[0]!;
      const cf = isArrayFrame(cur.frame) ? cur.frame : null;
      const len = cf ? cf.values.length : a + 3;
      const distractors = [String(Math.max(0, a - 1)), String(Math.min(len - 1, a + 1)), String(Math.floor(len / 2))];
      return buildOptions(String(a), distractors, 'next-compare', `下一步将检查哪个下标的元素？`, baseExplain, 'compare');
    }
    case 'swap': {
      const [a, b] = s.indices;
      const cf = isArrayFrame(cur.frame) ? cur.frame : null;
      const len = cf ? cf.values.length : Math.max(a, b) + 2;
      const ci = cf && cf.comparing.length === 2 ? (cf.comparing as [number, number]) : undefined;
      const distractors: string[] = ci ? [pairLabel(ci[0], ci[1])] : [];
      distractors.push(pairLabel(Math.max(0, a - 1), a), pairLabel(b, Math.min(len - 1, b + 1)), pairLabel(0, 1));
      return buildOptions(pairLabel(a, b), distractors, 'next-swap', '下一步将交换哪两个位置的元素？', baseExplain, 'swap');
    }
    case 'range-narrow': {
      const newValue = s.side === 'right' ? s.to[0] : s.to[1]; // lo ← mid+1 或 hi ← mid-1
      const distractors = [String(s.from[0]), String(s.from[1]), String(s.to[0]), String(s.to[1])];
      return buildOptions(
        String(newValue),
        distractors,
        'next-range-narrow',
        `目标只可能在${s.side === 'right' ? '右半' : '左半'}，${s.side === 'right' ? 'lo' : 'hi'} 将更新为多少？`,
        baseExplain,
        'compare',
      );
    }
    case 'push':
    case 'enqueue': {
      const cf = isStructureFrame(cur.frame) ? cur.frame : null;
      const distractors = cf ? cf.nodes.map((n) => n.value) : [];
      return buildOptions(
        s.value,
        [...distractors, `${s.value}x`],
        s.type === 'push' ? 'next-push' : 'next-enqueue',
        `下一个${s.type === 'push' ? '入栈' : '入队'}的元素是什么？`,
        baseExplain,
        s.type,
      );
    }
    case 'pop':
    case 'dequeue': {
      const cf = isStructureFrame(cur.frame) ? cur.frame : null;
      if (!cf || cf.nodes.length === 0 || s.value === null) return null;
      const isStack = cf.layout === 'stack';
      const leaving = isStack ? cf.nodes[cf.nodes.length - 1] : cf.nodes[0];
      if (!leaving || leaving.value !== s.value) return null; // 语义与帧不一致时放弃（防御）
      const distractors = cf.nodes.filter((x) => x.id !== leaving.id).map((x) => x.value);
      return buildOptions(
        s.value,
        distractors,
        s.type === 'pop' ? 'next-pop' : 'next-dequeue',
        s.type === 'pop' ? '下一个出栈（弹出栈顶）的元素是什么？' : '下一个出队（离开队头）的元素是什么？',
        baseExplain,
        s.type,
      );
    }
    case 'tree-descend': {
      const cf = isTreeFrame(cur.frame) ? cur.frame : null;
      if (!cf) return null;
      const distractors = cf.nodes
        .filter((x) => x.value !== s.nodeValue)
        .sort((a, b) => Math.abs(a.value - s.nodeValue) - Math.abs(b.value - s.nodeValue))
        .map((x) => String(x.value));
      const current = cf.nodes.find((x) => x.state === 'active');
      return buildOptions(
        String(s.nodeValue),
        distractors,
        'next-tree-node',
        current ? `BST 下降：当前在节点 ${current.value}。下一步将走到哪个节点？` : '下一步将走到哪个节点？',
        baseExplain,
        'tree-descend',
      );
    }
    case 'tree-output': {
      const cf = isTreeFrame(cur.frame) ? cur.frame : null;
      if (!cf) return null;
      const distractors = cf.nodes
        .filter((x) => x.value !== s.value)
        .sort((a, b) => Math.abs(a.value - s.value) - Math.abs(b.value - s.value))
        .map((x) => String(x.value));
      return buildOptions(String(s.value), distractors, 'next-tree-output', '下一个加入输出序列的值是？', baseExplain, 'tree-output');
    }
    case 'visit-node': {
      const cf = isGraphFrame(cur.frame) ? cur.frame : null;
      if (!cf) return null;
      const distractors = cf.frontier.filter((x) => x.id !== s.nodeId).map((x) => x.id);
      distractors.push(...cf.nodes.filter((x) => x.id !== s.nodeId).map((x) => x.id));
      return buildOptions(
        s.nodeId,
        distractors,
        'next-visit',
        s.algorithm === 'bfs' ? `BFS 使用队列：下一个被访问的节点将是哪个？` : `DFS 使用栈：下一个被访问的节点将是哪个？`,
        baseExplain,
        'visit',
      );
    }
    case 'frontier-add': {
      const cf = isGraphFrame(cur.frame) ? cur.frame : null;
      if (!cf) return null;
      const first = s.nodeIds[0]!;
      const others = cf.nodes.map((m) => m.id).filter((id) => !s.nodeIds.includes(id));
      return buildOptions(first, others, 'next-frontier-add', `下一个被加入等待区的节点是哪个？`, baseExplain, 'frontier-add');
    }
    case 'graph-relax': {
      const cf = isGraphFrame(cur.frame) ? cur.frame : null;
      const oldLabel = s.oldDistance === null ? '∞' : String(s.oldDistance);
      const distractors: string[] = cf
        ? cf.nodes.filter((m) => m.id !== s.to && m.distance !== null).map((m) => String(m.distance))
        : [];
      distractors.push(oldLabel, '∞', '0', String(s.newDistance + 1));
      return buildOptions(
        String(s.newDistance),
        distractors,
        'next-relax',
        `正在松弛边 ${s.from}→${s.to}：dist[${s.to}] 将更新为多少？（当前为 ${oldLabel}）`,
        baseExplain,
        'relax',
      );
    }
    case 'graph-finalize': {
      const cf = isGraphFrame(cur.frame) ? cur.frame : null;
      if (!cf) return null;
      const distractors = cf.nodes.filter((m) => m.id !== s.nodeId).map((m) => m.id);
      return buildOptions(
        s.nodeId,
        distractors,
        'next-finalize',
        `Dijkstra 将「定型」哪个节点（未确定集中距离最小者）？`,
        baseExplain,
        'visit',
      );
    }
    case 'dp-fill': {
      const distractors: string[] = [];
      const cf = isDPFrame(cur.frame) ? cur.frame : null;
      if (cf) {
        for (const i of s.dependencies) distractors.push(String(cf.cells[i] ?? 0));
      }
      distractors.push('0', String(s.value + 1), String(Math.max(0, s.value - 1)));
      return buildOptions(String(s.value), distractors, 'next-dp-cell', `下一个将填入的格子值是多少？`, baseExplain, 'fill');
    }
    case 'call': {
      const cf = isRecursionFrame(cur.frame) ? cur.frame : null;
      const distractors = cf ? cf.callStack.map((f) => f.label) : [];
      // label 模式 fact(k)/fib(k)：数字 ±1 与基准构造确定性干扰
      distractors.push(
        s.label.replace(/\d+/g, (m) => String(Math.max(1, Number(m) - 1))),
        s.label.replace(/\d+/g, (m) => String(Number(m) + 1)),
        s.label.replace(/\d+/g, '1'),
      );
      return buildOptions(s.label, distractors, 'next-call', '下一个发生的函数调用是？', baseExplain, 'call');
    }
    // 以下类型不适合出预测题（结果性/过程性/选项不足），回退 frame-diff 或不出题
    case 'write':
    case 'pivot-select':
    case 'found':
    case 'not-found':
    case 'peek':
    case 'front':
    case 'list-node-create':
    case 'list-visit':
    case 'list-insert':
    case 'list-delete':
    case 'list-compare':
    case 'tree-insert-place':
    case 'tree-delete':
    case 'tree-enqueue':
    case 'graph-examine':
    case 'return':
    case 'move':
    case 'try-place':
    case 'place':
    case 'remove':
    case 'backtrack':
    case 'solution-found':
      return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// frame-diff 兼容路径（semantic 缺失时的回退，与 v1.1.0 行为一致）
// ---------------------------------------------------------------------------

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
    const [a, b] = n.swapping as [number, number];
    const [ci, cj] = c.comparing.length === 2 ? (c.comparing as [number, number]) : (c.swapping as [number, number]);
    const distractors: string[] = [];
    if (ci !== undefined && cj !== undefined) distractors.push(pairLabel(ci, cj));
    distractors.push(pairLabel(Math.max(0, a - 1), a), pairLabel(b, Math.min(len - 1, b + 1)), pairLabel(0, 1));
    return buildOptions(pairLabel(a, b), distractors, 'next-swap', '下一步将交换哪两个位置的元素？', baseExplain, 'swap');
  }

  // 下一个比较
  if (n.comparing.length === 2) {
    const [a, b] = n.comparing as [number, number];
    const [ci, cj] = c.comparing.length === 2 ? (c.comparing as [number, number]) : (c.swapping as [number, number]);
    const distractors: string[] = [];
    if (ci !== undefined && cj !== undefined) distractors.push(pairLabel(ci, cj));
    distractors.push(pairLabel(Math.max(0, a - 1), a), pairLabel(b, Math.min(len - 1, b + 1)), pairLabel(0, 1));
    return buildOptions(pairLabel(a, b), distractors, 'next-compare', '下一步将比较哪一对元素？', baseExplain, 'compare');
  }

  // 下一个与 pivot 的单元素比较（快排）
  if (n.comparing.length === 1 && c.pivot !== null) {
    const a = n.comparing[0]!;
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
    const a = n.comparing[0]!;
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
    const distractors = c.frontier.filter((x) => x.id !== c.current && x.id !== n.current).map((x) => x.id);
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

  // 松弛：某个节点距离被更新（兼容路径：无法确知目标时跳过，避免出错误题）
  const changed = n.nodes.filter((nn) => {
    const cc = c.nodes.find((m) => m.id === nn.id);
    return cc !== undefined && (cc.distance !== nn.distance || cc.predecessor !== nn.predecessor);
  });
  if (changed.length === 1) {
    const t = changed[0]!;
    const cc = c.nodes.find((m) => m.id === t.id);
    const oldLabel = cc?.distance === null || cc?.distance === undefined ? '∞' : String(cc.distance);
    const distractors = c.nodes.filter((m) => m.id !== t.id && m.distance !== null).map((m) => String(m.distance));
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
      return buildOptions(newIds[0]!, others, 'next-frontier-add', `下一个被加入${container}的节点是哪个？`, baseExplain, 'frontier-add');
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
    current ? `BST 下降：当前在节点 ${current.value}。下一步将走到哪个节点？` : '下一步将走到哪个节点？',
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
  return buildOptions(String(val), distractors, 'next-dp-cell', `下一个将填入的格子值是多少？`, `真实下一步：${next.description}`, 'fill');
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
  return buildOptions(top.label, distractors, 'next-call', '下一个发生的函数调用是？', `真实下一步：${next.description}`, 'call');
}

/**
 * 出题入口：基于 steps[index]（当前）与 steps[index+1]（真实下一步）生成题目。
 * semantic-first：优先用下一步的 semantic payload 出题；返回 null 表示该步不适合出题。
 */
export function generatePredictQuestion(steps: VizStep[], index: number): PredictQuestion | null {
  if (index < 0 || index + 1 >= steps.length) return null;
  const cur = steps[index];
  const next = steps[index + 1];
  if (!cur || !next) return null;
  if (next.semantic !== undefined) {
    const q = semanticQuestion(cur, next, next.semantic);
    if (q !== null) return q;
    // semantic 类型不适合出题时，仍可尝试 frame-diff 出题（如 insertion write）
  }
  return (
    predictArray(cur, next) ??
    predictGraph(cur, next) ??
    predictStructure(cur, next) ??
    predictTree(cur, next) ??
    predictDP(cur, next) ??
    predictRecursion(cur, next)
  );
}

/** 判分 */
export function gradePredict(question: PredictQuestion, selectedIndex: number): boolean {
  return selectedIndex === question.answerIndex;
}
