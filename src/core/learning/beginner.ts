/**
 * Beginner Mode 逐步详解引擎：纯函数、确定性、本地生成（不调用 AI、无随机）。
 * 输入 = 当前步与上一步的 Frame 语义字段（frame-diff），输出 = 中文详解或 null（无可详解内容）。
 * 另附每算法静态初学者要点（beginnerNotes，集中管理）。
 * 详见 docs/LEARNING_EXPERIENCE_SPEC.md §5。
 */
import type { DPFrame, GraphFrame, NQueensFrame, RecursionFrame, StructureFrame } from '../step/frame';
import { isArrayFrame, isDPFrame, isGraphFrame, isNQueensFrame, isRecursionFrame, isStructureFrame, isTreeFrame } from '../step/frame';
import type { Frame } from '../step/frame';
import type { VizStep } from '../step/step';

/** 步骤语义类型（由帧字段推导） */
export type StepKind =
  | 'init'
  | 'compare'
  | 'swap'
  | 'pivot-set'
  | 'found'
  | 'pointer-move'
  | 'visit'
  | 'frontier-add'
  | 'relax'
  | 'push'
  | 'pop'
  | 'enqueue'
  | 'dequeue'
  | 'peek'
  | 'tree-descend'
  | 'tree-output'
  | 'fill'
  | 'call'
  | 'return'
  | 'move'
  | 'try-place'
  | 'none';

/** 从当前步与上一步推导步骤语义类型（确定性；识别不了返回 none） */
export function deriveStepKind(cur: VizStep, prev: VizStep | null): StepKind {
  return deriveFrameKind(cur.frame, prev?.frame ?? null);
}

function deriveFrameKind(cur: Frame, prev: Frame | null): StepKind {
  if (isArrayFrame(cur)) {
    if (cur.found !== null) return 'found';
    if (cur.swapping.length > 0) return 'swap';
    if (cur.pivot !== null && prev !== null && isArrayFrame(prev) && prev.pivot === null) return 'pivot-set';
    if (cur.comparing.length > 0) {
      if (cur.pointers.mid !== undefined) return 'compare'; // 二分的 mid 步骤也是比较
      return 'compare';
    }
    if (Object.keys(cur.pointers).length > 0 && prev !== null && isArrayFrame(prev)) return 'pointer-move';
    return 'init';
  }
  if (isGraphFrame(cur)) {
    const p = prev !== null && isGraphFrame(prev) ? prev : null;
    if (p === null) return 'init';
    if (cur.current !== null && p.current !== cur.current) return 'visit';
    const distChanged = cur.nodes.some((n) => {
      const q = p.nodes.find((m) => m.id === n.id);
      return q !== undefined && (q.distance !== n.distance || q.predecessor !== n.predecessor);
    });
    if (distChanged) return 'relax';
    if (cur.frontier.length > p.frontier.length) return 'frontier-add';
    if (cur.current !== null) return 'visit';
    return 'none';
  }
  if (isStructureFrame(cur)) {
    const p = prev !== null && isStructureFrame(prev) ? prev : null;
    const len = cur.nodes.length;
    const pLen = p?.nodes.length ?? len;
    const lastAdded = p !== null && len === pLen + 1;
    const lastRemoved = p !== null && len === pLen - 1;
    if (cur.layout === 'stack') {
      if (lastAdded) return 'push';
      if (lastRemoved) return 'pop';
      if (len > 0 && p !== null && cur.nodes[len - 1]?.state === 'active') return 'peek';
      return 'none';
    }
    // queue
    if (lastAdded) return 'enqueue';
    if (lastRemoved) return 'dequeue';
    if (len > 0 && p !== null && cur.nodes[0]?.state === 'active' && cur.nodes[0]?.id === p.nodes[0]?.id) return 'peek';
    return 'none';
  }
  if (isTreeFrame(cur)) {
    const p = prev !== null && isTreeFrame(prev) ? prev : null;
    if (p !== null && cur.output.length > p.output.length) return 'tree-output';
    // BST 下行：当前节点以 active 状态高亮（highlight 字段恒空）
    const becameActive =
      p === null
        ? cur.nodes.some((n) => n.state === 'active')
        : cur.nodes.some((n) => n.state === 'active' && !p.nodes.some((m) => m.id === n.id && m.state === 'active'));
    if (cur.highlight.length > 0 || becameActive) return 'tree-descend';
    return 'none';
  }
  if (isRecursionFrame(cur)) {
    const p = prev !== null && isRecursionFrame(prev) ? prev : null;
    if (cur.lastMove !== null && (p === null || p.lastMove !== cur.lastMove)) return 'move';
    if (p === null) return 'init';
    if (cur.callStack.length > p.callStack.length) return 'call';
    if (cur.callStack.length < p.callStack.length) return 'return';
    return 'none';
  }
  if (isDPFrame(cur)) {
    if (cur.current !== null) return 'fill';
    return 'init';
  }
  if (isNQueensFrame(cur)) {
    return 'try-place';
  }
  return 'none';
}

