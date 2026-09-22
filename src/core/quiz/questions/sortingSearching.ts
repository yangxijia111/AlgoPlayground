/**
 * 题库：排序与搜索（每算法 3–5 道高质量题，覆盖 concept/complexity/stability/trace/mechanism）。
 */
import type { QuizQuestion } from '../types';

const byId = <T extends Record<string, unknown>>(id: string, rest: T) => ({ id, ...rest });

export const SORTING_SEARCH_QUESTIONS: QuizQuestion[] = [
  // ---- 冒泡排序 ----
  {
    ...byId('bubble-sort-1', {
      algorithmId: 'bubble-sort',
      category: 'concept' as const,
      type: 'single' as const,
      question: '冒泡排序每一轮扫描后，可以确定什么？',
      options: [
        '当前未排序区中的最大值被「冒泡」到未排序区的末尾',
        '数组中最小的元素已经放到开头',
        '整个数组已经有序',
        '所有偶数下标的元素都已就位',
      ],
      answer: [0],
      explanation: '每轮从左到右相邻比较交换，最大的元素会一路换到未排序区的最后一位；之后未排序区长度减一。最小值不一定在开头，整个数组也要等多轮结束后才有序。',
      difficulty: 1 as const,
      tags: ['bubble'],
    }),
  },
  {
    ...byId('bubble-sort-2', {
      algorithmId: 'bubble-sort',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '冒泡排序的 swapped 早停优化是指什么？',
      options: [
        '某轮扫描没有发生任何交换时，提前结束排序',
        '发现最大值后立即停止本轮扫描',
        '交换次数超过 n 次时中止并报错',
        '每轮只扫描一半的元素',
      ],
      answer: [0],
      explanation: '如果某一轮从头到尾都没有发生交换，说明任意相邻两个元素都满足「前小后大」，剩余部分已经完全有序，可以直接结束。这是冒泡对「几乎有序」数据的最优情况 O(n)。',
      difficulty: 2 as const,
      tags: ['bubble', 'optimization'],
    }),
  },
  {
    ...byId('bubble-sort-3', {
      algorithmId: 'bubble-sort',
      category: 'trace' as const,
      type: 'single' as const,
      question: '对数组 [3, 1, 2] 做一轮完整的冒泡扫描（比较相邻并按需交换）后，数组是？',
      options: ['[1, 2, 3]', '[1, 3, 2]', '[2, 1, 3]', '[3, 2, 1]'],
      answer: [0],
      explanation: '比较 3 和 1：交换 → [1,3,2]；比较 3 和 2：交换 → [1,2,3]。一轮后最大值 3 到达末尾。如果接着做第二轮，会发现没有交换发生（已有序）。',
      difficulty: 2 as const,
      tags: ['bubble', 'trace'],
    }),
  },
  {
    ...byId('bubble-sort-4', {
      algorithmId: 'bubble-sort',
      category: 'complexity' as const,
      type: 'judge' as const,
      question: '判断：使用 swapped 早停优化的冒泡排序，对已经有序的输入只需要 O(n) 次比较。',
      options: ['正确', '错误'],
      answer: [0],
      explanation: '有序输入下第一轮扫描 n-1 次比较、零交换，随后早停退出，总共 O(n)。没有早停的朴素冒泡则固定 O(n²)。',
      difficulty: 2 as const,
      tags: ['bubble', 'complexity'],
    }),
  },

  // ---- 选择排序 ----
  {
    ...byId('selection-sort-1', {
      algorithmId: 'selection-sort',
      category: 'concept' as const,
      type: 'single' as const,
      question: '选择排序每一轮的核心动作是？',
      options: [
        '在未排序区中找到最小值，与未排序区的第一个元素交换',
        '比较所有相邻元素并交换逆序对',
        '把最后一个元素插入到前面合适的位置',
        '把数组分成两半分别排序',
      ],
      answer: [0],
      explanation: '选择排序的策略很直接：扫描未排序区找出最小（大）值，把它换到未排序区的起始位置，然后未排序区向前收缩一格。',
      difficulty: 1 as const,
      tags: ['selection'],
    }),
  },
  {
    ...byId('selection-sort-2', {
      algorithmId: 'selection-sort',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '关于选择排序的交换次数，正确的说法是？',
      options: [
        '最多 n-1 次，与输入是否有序无关',
        '输入越有序交换越少',
        '平均 O(n log n) 次',
        '总是 O(n²) 次',
      ],
      answer: [0],
      explanation: '每轮只做一次交换（最小值换到队首），共 n-1 轮。交换次数是选择排序的优势；但比较次数固定约为 n²/2，即使输入已经有序。',
      difficulty: 2 as const,
      tags: ['selection', 'complexity'],
    }),
  },
  {
    ...byId('selection-sort-3', {
      algorithmId: 'selection-sort',
      category: 'stability' as const,
      type: 'single' as const,
      question: '选择排序是稳定的吗？为什么？',
      options: [
        '通常不稳定：交换可能把相等元素中排在后面的那个换到前面去',
        '稳定：相等元素不会被交换',
        '稳定：因为它每次只交换一次',
        '不稳定：因为比较次数太多',
      ],
      answer: [0],
      explanation: '经典实现中，最小值与队首交换可能跨越多个相等元素，破坏它们的相对顺序。例如 [2a, 2b, 1] 第一轮把 1 与 2a 交换，得到 [1, 2b, 2a]，2a 跑到了 2b 后面。',
      difficulty: 3 as const,
      tags: ['selection', 'stability'],
    }),
  },

  // ---- 插入排序 ----
  {
    ...byId('insertion-sort-1', {
      algorithmId: 'insertion-sort',
      category: 'concept' as const,
      type: 'single' as const,
      question: '插入排序与整理扑克牌的相似之处在于？',
      options: [
        '每次拿起新元素，在左侧已排序区中找到合适位置插入',
        '每次找到最大的牌放到最后',
        '把牌分成两半分别整理再合并',
        '随机打乱后重新排列',
      ],
      answer: [0],
      explanation: '插入排序维护一个已排序前缀：每轮取下一个元素，从右向左比较并腾出位置插入，已排序区逐渐增长直到覆盖整个数组。',
      difficulty: 1 as const,
      tags: ['insertion'],
    }),
  },
  {
    ...byId('insertion-sort-2', {
      algorithmId: 'insertion-sort',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '哪种输入会让插入排序表现最好（接近 O(n)）？',
      options: ['几乎有序的数组', '完全逆序的数组', '全部元素相同的数组', '随机数组'],
      answer: [0],
      explanation: '几乎有序时，每个元素向前移动的距离都很短（常为 0 或 1 次），内层循环几乎不执行。逆序输入才是插入排序的最坏情况 O(n²)。',
      difficulty: 2 as const,
      tags: ['insertion', 'complexity'],
    }),
  },
  {
    ...byId('insertion-sort-3', {
      algorithmId: 'insertion-sort',
      category: 'trace' as const,
      type: 'single' as const,
      question: '对 [2, 4, 1, 3] 做插入排序，把 1 插入到正确位置后（前三步完成时），数组状态是？',
      options: ['[1, 2, 4, 3]', '[1, 4, 2, 3]', '[1, 2, 3, 4]', '[2, 1, 4, 3]'],
      answer: [0],
      explanation: '前两步：2 保持；4 > 2 保持 → [2,4,1,3]。第三步插入 1：1 依次与 4、2 比较并前移 → [1,2,4,3]。此时 3 还未处理，需第四步插入。',
      difficulty: 3 as const,
      tags: ['insertion', 'trace'],
    }),
  },

  // ---- 归并排序 ----
  {
    ...byId('merge-sort-1', {
      algorithmId: 'merge-sort',
      category: 'concept' as const,
      type: 'single' as const,
      question: '归并排序「合并」步骤的前提条件是？',
      options: ['两个待合并的子数组各自已经有序', '两个子数组长度相等', '第一个子数组的所有值都小于第二个', '子数组已经排好且无需比较'],
      answer: [0],
      explanation: '合并（merge）只对「各自有序」的两个序列有效：每次取两个序列头部较小者输出。递归不断对半拆分到单元素（天然有序），再逐层合并。',
      difficulty: 1 as const,
      tags: ['merge', 'divide-and-conquer'],
    }),
  },
  {
    ...byId('merge-sort-2', {
      algorithmId: 'merge-sort',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '归并排序的空间复杂度是 O(n)，原因是？',
      options: [
        '合并时需要与原数组等量级的辅助数组暂存结果',
        '递归深度为 n',
        '需要 n 个计数器',
        '它不需要额外空间',
      ],
      answer: [0],
      explanation: '合并两个有序子数组时需要一个临时数组存放合并结果，规模与输入同阶 O(n)。递归栈深度是 O(log n)，不是主因。这也是归并「稳定、快速、但费内存」的取舍。',
      difficulty: 2 as const,
      tags: ['merge', 'complexity'],
    }),
  },
  {
    ...byId('merge-sort-3', {
      algorithmId: 'merge-sort',
      category: 'stability' as const,
      type: 'judge' as const,
      question: '判断：归并排序是稳定的排序算法。',
      options: ['正确', '错误'],
      answer: [0],
      explanation: '合并时若两头部元素相等，约定优先取左侧子数组的元素，相等元素的相对顺序得以保留。这一约定使归并成为稳定排序——这也是它被用于外部排序和多关键字排序的原因。',
      difficulty: 2 as const,
      tags: ['merge', 'stability'],
    }),
  },
  {
    ...byId('merge-sort-4', {
      algorithmId: 'merge-sort',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '归并排序最坏情况的时间复杂度是？',
      options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
      answer: [0],
      explanation: '无论输入如何，归并都严格对半拆分、线性合并，共 log n 层、每层 O(n)，最坏/平均/最好都是 O(n log n)——代价是需要 O(n) 辅助空间。',
      difficulty: 1 as const,
      tags: ['merge', 'complexity'],
    }),
  },

  // ---- 快速排序 ----
  {
    ...byId('quick-sort-1', {
      algorithmId: 'quick-sort',
      category: 'concept' as const,
      type: 'single' as const,
      question: '快速排序一轮分区（partition）完成后，pivot 处于什么状态？',
      options: [
        '落在它最终的正确位置上，左侧都 ≤ 它、右侧都 ≥ 它',
        '始终停留在数组的第一个位置',
        '与其他元素一起等待后续比较',
        '被移除出数组',
      ],
      answer: [0],
      explanation: '分区把小于 pivot 的移到左边、其余留在右边，扫描结束后 pivot 与分界位置交换落位。之后只需对左右两个子区间递归，pivot 自身不再参与。',
      difficulty: 1 as const,
      tags: ['quick', 'partition'],
    }),
  },
  {
    ...byId('quick-sort-2', {
      algorithmId: 'quick-sort',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '快速排序最坏情况 O(n²) 通常在什么时候发生？',
      options: [
        '每次选到的 pivot 都极端（如已排序数组取末元素为 pivot）',
        '数组元素全是随机数时',
        '数组长度是 2 的幂时',
        'pivot 恰好是中位数时',
      ],
      answer: [0],
      explanation: '本实现取区间末元素为 pivot。对已排序输入，每轮分区只把区间缩小 1 个元素，递归深度退化为 n，比较次数累计 O(n²)。随机选取 pivot 或三数取中可以避免这种退化。',
      difficulty: 2 as const,
      tags: ['quick', 'complexity', 'worst-case'],
    }),
  },
  {
    ...byId('quick-sort-3', {
      algorithmId: 'quick-sort',
      category: 'mechanism' as const,
      type: 'multiple' as const,
      question: '以下关于本平台快排实现（Lomuto 分区、取区间末元素为 pivot）的描述，正确的有哪些？（多选）',
      options: [
        '扫描时用指针 i 划分「小于 pivot」的区域',
        '每个比 pivot 小的元素都会被换到左侧区域',
        'pivot 落位后递归处理左右两个子区间',
        '每轮分区后数组一定完全有序',
      ],
      answer: [0, 1, 2],
      explanation: 'Lomuto 分区维护边界指针 i：遇到小于 pivot 的元素就与 i 处交换并扩展区域；扫描结束后 pivot 与 i 交换落位，再对左右子区间递归。只有所有分区都完成后数组才整体有序。',
      difficulty: 3 as const,
      tags: ['quick', 'partition'],
    }),
  },
  {
    ...byId('quick-sort-4', {
      algorithmId: 'quick-sort',
      category: 'stability' as const,
      type: 'judge' as const,
      question: '判断：快速排序是稳定的排序算法。',
      options: ['正确', '错误'],
      answer: [1],
      explanation: '分区中的长距离交换会把相等元素的相对顺序打乱，因此快排（Lomuto/Hoare 均如此）是不稳定排序。需要稳定且平均 O(n log n) 时通常选归并。',
      difficulty: 2 as const,
      tags: ['quick', 'stability'],
    }),
  },

  // ---- 堆排序 ----
  {
    ...byId('heap-sort-1', {
      algorithmId: 'heap-sort',
      category: 'concept' as const,
      type: 'single' as const,
      question: '最大堆（max-heap）满足什么性质？',
      options: [
        '每个父节点的值都大于或等于其子节点的值',
        '左子树的所有值小于右子树',
        '节点按层从左到右递增',
        '任意两个兄弟节点有序',
      ],
      answer: [0],
      explanation: '最大堆只要求「父 ≥ 子」，兄弟之间与不同子树之间没有大小约定。因此堆顶（根）是全局最大值，但堆不是完全有序的数组。',
      difficulty: 1 as const,
      tags: ['heap'],
    }),
  },
  {
    ...byId('heap-sort-2', {
      algorithmId: 'heap-sort',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '堆排序「取堆顶」之后必须做什么？',
      options: [
        '把最后一个元素换到堆顶，然后向下调整（sift-down）修复堆',
        '直接重新建堆',
        '把堆顶删除即可，无需其他操作',
        '把堆逆序',
      ],
      answer: [0],
      explanation: '堆顶与末尾元素交换后（堆顶元素就位），新堆顶可能违反「父 ≥ 子」，需要向下与较大的子节点交换直到满足性质。每次修复 O(log n)，总复杂度 O(n log n)。',
      difficulty: 2 as const,
      tags: ['heap', 'sift-down'],
    }),
  },
  {
    ...byId('heap-sort-3', {
      algorithmId: 'heap-sort',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '与归并排序相比，堆排序的优势是？',
      options: [
        '原地排序，空间 O(1)，且最坏情况也是 O(n log n)',
        '它是稳定排序',
        '平均情况下更快于 O(n log n)',
        '不需要任何比较',
      ],
      answer: [0],
      explanation: '堆排序在数组上原地建堆和调整（O(1) 额外空间），最坏 O(n log n)。但它不稳定，且缓存局部性不如快排，实际常数较大。',
      difficulty: 2 as const,
      tags: ['heap', 'complexity'],
    }),
  },

  // ---- 线性查找 ----
  {
    ...byId('linear-search-1', {
      algorithmId: 'linear-search',
      category: 'concept' as const,
      type: 'single' as const,
      question: '线性查找对输入数组有什么要求？',
      options: ['没有任何顺序要求', '必须升序', '必须降序', '元素必须是质数'],
      answer: [0],
      explanation: '线性查找从头到尾逐个比对，不依赖任何顺序假设。这正是它的价值：数据无序时它仍可用；代价是平均要比较一半元素，O(n)。',
      difficulty: 1 as const,
      tags: ['linear-search'],
    }),
  },
  {
    ...byId('linear-search-2', {
      algorithmId: 'linear-search',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '在 n 个元素中查找一个「恰好不存在」的目标值，线性查找需要比较多少次？',
      options: ['n 次（扫完全部）', 'n/2 次', 'log n 次', '1 次'],
      answer: [0],
      explanation: '目标不存在时必须扫描所有 n 个元素才能下结论。成功查找平均 n/2 次，失败查找固定 n 次。',
      difficulty: 2 as const,
      tags: ['linear-search', 'complexity'],
    }),
  },

  // ---- 二分查找 ----
  {
    ...byId('linear-search-3', {
      algorithmId: 'linear-search',
      category: 'mechanism' as const,
      type: 'judge' as const,
      question: '判断：把数组排好序后再做线性查找，平均比较次数会明显减少。',
      options: ['错误', '正确'],
      answer: [0],
      explanation: '线性查找只逐个比对，与顺序无关；排序后平均仍要比较约 n/2 次。排序的价值在于启用 O(log n) 的二分查找——但如果只查找一两次，排序本身 O(n log n) 的开销并不划算。',
      difficulty: 2 as const,
      tags: ['linear-search', 'binary-search'],
    }),
  },

  {
    ...byId('binary-search-1', {
      algorithmId: 'binary-search',
      category: 'concept' as const,
      type: 'single' as const,
      question: '二分查找必须满足的前提是？',
      options: ['数组已按升序（或降序）排列', '数组长度是 2 的幂', '元素都是整数', '数组不能有重复值'],
      answer: [0],
      explanation: '二分的每一次「排除一半」都建立在有序性之上：与中点比较后才能确定目标只可能在哪一半。无序数组上二分的结果毫无意义。',
      difficulty: 1 as const,
      tags: ['binary-search'],
    }),
  },
  {
    ...byId('binary-search-2', {
      algorithmId: 'binary-search',
      category: 'complexity' as const,
      type: 'single' as const,
      question: '在 100 万（约 2²⁰）个有序元素中用二分查找定位一个值，最多需要比较约多少次？',
      options: ['20 次', '1000 次', '50 万次', '100 万次'],
      answer: [0],
      explanation: '每比较一次区间减半：2²⁰ → 2¹⁹ → … → 1，共 20 步。这就是 O(log n) 的威力——百万级数据二十次比较。',
      difficulty: 1 as const,
      tags: ['binary-search', 'complexity'],
    }),
  },
  {
    ...byId('binary-search-3', {
      algorithmId: 'binary-search',
      category: 'mechanism' as const,
      type: 'single' as const,
      question: '当 a[mid] < 目标值时，标准的二分查找会怎么做？',
      options: [
        '丢弃左半区间（含 mid），令 lo = mid + 1 继续在右半查找',
        '令 hi = mid - 1 在左半查找',
        '返回 mid 作为结果',
        '从头开始重新查找',
      ],
      answer: [0],
      explanation: 'a[mid] 偏小说明目标只可能在 mid 右侧（有序性），因此 lo = mid + 1。注意 mid 本身也必须被排除，否则区间不收缩可能死循环。',
      difficulty: 2 as const,
      tags: ['binary-search', 'boundary'],
    }),
  },
];
