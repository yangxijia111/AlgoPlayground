/**
 * 题库：线性结构 / 树 / 图 / 递归 / 回溯 / 动态规划。
 */
import type { QuizQuestion } from '../types';

const byId = <T extends Record<string, unknown>>(id: string, rest: T) => ({ id, ...rest });

export const STRUCTURE_ALGO_QUESTIONS: QuizQuestion[] = [
  // ---- 栈 ----
  {
    ...byId('stack-1', {
      algorithmId: 'stack',
      category: 'concept' as const,
      type: 'single' as const,
      question: '栈的核心规则是？',
      options: [
        '后进先出（LIFO）：只能在栈顶插入和取出',
        '先进先出（FIFO）：从队尾进、队头出',
        '按优先级取出',
        '可以从任意位置删除',
      ],
      answer: [0],
      explanation: '栈只有一端开口（栈顶）：push 入栈、pop 出栈都在栈顶进行。最后放进去的元素最先被取出。',
      difficulty: 1 as const,
      tags: ['stack', 'lifo'],
    }),
  },
  {
    ...byId('stack-2', {
      algorithmId: 'stack',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '对空栈依次执行 push(1)、push(2)、pop()、push(3)、pop()，最终栈内（底→顶）是？',
      options: ['[1]', '[3]', '[1, 2]', '空'],
      answer: [0],
      explanation: 'push(1) → [1]；push(2) → [1,2]；pop 弹出 2 → [1]；push(3) → [1,3]；pop 弹出 3 → [1]。两次弹出的都是当时的栈顶，体现 LIFO。',
      difficulty: 2 as const,
      tags: ['stack', 'trace'],
    }),
  },
  {
    ...byId('stack-3', {
      algorithmId: 'stack',
      category: 'concept' as const,
      type: 'multiple' as const,
      question: '以下哪些场景天然使用栈？（多选）',
      options: ['函数调用管理', '括号匹配检查', '打印任务的排队', '浏览器后退'],
      answer: [0, 1, 3],
      explanation: '函数调用（调用栈）、括号匹配、撤销/后退都是「最近发生的最先处理」，是 LIFO 场景。打印任务按到达顺序处理，用的是队列（FIFO）。',
      difficulty: 2 as const,
      tags: ['stack', 'application'],
    }),
  },

  // ---- 队列 ----
  {
    ...byId('queue-1', {
      algorithmId: 'queue',
      category: 'concept' as const,
      type: 'single' as const,
      question: '队列的入队（enqueue）和出队（dequeue）分别发生在哪端？',
      options: ['入队在队尾，出队在队头', '入队在队头，出队在队尾', '两端都可以随意操作', '都在队头'],
      answer: [0],
      explanation: '队列像排队：新来的人排到队尾，先来的人先离开（队头）。这保证先进先出（FIFO）。',
      difficulty: 1 as const,
      tags: ['queue', 'fifo'],
    }),
  },
  {
    ...byId('queue-2', {
      algorithmId: 'queue',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '广度优先搜索（BFS）使用队列，是因为队列的哪种性质恰好匹配「逐层扩散」？',
      options: [
        '先入队的节点先被访问，保证先发现的先处理',
        '后入队的节点先被访问',
        '队列可以按值排序',
        '队列支持随机访问',
      ],
      answer: [0],
      explanation: 'BFS 从起点出发，先发现的节点距离更近；队列的 FIFO 顺序保证「距离为 1 的全部处理完，才开始距离为 2 的」——这就是按层扩散。',
      difficulty: 2 as const,
      tags: ['queue', 'bfs'],
    }),
  },

  {
    ...byId('queue-3', {
      algorithmId: 'queue',
      category: 'trace' as const,
      type: 'single' as const,
      question: '对空队列依次执行 enqueue(A)、enqueue(B)、dequeue()、enqueue(C)、dequeue()，两次出队的元素依次是？',
      options: ['A 然后 B', 'B 然后 C', 'A 然后 C', 'C 然后 A'],
      answer: [0],
      explanation: '队列保持到达顺序：A、B 入队后，出队的是 A；随后 C 入队，队内为 [B, C]，再出队 B。两次出队依次是 A、B——先来先服务。',
      difficulty: 2 as const,
      tags: ['queue', 'trace'],
    }),
  },

  // ---- 链表 ----
  {
    ...byId('linked-list-1', {
      algorithmId: 'linked-list',
      category: 'concept' as const,
      type: 'single' as const,
      question: '与数组相比，链表的劣势是？',
      options: ['不能按下标直接访问，必须从头节点顺着指针找', '插入元素需要整体移动', '删除头部元素很慢', '不能存储任意类型的值'],
      answer: [0],
      explanation: '链表的节点在内存中靠 next 指针串联，访问第 k 个元素必须走 k 步（O(n)）。反过来，头插/头删只需改一两个指针，数组反而做不到。',
      difficulty: 1 as const,
      tags: ['linked-list'],
    }),
  },
  {
    ...byId('linked-list-2', {
      algorithmId: 'linked-list',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '在单链表中「在位置 2 插入新节点」，最关键的操作是？',
      options: [
        '先让新节点指向后继，再让前驱指向新节点（顺序不能反）',
        '把后面所有节点整体后移一位',
        '先断开整个链表再重新连接',
        '把新节点放到链表头部',
      ],
      answer: [0],
      explanation: '若先让前驱指向新节点，原后继的引用就丢了。标准顺序是：new.next = 前驱.next，然后 前驱.next = new。插入只需两次指针赋值，这正是链表插入 O(1) 的原因。',
      difficulty: 2 as const,
      tags: ['linked-list', 'pointer'],
    }),
  },

  {
    ...byId('linked-list-3', {
      algorithmId: 'linked-list',
      category: 'trace' as const,
      type: 'single' as const,
      question: '链表 head → a → b → c。执行「删除位置 1」（即删除 b）后，指针关系是？',
      options: ['a.next 直接指向 c，b 被跳过移除', 'b.next 指向 a', '整个链表重建', 'c 被删除'],
      answer: [0],
      explanation: '删除链表节点不需要移动其他元素：把前驱 a 的 next 改为指向 b 的后继 c，b 就从链上脱落。一次指针改写完成删除——这正是链表删除 O(1)（找到位置后）的原因。',
      difficulty: 2 as const,
      tags: ['linked-list', 'delete'],
    }),
  },

  // ---- BST ----
  {
    ...byId('bst-operations-1', {
      algorithmId: 'bst-operations',
      category: 'concept' as const,
      type: 'single' as const,
      question: '二叉搜索树（BST）的性质是？',
      options: [
        '左子树所有节点 < 根 < 右子树所有节点，且每个子树同样满足',
        '父节点大于子节点',
        '所有叶子在同一层',
        '节点值必须连续',
      ],
      answer: [0],
      explanation: 'BST 的有序性是「局部对每个节点成立」的：左子树整体小于根、右子树整体大于根。每次查找都可以排除一整棵子树。',
      difficulty: 1 as const,
      tags: ['bst'],
    }),
  },
  {
    ...byId('bst-operations-2', {
      algorithmId: 'bst-operations',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '在 BST 中查找一个不存在的值，路径会怎样结束？',
      options: ['走到一个空位（null 子节点）', '回到根节点', '在某个叶子处死循环', '必然遍历整棵树'],
      answer: [0],
      explanation: '查找沿「小往左、大往右」下降，遇到空指针说明目标不在树中。失败查找的路径长度 = 树高，这也是 BST 删除/插入定位的方式。',
      difficulty: 2 as const,
      tags: ['bst', 'search'],
    }),
  },
  {
    ...byId('bst-operations-3', {
      algorithmId: 'bst-operations',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '把有序序列依次插入空 BST，树的形态和查找效率会怎样？',
      options: [
        '退化成一条链（类似链表），查找退化为 O(n)',
        '形成完美平衡树，查找 O(log n)',
        '无法插入（有序序列被拒绝）',
        '树高固定为 log n',
      ],
      answer: [0],
      explanation: 'BST 不自我平衡：依次插入递增值会让每个节点只有右孩子，树高 = n。这就是 AVL/红黑树等平衡树存在的原因——它们通过旋转把树高压回 O(log n)。',
      difficulty: 3 as const,
      tags: ['bst', 'balance', 'complexity'],
    }),
  },

  // ---- 树遍历 ----
  {
    ...byId('tree-traversal-1', {
      algorithmId: 'tree-traversal',
      category: 'concept' as const,
      type: 'single' as const,
      question: '中序遍历（左-根-右）一棵 BST，输出的序列是？',
      options: ['升序序列', '降序序列', '按层排列的序列', '随机顺序'],
      answer: [0],
      explanation: '「左 < 根 < 右」与「左-根-右」的访问顺序完美对应：每个根输出时，它的左子树已全部输出、右子树都还没输出。这是 BST 最优雅的性质之一。',
      difficulty: 1 as const,
      tags: ['traversal', 'bst'],
    }),
  },
  {
    ...byId('tree-traversal-2', {
      algorithmId: 'tree-traversal',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '前序、中序、后序遍历的区别在于什么？',
      options: [
        '根节点被访问（输出）的时机：先访问根 / 左根右 / 最后访问根',
        '访问左子树还是右子树的顺序',
        '是否使用递归',
        '树的深度不同',
      ],
      answer: [0],
      explanation: '三者都是「先左后右」，差别只在根的输出时机：前序（根左右）适合复制树/前缀表达式，中序给出 BST 升序，后序（左右根）适合自底向上计算/删除树。',
      difficulty: 2 as const,
      tags: ['traversal'],
    }),
  },
  {
    ...byId('tree-traversal-3', {
      algorithmId: 'tree-traversal',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '层序遍历（一层层从左到右）通常借助什么数据结构实现？',
      options: ['队列', '栈', '哈希表', '并查集'],
      answer: [0],
      explanation: '访问一个节点时把它的孩子先入队，队列的 FIFO 保证同一层的节点先于下一层被处理。这正是 BFS 在树上的形态。',
      difficulty: 2 as const,
      tags: ['traversal', 'queue'],
    }),
  },

  // ---- BFS ----
  {
    ...byId('bfs-1', {
      algorithmId: 'bfs',
      category: 'concept' as const,
      type: 'single' as const,
      question: 'BFS 从起点开始访问节点的顺序有什么规律？',
      options: [
        '按「离起点的跳数」逐层向外：先访问所有距离 1 的，再访问距离 2 的……',
        '沿一条路走到底再回头',
        '按节点编号从小到大',
        '按边的权重从小到大',
      ],
      answer: [0],
      explanation: 'BFS 用队列保证先发现的先访问，形成以起点为中心的同心圆扩散。因此在无权图中，第一次到达某节点的路径就是最少边数的路径。',
      difficulty: 1 as const,
      tags: ['bfs'],
    }),
  },
  {
    ...byId('bfs-2', {
      algorithmId: 'bfs',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: 'BFS 中一个节点「被发现」（入队）和「被访问」（出队处理）的区别是？',
      options: [
        '入队只是加入待处理集合；出队时才真正处理它的邻居',
        '入队时就已经处理完它的邻居',
        '两者没有区别',
        '出队后节点会被删除',
      ],
      answer: [0],
      explanation: 'frontier（队列）里放的是「已发现、待访问」的节点。出队时才检查它的出边、把未发现的邻居入队并记录前驱。区分这两个阶段是理解 BFS/DFS 状态机的关键。',
      difficulty: 2 as const,
      tags: ['bfs', 'frontier'],
    }),
  },
  {
    ...byId('bfs-3', {
      algorithmId: 'bfs',
      category: 'concept' as const,
      type: 'judge' as const,
      question: '判断：在无权图（所有边等长）中，BFS 首次到达某节点的路径就是边数最少的路径。',
      options: ['正确', '错误'],
      answer: [0],
      explanation: 'BFS 逐层扩散保证第一次到达时经过的边数最少（各层边数 +1）。若边有不同权重，就需要 Dijkstra 而不是 BFS。',
      difficulty: 2 as const,
      tags: ['bfs', 'shortest-path'],
    }),
  },

  // ---- DFS ----
  {
    ...byId('dfs-1', {
      algorithmId: 'dfs',
      category: 'concept' as const,
      type: 'single' as const,
      question: 'DFS 与 BFS 最本质的区别是？',
      options: [
        '待处理集合不同：DFS 用栈（后进先出）一路深入，BFS 用队列（先进先出）逐层扩散',
        'DFS 不能用在有向图',
        'DFS 一定更快',
        'DFS 不需要记录 visited',
      ],
      answer: [0],
      explanation: '两者框架完全一样（取出一个节点、处理邻居），唯一的差别是取出的顺序：栈让最新发现的节点先被探索（深入），队列让最早的先被探索（扩散）。',
      difficulty: 1 as const,
      tags: ['dfs', 'bfs'],
    }),
  },
  {
    ...byId('dfs-2', {
      algorithmId: 'dfs',
      category: 'concept' as const,
      type: 'multiple' as const,
      question: '以下哪些任务更适合用 DFS 而不是 BFS？（多选）',
      options: [
        '判断两个节点之间是否存在一条路径',
        '求无权图两点间的最短路径（边数最少）',
        '找出图的所有连通分量',
        '检测图中是否有环',
      ],
      answer: [0, 2, 3],
      explanation: '存在性、连通分量、环检测都只需「走遍可达区域」，DFS 深入的顺序天然合适且省内存。最短路径必须逐层扫描——那是 BFS 的领域。',
      difficulty: 3 as const,
      tags: ['dfs', 'application'],
    }),
  },

  {
    ...byId('dfs-3', {
      algorithmId: 'dfs',
      category: 'trace' as const,
      type: 'single' as const,
      question: '图 A–B、A–C、B–D（无向），从 A 出发做 DFS，邻居按字母序访问。访问序列是？',
      options: ['A, B, D, C', 'A, B, C, D', 'A, C, B, D', 'A, D, B, C'],
      answer: [0],
      explanation: '访问 A；其邻居字母序为 B、C，先走 B；B 的邻居 D 未访问，继续深入 D；D 无未访问邻居，回溯到 A 再访问 C。这就是 DFS「一条路走到黑再回头」的顺序。',
      difficulty: 2 as const,
      tags: ['dfs', 'trace'],
    }),
  },

  // ---- Dijkstra ----
  {
    ...byId('dijkstra-1', {
      algorithmId: 'dijkstra',
      category: 'concept' as const,
      type: 'single' as const,
      question: 'Dijkstra 每一步「定型」哪个节点？',
      options: [
        '尚未定型节点中 dist 最小的那个',
        '编号最小的节点',
        '邻居最多的节点',
        '任意一个未定型节点',
      ],
      answer: [0],
      explanation: '贪心策略：当前 dist 最小的节点，其距离已经不可能再被更短的路径改进（前提：边权非负），因此可以定型，然后用它松弛邻居。',
      difficulty: 2 as const,
      tags: ['dijkstra', 'greedy'],
    }),
  },
  {
    ...byId('dijkstra-2', {
      algorithmId: 'dijkstra',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '「松弛」边 u→v 指的是哪个操作？',
      options: [
        '若 dist[u] + w(u,v) < dist[v]，则更新 dist[v] 并记 u 为 v 的前驱',
        '把边 u→v 从图中删除',
        '交换 dist[u] 与 dist[v]',
        '把 u 和 v 合并成一个节点',
      ],
      answer: [0],
      explanation: '松弛检查「绕道 u 是否更近」。Dijkstra 对定型节点的每条出边做松弛；predecessor 指针随之更新，最终沿前驱回溯即得最短路径。',
      difficulty: 2 as const,
      tags: ['dijkstra', 'relaxation'],
    }),
  },
  {
    ...byId('dijkstra-3', {
      algorithmId: 'dijkstra',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '为什么 Dijkstra 不能正确处理带负权边的图？',
      options: [
        '「已定型节点的距离不会再变短」这一贪心前提被负权边破坏',
        '负数无法比较大小',
        '松弛操作对负数无效',
        '它只适用于无向图',
      ],
      answer: [0],
      explanation: '负权边可能让「晚发现的路径」反而更短，而 Dijkstra 定型后不再回头。含负权的图应使用 Bellman-Ford 等允许反复松弛的算法。',
      difficulty: 3 as const,
      tags: ['dijkstra', 'negative-weight'],
    }),
  },

  // ---- 递归（斐波那契） ----
  {
    ...byId('fibonacci-recursion-1', {
      algorithmId: 'fibonacci-recursion',
      category: 'concept' as const,
      type: 'single' as const,
      question: '朴素递归计算 fib(n) 时，函数调用的总数随 n 如何增长？',
      options: ['指数级增长（约 O(2ⁿ)）', '线性增长 O(n)', '对数增长 O(log n)', '保持不变'],
      answer: [0],
      explanation: '每次调用分裂出两个子调用，且子问题大量重复（fib(n-2) 被算两遍、fib(n-3) 三遍……）。在动画里观察「调用计数」即可直观看到这种爆炸。',
      difficulty: 1 as const,
      tags: ['recursion', 'complexity'],
    }),
  },
  {
    ...byId('fibonacci-recursion-2', {
      algorithmId: 'fibonacci-recursion',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '递归调用中「挂起（waiting）」的状态意味着什么？',
      options: [
        '该调用正在等待它的子调用返回结果，暂时无法继续执行',
        '该调用已经结束',
        '该调用出现了错误',
        '该调用被系统强制终止',
      ],
      answer: [0],
      explanation: '调用栈中每个挂起的帧都保存着「回来后从哪继续」的上下文。递归深度越深，同时挂起的帧越多——这就是递归的空间代价 O(深度)。',
      difficulty: 2 as const,
      tags: ['recursion', 'call-stack'],
    }),
  },
  {
    ...byId('fibonacci-recursion-3', {
      algorithmId: 'fibonacci-recursion',
      category: 'concept' as const,
      type: 'single' as const,
      question: '每个正确的递归函数都必须包含什么？',
      options: [
        '基准情形（base case）：不再递归、直接返回结果的条件',
        '至少三个参数',
        '循环语句',
        '全局变量',
      ],
      answer: [0],
      explanation: '没有基准情形的递归会无限调用自己直到栈溢出。fib 的基准情形是 n ≤ 2 时直接返回 1——它是递归「触底反弹」的地方。',
      difficulty: 1 as const,
      tags: ['recursion', 'base-case'],
    }),
  },

  // ---- N 皇后 ----
  {
    ...byId('n-queens-1', {
      algorithmId: 'n-queens',
      category: 'concept' as const,
      type: 'single' as const,
      question: '回溯法的核心思想是？',
      options: [
        '逐层做选择，发现当前选择导致冲突就撤销（回退），改试下一个选择',
        '随机尝试所有摆法直到成功',
        '把问题分解成完全独立的子问题',
        '每次都选择当前最优解且永不回头',
      ],
      answer: [0],
      explanation: '回溯 = 系统性穷举 + 及时剪枝。N 皇后逐行放皇后；某个位置冲突时，不是放弃全部重来，而是只撤销这一步、在同一行换下一列。冲突检测得越早，剪掉的分支越多。',
      difficulty: 1 as const,
      tags: ['backtracking'],
    }),
  },
  {
    ...byId('n-queens-2', {
      algorithmId: 'n-queens',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '在 N 皇后问题中，为什么可以「逐行」放置皇后而不用担心同一行冲突？',
      options: [
        '每行只放一个皇后，行内天然不会互相攻击',
        '皇后不能攻击同一行的棋子',
        '行与行之间被隔离',
        '算法限制每行只能访问一次',
      ],
      answer: [0],
      explanation: '皇后的攻击范围是同行、同列、同对角线。每行固定只放一个，就把搜索空间从 n² 个格子压缩为每行 n 个列选择，冲突检测只需检查列与对角线。',
      difficulty: 2 as const,
      tags: ['n-queens', 'pruning'],
    }),
  },
  {
    ...byId('n-queens-3', {
      algorithmId: 'n-queens',
      category: 'complexity' as const,
      type: 'judge' as const,
      question: '判断：N 皇后的解的数量随 n 平滑地（近似多项式地）增长。',
      options: ['错误', '正确'],
      answer: [0],
      explanation: '解数（n=4..8 为 2/10/4/40/92）忽增忽减、总体呈指数式增长——回溯类问题的搜索空间是阶乘/指数级的。这也是回溯问题通常只能用剪枝、没有多项式解法的原因。',
      difficulty: 3 as const,
      tags: ['n-queens', 'complexity'],
    }),
  },

  // ---- 斐波那契 DP ----
  {
    ...byId('fib-dp-1', {
      algorithmId: 'fib-dp',
      category: 'concept' as const,
      type: 'single' as const,
      question: '与朴素递归相比，斐波那契 DP（自底向上填表）的关键改进是？',
      options: [
        '每个子问题只计算一次，结果存入表格复用',
        '使用了更快的加法',
        '减少了输入规模',
        '改用多线程并行',
      ],
      answer: [0],
      explanation: '朴素递归对同一 fib(k) 反复计算；DP 按 1、2、3…顺序填表，每格只算一次，复杂度从 O(2ⁿ) 降到 O(n)。这种「用空间换时间」正是 DP 的本质。',
      difficulty: 1 as const,
      tags: ['dp', 'fibonacci'],
    }),
  },
  {
    ...byId('fib-dp-2', {
      algorithmId: 'fib-dp',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '计算 dp[i] = dp[i-1] + dp[i-2] 时，填表顺序为什么必须从小到大？',
      options: [
        '因为大问题依赖小问题的结果，必须先有小问题的答案',
        '因为数组只能从前往后访问',
        '因为从小到大更快',
        '其实顺序无所谓',
      ],
      answer: [0],
      explanation: '自底向上的顺序必须保证「依赖的格子已填好」。dp[i] 依赖 i-1 与 i-2，所以从 1 到 n 顺序填充。依赖关系（填表时高亮的格子）决定了合法的遍历顺序。',
      difficulty: 2 as const,
      tags: ['dp', 'order'],
    }),
  },

  {
    ...byId('fib-dp-3', {
      algorithmId: 'fib-dp',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '斐波那契 DP 需要 O(n) 的表格空间。若只需要 fib(n) 的值，空间可以优化到多少？',
      options: ['O(1)：只保留最近两个值', 'O(log n)', '仍然是 O(n)，无法优化', 'O(2ⁿ)'],
      answer: [0],
      explanation: 'dp[i] 只依赖 dp[i-1] 与 dp[i-2]，因此两个变量滚动记录即可，空间降到 O(1)。「发现依赖范围 → 压缩表格」是 DP 优化的常见套路。',
      difficulty: 3 as const,
      tags: ['dp', 'space-optimization'],
    }),
  },

  // ---- 0/1 背包 ----
  {
    ...byId('knapsack-1', {
      algorithmId: 'knapsack',
      category: 'concept' as const,
      type: 'single' as const,
      question: '0/1 背包中 dp[i][w] 的含义是？',
      options: [
        '只考虑前 i 件物品、背包容量为 w 时能获得的最大价值',
        '第 i 件物品在容量 w 时的重量',
        '装入第 i 件物品后剩余的容量',
        '前 i 件物品的总重量',
      ],
      answer: [0],
      explanation: '这是 DP「状态」的定义。它必须精确描述一个子问题，且能由更小的子问题推出：dp[i][w] 由 dp[i-1][w]（不选第 i 件）与 dp[i-1][w-wt[i]] + val[i]（选）取较大者。',
      difficulty: 2 as const,
      tags: ['dp', 'knapsack', 'state'],
    }),
  },
  {
    ...byId('knapsack-2', {
      algorithmId: 'knapsack',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '「0/1」背包中的 0/1 指的是什么？',
      options: [
        '每件物品要么整个拿（1）、要么不拿（0），不能拿一部分',
        '背包容量只能是 0 或 1',
        '只有两件物品',
        '价值只能是 0 或 1',
      ],
      answer: [0],
      explanation: '0/1 表示每件物品「选或不选」的二选一。若允许拿一部分（按重量比例），则是可拆背包，用贪心即可最优；0/1 版本必须用 DP 逐状态权衡。',
      difficulty: 1 as const,
      tags: ['dp', 'knapsack'],
    }),
  },
  {
    ...byId('knapsack-3', {
      algorithmId: 'knapsack',
      category: 'trace' as const,
      type: 'single' as const,
      question: '物品 A（重量 2、价值 3），容量为 3 的背包。计算 dp[1][3] 时「选 A」的候选值是？',
      options: ['3（dp[0][1] + 3，其中 dp[0][*]=0）', '0', '5', '无法计算，容量不足'],
      answer: [0],
      explanation: '「选 A」= 放弃 2 单位容量（3-2=1）后，用剩余容量取最优 dp[0][1]=0，再加上 A 的价值 3 → 候选 3。「不选 A」候选 = dp[0][3]=0。取较大者 3。',
      difficulty: 3 as const,
      tags: ['dp', 'knapsack', 'trace'],
    }),
  },
];