// ---------------------------------------------------------------------------
// 逐步详解：按帧类型 + 步骤语义生成包含具体值的解释
// ---------------------------------------------------------------------------

function explainArray(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame;
  if (!isArrayFrame(f)) return null;
  const at = (i: number) => `a[${i}]=${f.values[i]}`;
  switch (kind) {
    case 'compare': {
      const [i, j] = f.comparing;
      if (i === undefined) return null;
      if (j === undefined && f.pivot !== null) {
        // 单元素比较：与 pivot 对照（如快排扫描）
        const pv = f.values[f.pivot];
        const desc =
          f.values[i] < pv
            ? `${f.values[i]} 小于基准值 ${pv}，它属于基准左侧区域。`
            : `${f.values[i]} 不小于基准值 ${pv}，它继续留在右侧候选区域。`;
        return [
          `正在检查 ${at(i)}。`,
          `基准值 pivot 是当前分区选定的 ${at(f.pivot)}=${pv}（本算法取区间末元素）。`,
          desc,
        ].join('');
      }
      if (j === undefined) return null;
      if (f.pointers.mid !== undefined) {
        const mid = f.pointers.mid;
        const lo = f.pointers.lo;
        const hi = f.pointers.hi;
        return [
          `当前搜索区间是 [${lo}..${hi}]，中点 mid = ⌊(${lo}+${hi})/2⌋ = ${mid}。`,
          `正在拿中间元素 ${at(mid)} 与目标值 ${f.target} 比较。`,
          `数组是有序的，所以：如果中间元素偏小，目标只可能在右半区间；偏大则在左半区间；相等则找到了。每次比较都把范围缩小一半。`,
        ].join('');
      }
      if (f.pivot !== null) {
        const pv = f.values[f.pivot];
        const desc =
          f.values[i] < pv
            ? `${f.values[i]} 小于基准值 ${pv}，它属于基准左侧区域。`
            : `${f.values[i]} 不小于基准值 ${pv}，它继续留在右侧候选区域。`;
        return [
          `正在检查 ${at(i)}。`,
          `基准值 pivot 是当前分区选定的 ${at(f.pivot)}=${pv}（本算法取区间末元素）。`,
          desc,
        ].join('');
      }
      const desc =
        f.values[i] > f.values[j]
          ? `前者更大，违反了「小的在前」的升序要求，接下来会把它们交换。`
          : `前者不大于后者，顺序正确，不需要交换。`;
      return [`正在比较相邻的 ${at(i)} 与 ${at(j)}。`, desc].join('');
    }
    case 'swap': {
      const [i, j] = f.swapping;
      if (i === undefined || j === undefined) return null;
      return [
        `正在交换 ${at(i)} 与 ${at(j)}。`,
        `交换后较小的元素会占据靠前的位置——这就是每一轮「冒泡」出更大元素的方式；数组本身在原地变化，不需要额外空间。`,
      ].join('');
    }
    case 'pivot-set': {
      const pv = f.pivot;
      if (pv === null) return null;
      return [
        `选定基准值 pivot = ${at(pv)}。`,
        `接下来一轮扫描会把小于它的元素都换到它左边、大于它的留在右边，扫描结束后 pivot 会落在它最终的正确位置上。`,
      ].join('');
    }
    case 'found': {
      const i = f.found;
      if (i === null) return null;
      return `${at(i)} 正是目标值 ${f.target}，查找成功！高亮的绿色位置就是答案所在的下标。`;
    }
    default:
      return null;
  }
}

