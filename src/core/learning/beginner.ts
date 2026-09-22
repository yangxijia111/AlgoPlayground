/**
 * Beginner Mode 逐步详解引擎：纯函数、确定性、本地生成（不调用 AI、无随机）。
 * P11 起为 semantic-first：优先读取 VizStep.semantic（判别联合，exhaustive switch），
 * 语义缺失时回退 frame-diff（deriveStepKind）兼容路径。
 * 另附每算法静态初学者要点（beginnerNotes，集中管理）。
 * 详见 docs/SEMANTIC_STEP_SPEC.md §4 与 docs/LEARNING_EXPERIENCE_SPEC.md §5。
 */
import type { DPFrame, GraphFrame, NQueensFrame, RecursionFrame, StructureFrame } from '../step/frame';
import { isArrayFrame, isDPFrame, isGraphFrame, isNQueensFrame, isRecursionFrame, isStructureFrame, isTreeFrame } from '../step/frame';
import type { Frame } from '../step/frame';
import type { VizStep } from '../step/step';
import type { StepSemantic, SwapReason, ComparePurpose } from '../step/semantic';
import { assertNeverSemantic } from '../step/semantic';

/** 步骤语义类型（frame-diff 兼容路径使用；semantic 缺失时的回退推导） */
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
// semantic-first：按 StepSemantic 的 exhaustive switch 生成详解
// ---------------------------------------------------------------------------

/** swap 的算法特定解释（P11 修复：不再把所有交换泛化为「冒泡」） */
function explainSwap(reason: SwapReason, indices: [number, number], values: [number, number]): string {
  const [a, b] = indices;
  const [va, vb] = values;
  const head = `交换 a[${a}]=${va} 与 a[${b}]=${vb}。`;
  switch (reason) {
    case 'bubble-order':
      return `${head}相邻两个元素逆序（大的在左边），交换后较大的元素向右移一格——这就是「冒泡」：每一轮把当前最大值逐步推到未排序区末尾。`;
    case 'selection-place-min':
      return `${head}本轮扫描已在未排序区找到最小值，把它换到未排序区的左边界——选择排序每轮只做这一次交换，交换次数至多 n-1 次。`;
    case 'quick-partition':
      return `${head}分区扫描：把小于基准值的元素换到左侧「小于区」，保证基准左边的元素都不比它大。这不是相邻排序交换，而是在为基准值归位搬运元素。`;
    case 'quick-pivot-place':
      return `${head}扫描结束：基准值与分界位置交换，从此基准值落在它的最终位置，左侧都不大于它、右侧都不小于它。`;
    case 'heap-extract':
      return `${head}堆顶是当前最大值，把它换到数组末尾「取出」，该位置从此就位不再参与堆操作。`;
    case 'heapify':
      return `${head}父节点比孩子小，违反大顶堆性质，交换后继续向下检查——这叫「下沉」（siftDown），用于建堆和取堆顶后的修复。`;
  }
}

