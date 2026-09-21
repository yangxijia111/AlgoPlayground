/**
 * 术语表（Glossary）：集中管理全部术语解释；UI 不内嵌术语文案。
 * 渲染层经 <TermTip> 弹出解释，不离开当前页面。
 */

export interface GlossaryTerm {
  /** 短 id（用于内联标记与路由） */
  id: string;
  /** 中文术语名 */
  term: string;
  /** 英文名 */
  en: string;
  /** 简洁解释（1–3 句） */
  definition: string;
  /** 延伸阅读：一句话示例或补充 */
  example?: string;
  /** 相关算法 id */
  related?: string[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  { id: 'pivot', term: '基准值（pivot）', en: 'pivot', definition: '快速排序每轮分区选定的参照元素。小于它的放左边，大于它的放右边，一轮结束后它就落在最终位置。', example: '本平台的快排取区间末元素作为 pivot。', related: ['quick-sort'] },
  { id: 'stack', term: '栈', en: 'stack', definition: '后进先出（LIFO）的线性结构：只能在栈顶插入（push）和取出（pop）。', example: '函数调用栈、浏览器的后退都是栈。', related: ['stack'] },
  { id: 'queue', term: '队列', en: 'queue', definition: '先进先出（FIFO）的线性结构：从队尾入队（enqueue），从队头出队（dequeue）。', example: '排队买票、打印任务队列。', related: ['queue', 'bfs'] },
  { id: 'fifo', term: '先进先出', en: 'FIFO — First In, First Out', definition: '最先进入的元素最先离开。队列遵循这一规则。', related: ['queue'] },
  { id: 'lifo', term: '后进先出', en: 'LIFO — Last In, First Out', definition: '最后进入的元素最先离开。栈遵循这一规则。', related: ['stack'] },
  { id: 'recursion', term: '递归', en: 'recursion', definition: '函数直接或间接调用自身的技巧。每个递归都需要基准情形（终止条件）和递归情形。', example: '阶乘：n! = n × (n-1)!。', related: ['factorial', 'fibonacci-recursion'] },
  { id: 'base-case', term: '基准情形', en: 'base case', definition: '递归函数中不再继续调用自身、直接返回结果的条件。没有基准情形的递归会无限调用直到栈溢出。', example: 'fact(n) 的基准情形是 n ≤ 1 时返回 1。', related: ['factorial'] },
  { id: 'visited', term: '已访问', en: 'visited', definition: '图/树遍历中已被处理过的节点。记录 visited 可以避免重复访问和死循环。', related: ['bfs', 'dfs'] },
  { id: 'frontier', term: '边界（frontier）', en: 'frontier', definition: '已被发现但尚未访问的节点集合。BFS 用队列、DFS 用栈管理 frontier 的取出顺序。', related: ['bfs', 'dfs', 'dijkstra'] },
  { id: 'relaxation', term: '松弛', en: 'relaxation', definition: '最短路算法的核心操作：如果「经过当前节点到邻居」的路径比邻居当前记录的距离更短，就更新它。', example: 'dist[v] = min(dist[v], dist[u] + w(u,v))。', related: ['dijkstra'] },
  { id: 'distance', term: '距离（distance）', en: 'distance', definition: '图算法中从起点到某节点的（最短）路径总权重。未确定前显示 ∞。', related: ['dijkstra', 'bfs'] },
  { id: 'predecessor', term: '前驱', en: 'predecessor', definition: '最短路径上某节点的上一个节点。不断回溯前驱即可还原完整路径。', related: ['dijkstra', 'bfs'] },
  { id: 'heap', term: '堆', en: 'heap', definition: '满足「父节点 ≥（或 ≤）子节点」的完全二叉树，用数组存储。最大堆的堆顶是最大值，用于堆排序和优先队列。', related: ['heap-sort'] },
  { id: 'stable-sort', term: '稳定性', en: 'stable sort', definition: '相等的元素在排序后保持原有相对顺序，则称该排序是稳定的。归并/插入/冒泡稳定，选择/快排/堆排序不稳定。', related: ['merge-sort', 'quick-sort'] },
  { id: 'in-place', term: '原地', en: 'in-place', definition: '只用常数级额外空间（O(1)）在原数组上完成排序。冒泡、插入、选择、快排、堆排序都是原地排序；归并不是。', related: ['bubble-sort', 'quick-sort', 'merge-sort'] },
  { id: 'time-complexity', term: '时间复杂度', en: 'time complexity', definition: '算法执行步数随输入规模 n 增长的趋势，用大 O 记号表示，如 O(n log n)。区分最好/平均/最坏三种情况。', related: ['linear-search', 'merge-sort'] },
  { id: 'space-complexity', term: '空间复杂度', en: 'space complexity', definition: '算法运行所需额外存储空间随输入规模 n 的增长趋势，含辅助数组与递归调用栈。', related: ['merge-sort', 'fibonacci-recursion'] },
  { id: 'dp-state', term: 'DP 状态', en: 'DP state', definition: '动态规划中「子问题的精确描述」，通常是 dp 表的一个下标（如 dp[i][w] = 前 i 件物品、容量 w 的最优解）。定义好状态与转移方程就完成了 DP 设计的大半。', related: ['fib-dp', 'knapsack'] },
  { id: 'backtracking', term: '回溯', en: 'backtracking', definition: '系统性搜索解空间的框架：每层做一个选择并深入，发现冲突就撤销（回退）换下一个选择。', example: 'N 皇后逐行放皇后，冲突就换列。', related: ['n-queens'] },
  { id: 'branch', term: '分支', en: 'branch', definition: '搜索/递归过程中一个决策点分出的不同走向。分支因子越大，搜索空间增长越快。', related: ['n-queens', 'fibonacci-recursion'] },
  { id: 'node', term: '节点', en: 'node', definition: '图或树的基本单元，存放数据；节点之间用边连接。', related: ['bfs', 'bst-operations'] },
  { id: 'edge', term: '边', en: 'edge', definition: '连接两个节点的关系，可以带方向（有向图）和权重（如路程、耗时）。', related: ['dijkstra', 'bfs'] },
  { id: 'call-stack', term: '调用栈', en: 'call stack', definition: '记录「哪些函数正在执行」的栈。每调用一次压入一帧，返回时弹出；递归深度就是栈的最大高度。', related: ['factorial', 'hanoi'] },
  { id: 'comparison-sort', term: '比较排序', en: 'comparison sort', definition: '通过比较两个元素大小决定顺序的排序。任何比较排序最快也只能 O(n log n)。', related: ['bubble-sort', 'merge-sort'] },
  { id: 'greedy', term: '贪心', en: 'greedy', definition: '每步都选当前看起来最优的策略，不回头。Dijkstra 的「每次定型最近节点」就是贪心；并非所有问题贪心都能得到全局最优。', related: ['dijkstra', 'selection-sort'] },
];

export function getTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.id === id);
}

/** 术语 id 合法性（内联标记校验用） */
export function isTermId(id: string): boolean {
  return GLOSSARY_TERMS.some((t) => t.id === id);
}