function explainGraph(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame as GraphFrame;
  const container = f.frontierKind === 'queue' ? '队列' : f.frontierKind === 'stack' ? '栈' : '候选集';
  switch (kind) {
    case 'visit': {
      const c = f.current;
      if (c === null) return null;
      const node = f.nodes.find((n) => n.id === c);
      const distPart =
        node && node.distance !== null
          ? `它的当前距离 dist[${c}] = ${node.distance}${node.predecessor ? `，是经前驱 ${node.predecessor} 到达的` : ''}。`
          : '';
      const order =
        f.frontierKind === 'queue'
          ? `BFS 使用${container}：先入队的节点先被访问，因此按「离起点的层数」逐层扩散。`
          : f.frontierKind === 'stack'
            ? `DFS 使用${container}：后入队的节点先被访问，因此沿一条路走到底再回头。`
            : '';
      return [`正在访问节点 ${c}。`, distPart, order].join('');
    }
    case 'frontier-add':
      return `把新发现的邻居放入${container}等待处理（当前${container}：${f.frontier.map((x) => x.id).join('、') || '空'}）。它们会在后续步骤中依次被取出访问。`;
    case 'relax': {
      const changed = f.nodes.filter((n) => n.distance !== null && n.predecessor !== null);
      const target = changed[changed.length - 1];
      if (!target) return null;
      return [
        `发生了「松弛」：经过当前节点中转到 ${target.id} 的路径更短，于是 dist[${target.id}] 更新为 ${target.distance}。`,
        `同时记下前驱 predecessor = ${target.predecessor ?? '—'}，回溯前驱链就能还原最短路径。`,
      ].join('');
    }
    default:
      return null;
  }
}

function explainStructure(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame as StructureFrame;
  const top = f.nodes.length > 0 ? f.nodes[f.nodes.length - 1] : null;
  const front = f.nodes[0] ?? null;
  switch (kind) {
    case 'push':
      return top ? [`${top.value} 入栈：栈只能在顶部（末尾）插入。`, `栈顶 top 现在指向 ${top.value}。这就是 LIFO——后进先出：最后放入的元素最先被取出。`].join('') : null;
    case 'pop':
      return [
        `弹出栈顶元素：出栈的永远是最后放入的那个（LIFO）。`,
        `高亮的 ${top?.value ?? '元素'} 已被移除，top 指针随之移动。`,
      ].join('');
    case 'peek':
      return top ? `查看栈顶：${top.value}（peek 只查看、不移除，栈保持不变）。` : null;
    case 'enqueue':
      return front || top ? [`${f.nodes[f.nodes.length - 1]?.value ?? ''} 入队：新元素只能从队尾进入。`, `队列是 FIFO——先进先出：最先入队的元素最先出队。`].join('') : null;
    case 'dequeue':
      return [
        `出队：只能从队头移除元素。`,
        `高亮的 ${front?.value ?? '元素'} 离开队列——它正是最早入队的那个（FIFO）。`,
      ].join('');
    default:
      return null;
  }
}