/** compare 的算法特定解释（按 purpose） */
function explainCompare(purpose: ComparePurpose, indices: number[], values: number[], cur: VizStep): string {
  const f = cur.frame;
  const at = (i: number) => `a[${i}]=${values[indices.indexOf(i)] ?? '？'}`;
  switch (purpose) {
    case 'bubble-adjacent': {
      const [i, j] = indices as [number, number];
      const vi = values[0]!;
      const vj = values[1]!;
      const desc =
        vi > vj ? `前者更大（${vi} > ${vj}），违反升序，接下来会交换它们。` : `前者不大于后者（${vi} ≤ ${vj}），顺序正确，不需要交换。`;
      return [`正在比较相邻的 ${at(i)} 与 ${at(j)}。`, desc].join('');
    }
    case 'selection-min': {
      const [j, min] = indices as [number, number];
      const vj = values[0]!;
      const vmin = values[1]!;
      const desc = vj < vmin ? `${vj} 更小，最小值候选更新为 a[${min}]。` : `${vj} 不小于当前最小值 ${vmin}，候选不变。`;
      return [`在未排序区中比较 a[${j}]=${vj} 与当前最小值候选 a[${min}]=${vmin}。`, desc].join('');
    }
    case 'insertion-shift': {
      const j = indices[0]!;
      const vj = values[0]!;
      if (isArrayFrame(f)) {
        const key = f.pointers.key !== undefined ? `key=${f.values[f.pointers.key]}` : '待插入元素';
        return [`正在比较有序前缀中的 ${at(j)}（值 ${vj}）与${key}。`, vj > (isArrayFrame(f) ? (f.pointers.key !== undefined ? f.values[f.pointers.key]! : vj) : vj) ? `它更大，需要向右挪出一个位置，给新元素腾地方。` : `它不大于新元素，新元素将插在它右边。`].join('');
      }
      return `正在比较有序前缀中的 a[${j}]=${vj} 与待插入元素。`;
    }
    case 'heap-child': {
      const [i, c] = indices as [number, number];
      const vi = values[0]!;
      const vc = values[1]!;
      const desc = vc > vi ? `孩子更大，违反大顶堆性质，接下来会交换父子。` : `父节点不小于孩子，堆性质满足。`;
      return [`比较父节点 a[${i}]=${vi} 与孩子 a[${c}]=${vc}。`, desc].join('');
    }
    case 'merge-sides': {
      const [i, j] = indices as [number, number];
      const vi = values[0]!;
      const vj = values[1]!;
      const desc = vi <= vj ? `左半较小（相等时左半优先，保证稳定性），先写回左半元素。` : `右半较小，先写回右半元素。`;
      return [`归并中：比较左半候选 a[${i}]=${vi} 与右半候选 a[${j}]=${vj}。`, desc].join('');
    }
    case 'quick-scan': {
      const [j, h] = indices as [number, number];
      const vj = values[0]!;
      const pv = values[1]!;
      return vj < pv
        ? `正在检查 a[${j}]=${vj} 与基准值（a[${h}]）=${pv}：${vj} < ${pv}，它属于基准左侧区域，会被交换过去。`
        : `正在检查 a[${j}]=${vj} 与基准值（a[${h}]）=${pv}：${vj} ≥ ${pv}，它继续留在右侧候选区域。`;
    }
    case 'binary-mid': {
      const mid = indices[0]!;
      const vm = values[0]!;
      if (isArrayFrame(f)) {
        const t = f.target;
        const lo = f.pointers.lo;
        const hi = f.pointers.hi;
        return [
          `当前搜索区间是 [${lo}..${hi}]，中点 mid = ⌊(${lo}+${hi})/2⌋ = ${mid}。`,
          `正在拿中间元素 a[${mid}]=${vm} 与目标值 ${t} 比较。`,
          `数组是有序的，所以：中间元素偏小则目标只可能在右半；偏大在左半；相等即找到。每次比较都把范围缩小一半。`,
        ].join('');
      }
      return `正在与中点元素 a[${mid}]=${vm} 比较。`;
    }
    case 'linear-scan': {
      const i = indices[0]!;
      const vi = values[0]!;
      if (isArrayFrame(f)) {
        return `从头逐个检查：a[${i}]=${vi} ${vi === f.target ? '等于' : '不等于'}目标值 ${f.target}。线性查找不要求有序，但最坏要看完所有元素。`;
      }
      return `从头逐个检查 a[${i}]=${vi}。`;
    }
  }
}