function explainTree(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame;
  if (!isTreeFrame(f)) return null;
  const nodeIds = f.highlight;
  const node = f.nodes.find((n) => n.id === nodeIds[nodeIds.length - 1]);
  switch (kind) {
    case 'tree-descend':
      return node
        ? [
            `当前走到节点 ${node.value}。`,
            `BST 的规则：比节点小的去左子树，大的去右子树——每一层比较都会排除一半候选，所以查找非常快。`,
          ].join('')
        : null;
    case 'tree-output':
      return [
        `访问当前节点并把它的值加入输出序列（当前输出：${f.output.join('、') || '空'}）。`,
        `遍历顺序决定了输出序列：前序=根左右，中序=左根右（BST 的中序输出恰好是升序），后序=左右根，层序=一层层从左到右。`,
      ].join('');
    default:
      return null;
  }
}

function explainRecursion(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame as RecursionFrame;
  const top = f.callStack[f.callStack.length - 1] ?? null;
  switch (kind) {
    case 'call':
      return top
        ? [
            `${top.label} 入栈：函数开始执行。`,
            `它还需要更小子问题的答案，所以当前调用会「挂起」（waiting），等子问题返回后再继续。调用栈就是这样一层层生长的。`,
          ].join('')
        : null;
    case 'return':
      return [
        top ? `栈顶回到 ${top.label}：子问题已解决。` : `一次调用结束并弹栈。`,
        f.memo ? `每次返回都伴随大量重复子问题——这正是朴素递归的代价，动态规划会用表格消除重复。` : `返回值沿调用栈逐层向上传递，直到最外层得到最终结果。`,
      ].join('');
    case 'move':
      return f.lastMove
        ? [
            `${f.lastMove}。`,
            `规则：一次只移一个盘，且大盘不能压在小盘上。递归思路是：先把上面 n-1 个盘挪到中转柱，移走最大的盘，再把 n-1 个盘挪到目标柱。`,
          ].join('')
        : null;
    default:
      return null;
  }
}

function explainDP(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame as DPFrame;
  if (kind !== 'fill' || f.current === null) return null;
  const col = f.current % f.colHeaders.length;
  const depVals = f.dependencies
    .map((i) => `${rowHeaderOf(f, i)}/${f.colHeaders[i % f.colHeaders.length]}=${f.cells[i]}`)
    .join('、');
  return [
    `正在填写格子（行 ${rowHeaderOf(f, f.current)}，列 ${f.colHeaders[col]}）。`,
    depVals ? `它只依赖已经填好的格子：${depVals}——「大问题的答案由小问题的答案组合而成」就是 DP 的核心。` : '',
    f.message.includes('=') ? `转移关系见下方解说：${f.message.split('：').slice(-1)[0]}。` : '',
  ].join('');
}

function rowHeaderOf(f: DPFrame, cellIndex: number): string {
  const row = Math.floor(cellIndex / f.colHeaders.length);
  return f.rowHeaders[row] ?? String(row);
}

function explainNQueens(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame as NQueensFrame;
  if (kind !== 'try-place') return null;
  return [
    `尝试把皇后放在第 ${f.tryingRow + 1} 行第 ${f.tryingCol + 1} 列。`,
    f.attacking
      ? `高亮显示它与已有皇后冲突（同一列或同一对角线），所以要回退（撤销这步）换下一个位置——这就是回溯：试探失败就退回来换路。`
      : `当前没有冲突，继续放下一行的皇后。`,
  ].join('');
}

/** 逐步详解入口：返回多句话的初学者解释；无法识别的步骤返回 null（只显示原解说） */
export function explainStepBeginner(cur: VizStep, prev: VizStep | null): string | null {
  const kind = deriveStepKind(cur, prev);
  const f = cur.frame;
  if (isArrayFrame(f)) return explainArray(cur, kind);
  if (isGraphFrame(f)) return explainGraph(cur, kind);
  if (isStructureFrame(f)) return explainStructure(cur, kind);
  if (isTreeFrame(f)) return explainTree(cur, kind);
  if (isRecursionFrame(f)) return explainRecursion(cur, kind);
  if (isDPFrame(f)) return explainDP(cur, kind);
  if (isNQueensFrame(f)) return explainNQueens(cur, kind);
  return null;
}

// ---------------------------------------------------------------------------
// 每算法静态初学者要点（集中管理，不动算法注册表文件）
// ---------------------------------------------------------------------------

const BEGINNER_NOTES: Record<string, string> = {
  'bubble-sort': '每一轮从左到右两两比较，把当前最大值「冒泡」到未排序区的末尾；某轮没有发生任何交换就说明已经有序，可以提前结束。',
  'selection-sort': '每轮从未排序区找出最小值，与未排序区的第一个位置交换；交换次数最少（至多 n-1 次），但比较次数固定是 n²/2 量级。',
  'insertion-sort': '像整理扑克牌：每次把新元素插入到左侧已排序区的正确位置；对几乎有序的数据非常快（接近 O(n)）。',
  'merge-sort': '分治：把数组对半拆到不能再拆，然后两两合并有序子数组；稳定且始终 O(n log n)，但需要 O(n) 的辅助数组。',
  'quick-sort': '每轮选定一个基准值（本实现取区间末元素），分区后基准落在最终位置，再对左右两侧递归；平均最快，但最坏会退化到 O(n²)。',
  'heap-sort': '先把数组建成最大堆（父节点 ≥ 子节点），反复「取堆顶 + 修复堆」；原地排序且最坏也是 O(n log n)，但不稳定。',
  'linear-search': '从头到尾逐个比对，不要求有序；数据无序时的唯一选择，代价是平均要找一半元素。',
  'binary-search': '只对有序数组有效：每次与中点比较就能排除一半候选；log₂(n) 次比较即可在百万级数据中定位。',
  stack: '后进先出（LIFO）：只能在栈顶插入（push）和取出（pop）；函数调用、括号匹配、撤销操作都是这个模型。',
  queue: '先进先出（FIFO）：从队尾入队（enqueue）、从队头出队（dequeue）；排队处理、BFS 都用它。',
  'linked-list': '每个节点存值和下一个节点的地址；头插/删除只需改指针，但访问第 k 个元素必须从头数 k 步。',
  'bst-operations': '左子树所有节点 < 根 < 右子树所有节点；插入、查找、删除都沿着这条规则下降，效率取决于树是否平衡。',
  'tree-traversal': '四种访问顺序（前/中/后序、层序）的区别只在「根」被访问的时机；中序遍历 BST 得到升序序列。',
  bfs: '用队列逐层扩散：先访问起点所有距离为 1 的邻居，再访问距离为 2 的……因此 BFS 天然给出无权图最短路径。',
  dfs: '用栈一路走到底再回溯：适合找「是否存在路径」、拓扑排序、连通块等，但不保证最短路。',
  dijkstra: '每次从未确定的节点中挑距离最小的「定型」，再松弛它的邻居；贪心策略保证无负权边的图得到正确最短距离。',
  factorial: 'n! = n × (n-1)!，基准情形 n ≤ 1 返回 1；观察调用栈先长到最深、再逐层返回的全过程。',
  'fibonacci-recursion': 'fib(n) = fib(n-1) + fib(n-2)。注意调用计数：同样的子问题被反复计算，调用量随 n 指数增长——这是 DP 要解决的问题。',
  hanoi: '把 n 个盘从 A 移到 C：先把上面 n-1 个移到 B，再把最大盘移到 C，最后把 n-1 个从 B 移到 C；共需 2ⁿ-1 次移动。',
  'n-queens': '逐行放置皇后；每行尝试各列，冲突就回退换列。回溯 = 带着失败经验的系统性穷举。',
  'fib-dp': '自底向上填表：dp[i] = dp[i-1] + dp[i-2]，每个子问题只算一次；对比朴素递归的调用计数即可看出差距。',
  knapsack: 'dp[i][w] 表示「只考虑前 i 件物品、容量为 w」时的最大价值；每格在「不选第 i 件」与「选它」之间取较大者。',
};

/** 每算法初学者要点（一行，显示在详解下方） */
export function getBeginnerNote(algorithmId: string): string | null {
  return BEGINNER_NOTES[algorithmId] ?? null;
}