/** semantic-first 详解：exhaustive switch；返回 null = 无补充详解（只显示原 description） */
function explainSemantic(cur: VizStep, s: StepSemantic): string | null {
  switch (s.type) {
    case 'compare':
      return explainCompare(s.purpose, s.indices, s.values, cur);
    case 'swap':
      return explainSwap(s.reason, s.indices, s.values);
    case 'write': {
      switch (s.source) {
        case 'merge-left':
        case 'merge-right': {
          const side = s.source === 'merge-left' ? '左半' : '右半';
          return `把${side}较小的元素 ${s.value} 写回主数组的位置 ${s.index}。归并排序在这一步不「交换」而是「写回」——读取自辅助副本，写入主数组。`;
        }
        case 'insertion-shift':
          return `比待插入元素大的 ${s.value} 向右后移一位（写入位置 ${s.index}），腾出插入空间。插入排序的移动就是这样逐步挪出来的。`;
        case 'insertion-place':
          return `待插入的 ${s.value} 落入位置 ${s.index}：它左边都不比它大、右边都不比它小，有序前缀长度加一。`;
      }
      return null;
    }
    case 'pivot-select':
      return `选定基准值 pivot = a[${s.index}] = ${s.value}（本实现取区间末元素）。接下来一轮扫描会把小于它的元素都换到它左边，扫描结束后它会落在最终的正确位置上。`;
    case 'range-narrow': {
      const side = s.side === 'left' ? '左半' : '右半';
      return [
        `中间元素与目标比较后，目标只可能在${side}：区间从 [${s.from[0]}..${s.from[1]}] 收缩为 [${s.to[0]}..${s.to[1]}]。`,
        `每次都丢弃一半候选，这正是二分查找 O(log n) 的来源。`,
      ].join('');
    }
    case 'found':
      return `a[${s.index}]=${s.value} 正是目标值 ${s.target}，查找成功！高亮的绿色位置就是答案所在的下标。`;
    case 'not-found':
      return `查找结束：数组中不存在 ${s.target}。`;
    case 'push':
      return s.rejected
        ? `栈已满（容量上限），这次入栈被拒绝，栈保持不变。`
        : [`${s.value} 入栈：栈只能在顶部（末尾）插入。`, `栈顶 top 现在指向 ${s.value}。这就是 LIFO——后进先出：最后放入的元素最先被取出。`].join('');
    case 'pop':
      return s.rejected
        ? `栈为空，没有元素可以出栈，操作被拒绝。`
        : [
            `弹出栈顶元素 ${s.value ?? ''}：出栈的永远是最后放入的那个（LIFO）。`,
            `top 指针随之移动，栈长度减一。`,
          ].join('');
    case 'peek':
      return s.value === null ? `栈为空，没有栈顶元素可查看。` : `查看栈顶：${s.value}（peek 只查看、不移除，栈保持不变）。`;
    case 'enqueue':
      return s.rejected
        ? `队列已满（容量上限），这次入队被拒绝。`
        : [`${s.value} 从队尾入队。`, `队列是 FIFO——先进先出：最先入队的元素最先出队。`].join('');
    case 'dequeue':
      return s.rejected
        ? `队列为空，没有元素可以出队，操作被拒绝。`
        : [
            `出队：只能从队头移除元素。`,
            `${s.value ?? ''} 离开队列——它正是最早入队的那个（FIFO）。`,
          ].join('');
    case 'front':
      return s.value === null ? `队列为空，没有队首元素可查看。` : `查看队首：${s.value}（front 只查看、不移除）。`;
    case 'list-node-create':
      return `建立新节点 ${s.value} 并链接到表尾。链表不需要连续内存，每个节点靠「指针」找到下一个。`;
    case 'list-visit':
      return `指针 curr 走到第 ${s.index} 个节点（值 ${s.value}）。链表只能顺着 next 一步步走，不能像数组那样直接跳到第 k 个。`;
    case 'list-insert':
      return `把新节点 ${s.value} 接入位置 ${s.position}：修改前驱的 next 指向新节点、新节点指向原后继。插入本身只改两个指针，不需要移动其他元素。`;
    case 'list-delete':
      return `删除位置 ${s.position} 的节点（值 ${s.value}）：前驱的 next 直接跳过它。被删节点没有其他引用后会被回收。`;
    case 'list-compare':
      return s.equal
        ? `节点 ${s.index} 的值 ${s.value} 等于查找目标，找到了！`
        : `节点 ${s.index} 的值 ${s.value} 不等于目标 ${s.target}，沿着 next 继续找。`;
    case 'tree-descend': {
      // P11 修复：不再声称「每一层排除一半」（那是平衡 BST 的性质）
      const dirText =
        s.direction === 'hit'
          ? `节点值等于查找值，命中目标！`
          : s.direction === 'left'
            ? `查找值更小，进入左子树。`
            : s.direction === 'right'
              ? `查找值更大，进入右子树。`
              : `从根节点开始。`;
      return [
        `当前在节点 ${s.nodeValue}（查找值 ${s.query}）：${dirText}`,
        `BST 规则：比节点小的都在左子树、大的都在右子树，所以每步只走一边。`,
        `树平衡时每层折半、查找为 O(log n)；但如果插入序列接近有序，树会退化成链表，最坏 O(n)。`,
      ].join('');
    }
    case 'tree-insert-place':
      return `新节点 ${s.value} 按 BST 规则挂到空位：沿根下行到叶子处的空子树位置。`;
    case 'tree-delete': {
      switch (s.caseType) {
        case 'leaf':
          return `节点 ${s.value} 是叶子，直接摘除即可，不影响其他节点。`;
        case 'one-child':
          return `节点 ${s.value} 只有一个孩子：让孩子顶替它的位置（父节点直接指向孙子）。`;
        case 'two-children':
          return [
            `节点 ${s.value} 有两个孩子，不能直接删：用中序后继（右子树最小值${s.successorValue !== undefined ? ` ${s.successorValue}` : ''}）替换它的值，再删除右子树中的后继节点。`,
            `这样保证替换后仍然满足「左小右大」。`,
          ].join('');
      }
      return null;
    }
    case 'tree-output': {
      const orderText: Record<'pre' | 'in' | 'post' | 'level', string> = {
        pre: '前序（根-左-右）',
        in: '中序（左-根-右）',
        post: '后序（左-右-根）',
        level: '层序（逐层从左到右，借助队列）',
      };
      return `访问节点 ${s.value} 并加入输出序列（${orderText[s.order]}）。BST 的中序输出恰好是升序序列。`;
    }
    case 'tree-enqueue':
      return `节点 ${s.value} 入队等待层序访问。层序遍历用队列保证「先遇到的先访问」。`;
    case 'visit-node': {
      if (s.algorithm === 'bfs') {
        return [
          `节点 ${s.nodeId} 出队并访问。`,
          `BFS 用队列：先入队的先访问，所以按「离起点的层数」逐层扩散——这保证无权图中先被访问的路径最短。`,
        ].join('');
      }
      return [
        `节点 ${s.nodeId} 出栈并访问。`,
        `DFS 用栈：后压入的先访问，所以沿一条路走到底再回头。`,
      ].join('');
    }
    case 'frontier-add': {
      const container = s.container === 'queue' ? '队列' : s.container === 'stack' ? '栈' : '候选集';
      return `新发现的邻居 ${s.nodeIds.join('、')} 放入${container}等待处理。它们会在后续步骤中依次被取出访问。`;
    }
    case 'graph-relax': {
      // P11 修复：直接使用 semantic 携带的真实数据，禁止「猜最后一个有前驱的节点」
      const oldText = s.oldDistance === null ? '∞（不可达）' : String(s.oldDistance);
      return [
        `松弛：经 ${s.from} 中转到 ${s.to} 的路径更短——dist[${s.from}]+${s.weight}=${s.newDistance} < 原 dist[${s.to}]=${oldText}。`,
        `于是 dist[${s.to}] 更新为 ${s.newDistance}，并记下前驱 predecessor=${s.predecessor}，回溯前驱链即可还原最短路径。`,
      ].join('');
    }
    case 'graph-examine': {
      return `考察边 ${s.from}→${s.to}（w=${s.weight}）：dist[${s.from}]+${s.weight}=${s.candidate} 不小于当前 dist[${s.to}]=${s.oldDistance}，路径没有变短，不更新。`;
    }
    case 'graph-finalize': {
      return [
        `选取未确定节点中距离最小者 ${s.nodeId}（dist=${s.distance}）并「定型」：它的最短距离已经确定，不再改变。`,
        `Dijkstra 的贪心正确性依赖无负权边：更远的路不可能绕回来更短。`,
      ].join('');
    }
    case 'call':
      return [
        `${s.label} 入栈：函数开始执行。`,
        s.note === '基准情形'
          ? `这是基准情形（base case）：不需要再递归，直接算出答案返回。`
          : `它还需要更小子问题的答案，所以当前调用会「挂起」（waiting），等子问题返回后再继续。调用栈就是这样一层层生长的。`,
      ].join('');
    case 'return': {
      const valText = s.value !== undefined && s.value !== '完成' ? `，返回值 ${s.value}` : '';
      return [
        `${s.label} 完成${valText}，弹栈返回上层。`,
        `返回值沿调用栈逐层向上传递，直到最外层得到最终结果。`,
      ].join('');
    }
    case 'move':
      return [
        `移动盘 ${s.disk}：${s.from} → ${s.to}。`,
        `规则：一次只移一个盘，且大盘不能压在小盘上。递归思路：先把上面 n-1 个盘挪到中转柱，移走最大的盘，再把 n-1 个盘挪到目标柱。`,
      ].join('');
    case 'dp-fill': {
      switch (s.choice) {
        case 'base':
          return `填写基准情形：这一格的值不需要计算，由定义直接给出（边界）。DP 从边界出发自底向上。`;
        case 'sum':
          return `本格由已填好的格子相加得到（dp[i]=dp[i-1]+dp[i-2] 一类）：「大问题的答案由小问题的答案组合而成」就是 DP 的核心，每个子问题只算一次。`;
        case 'take':
          return `本格在「不选当前物品」与「选它」之间选择了后者：选的总价值更大。`;
        case 'skip':
          return `本格选择了「不选当前物品」（不选的值不小，或容量装不下），直接继承上一行的值。`;
        case 'copy':
          return `本格直接继承上一行的值。`;
      }
      return null;
    }
    case 'try-place':
      return s.conflict
        ? `尝试 (${s.row + 1}, ${s.col + 1})：与已有皇后冲突（${s.reason ?? '同列或同对角线'}），换下一列再试——冲突的尝试会被直接放弃。`
        : `尝试 (${s.row + 1}, ${s.col + 1})：与已有皇后不冲突（不同列、不同对角线），可以放置。`;
    case 'place':
      return `在第 ${s.row + 1} 行第 ${s.col + 1} 列放置皇后，并递归处理下一行。`;
    case 'remove':
      return `回退：撤掉第 ${s.row + 1} 行刚放的皇后，尝试同一行的下一列。回溯 = 试探失败就退回来换路。`;
    case 'backtrack':
      return `第 ${s.fromRow + 1} 行所有列都冲突，回溯到第 ${s.toRow + 1} 行换位置重试。`;
    case 'solution-found':
      return `找到一个完整解：每行一个皇后且互不攻击！记录后继续回溯搜索其余解。`;
  }
  // exhaustive 保障：新增类型漏写分支时在编译期暴露（运行时兜底）
  return assertNeverSemantic(s);
}

// ---------------------------------------------------------------------------
// frame-diff 兼容路径（semantic 缺失时的回退；文案保持中性，不再泛化）
// ---------------------------------------------------------------------------

function explainArray(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame;
  if (!isArrayFrame(f)) return null;
  const at = (i: number) => `a[${i}]=${f.values[i]}`;
  switch (kind) {
    case 'compare': {
      const [i, j] = f.comparing;
      if (i === undefined) return null;
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
      const desc =
        f.values[i] > f.values[j]
          ? `前者更大，违反了「小的在前」的升序要求，接下来会把它们交换。`
          : `前者不大于后者，顺序正确，不需要交换。`;
      return [`正在比较 ${at(i)} 与 ${at(j)}。`, desc].join('');
    }
    case 'swap': {
      const [i, j] = f.swapping;
      if (i === undefined || j === undefined) return null;
      // 兼容路径无法区分交换原因，保持中性描述（semantic 路径才给出算法特定解释）
      return [
        `正在交换 ${at(i)} 与 ${at(j)}。`,
        `数组在原地变化，不需要额外空间；交换的具体目的见上方解说。`,
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
      // 兼容回退：semantic 缺失时无法确定松弛目标，给出保守描述（不猜具体节点）
      return `发生了「松弛」：经过当前节点中转的路径更短，某个邻居的 dist 与前驱被更新。具体变化见上方解说。`;
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
        `top 指针随之移动。`,
      ].join('');
    case 'peek':
      return top ? `查看栈顶：${top.value}（peek 只查看、不移除，栈保持不变）。` : null;
    case 'enqueue':
      return front || top ? [`${f.nodes[f.nodes.length - 1]?.value ?? ''} 入队：新元素只能从队尾进入。`, `队列是 FIFO——先进先出：最先入队的元素最先出队。`].join('') : null;
    case 'dequeue':
      return [
        `出队：只能从队头移除元素。`,
        `${front?.value ?? '队首元素'} 离开队列——它正是最早入队的那个（FIFO）。`,
      ].join('');
    default:
      return null;
  }
}

function explainTree(cur: VizStep, kind: StepKind): string | null {
  const f = cur.frame;
  if (!isTreeFrame(f)) return null;
  const active = f.nodes.find((n) => n.state === 'active');
  const node = active ?? (f.highlight.length > 0 ? f.nodes.find((n) => n.id === f.highlight[f.highlight.length - 1]) : undefined);
  switch (kind) {
    case 'tree-descend':
      return node
        ? [
            `当前走到节点 ${node.value}。`,
            `BST 的规则：比节点小的去左子树，大的去右子树，所以每步只走一边。`,
            `平均/平衡情况下查找为 O(log n)；最坏（退化成链表）为 O(n)。`,
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

/** 逐步详解入口：semantic-first；无 semantic 时回退 frame-diff。返回 null = 只显示原解说 */
export function explainStepBeginner(cur: VizStep, prev: VizStep | null): string | null {
  if (cur.semantic !== undefined) {
    return explainSemantic(cur, cur.semantic);
  }
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
  'bst-operations': '左子树所有节点 < 根 < 右子树所有节点；插入、查找、删除都沿着这条规则下降。平衡时效率为 O(log n)，插入序列接近有序时会退化成链表（O(n)）。',
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
