/**
 * 概念课内容：基础概念 4 节（结构化数据，非 HTML；由 ConceptPage 渲染）。
 * 内容定位：面向初学者的 What / Why / Key Points；引用现有算法页做后续练习。
 */

export interface ConceptSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface ConceptLesson {
  id: string;
  title: string;
  enTitle: string;
  /** 一句话摘要（学习路线卡片用） */
  summary: string;
  sections: ConceptSection[];
  /** 建议下一步练习的算法 id */
  relatedAlgorithms: string[];
}

export const CONCEPT_LESSONS: ConceptLesson[] = [
  {
    id: 'what-is-algorithm',
    title: '算法是什么',
    enTitle: 'What is an Algorithm',
    summary: '算法是解决问题的有限步骤序列——就像一份足够详细的菜谱。',
    sections: [
      {
        heading: '它是什么（What）',
        paragraphs: [
          '算法（algorithm）是为解决某个问题而设计的、一步一步的有限操作序列。它必须是明确的：每一步做什么、下一步从哪里开始，都不能含糊。',
          '一个常见的类比是菜谱：食材是输入（input），做好的菜是输出（output），而中间「热锅、下油、翻炒两分钟」的操作步骤就是算法。',
        ],
      },
      {
        heading: '为什么重要（Why）',
        paragraphs: [
          '同一道菜可以有不同的做法，同一个问题也有不同的算法：有的步骤少、有的用的锅碗瓢盆多。学会比较不同算法的「步骤数」和「资源占用」，就是算法分析的核心。',
          '对初学者来说，重要的是先看懂「每一步发生了什么」，再去关心「快不快」。这也是本平台把每一步都做成可暂停动画的原因。',
        ],
      },
      {
        heading: '关键要点（Key Points）',
        paragraphs: ['判断一段操作是不是合格的算法，通常看这四点：'],
        bullets: [
          '有穷性：步骤有限，一定会结束；',
          '确定性：每一步含义唯一，没有歧义；',
          '有输入输出：处理若干输入，产生至少一个输出；',
          '可行性：每一步都足够基本，可以被真正执行。',
        ],
      },
    ],
    relatedAlgorithms: ['bubble-sort'],
  },
  {
    id: 'what-is-data-structure',
    title: '数据结构是什么',
    enTitle: 'What is a Data Structure',
    summary: '数据结构是组织数据的方式——组织方式决定了你能多快找到和修改数据。',
    sections: [
      {
        heading: '它是什么（What）',
        paragraphs: [
          '数据结构（data structure）是计算机中组织、存储数据的方式。同样的数据，排成一列、叠成一摞、连成一串或长成一棵树，就是不同的数据结构。',
          '数组和链表是最基础的两类：数组把元素放在连续的位置上（可以用下标直接定位），链表把元素用「指针」串起来（只能顺藤摸瓜）。',
        ],
      },
      {
        heading: '为什么重要（Why）',
        paragraphs: [
          '数据结构决定了操作的效率。在数组里按下标取值是一步到位的；而在链表里找第 100 个元素，必须从头节点数 100 次。反过来，在链表头部插入一个元素只需改两个指针，数组则可能要整体挪动。',
          '算法和数据结构密不可分：二分查找依赖「有序数组」，广度优先搜索依赖「队列」。选对了结构，算法才成立。',
        ],
      },
      {
        heading: '关键要点（Key Points）',
        paragraphs: ['学习一个数据结构时，重点问三个问题：'],
        bullets: [
          '它怎么组织数据（线性？分层？网状）？',
          '它擅长什么操作（随机访问？头尾插入？按层次遍历）？',
          '每个操作的代价是多少（引出复杂度概念）？',
        ],
      },
    ],
    relatedAlgorithms: ['linked-list', 'stack', 'queue'],
  },
  {
    id: 'time-complexity',
    title: '时间复杂度',
    enTitle: 'Time Complexity',
    summary: '用增长趋势而非具体秒数衡量算法快慢——大 O 记号描述步数如何随输入规模增长。',
    sections: [
      {
        heading: '它是什么（What）',
        paragraphs: [
          '时间复杂度（time complexity）描述算法的执行步数随输入规模 n 增长的大致趋势，常用大 O 记号表示，如 O(n)、O(n²)。',
          '它不测量具体的秒数（那取决于机器），而是回答：当数据量翻倍时，步数大约翻倍？翻四倍？还是指数爆炸？',
        ],
        bullets: [
          'O(1)：常数步——与 n 无关；',
          'O(log n)：每次把问题规模砍半（如二分查找）；',
          'O(n)：正比于元素个数（扫描一遍）；',
          'O(n²)：两层嵌套扫描（许多简单排序）；',
          'O(2ⁿ)：每一步分裂出两个子问题（朴素递归求斐波那契）。',
        ],
      },
      {
        heading: '为什么重要（Why）',
        paragraphs: [
          'n 小的时候，O(n²) 的算法可能比 O(n log n) 更快（常数更小）。但 n 到百万级别时，差距就是「秒级」和「天级」的区别。复杂度帮助我们预判算法在真实数据规模下是否可行。',
          '注意：复杂度有最好、平均、最坏之分。快速排序平均 O(n log n)，但最坏会退化到 O(n²)。平台里每个算法页都会区分这三种情况。',
        ],
      },
      {
        heading: '关键要点（Key Points）',
        paragraphs: ['阅读复杂度时的三个习惯：'],
        bullets: [
          '看循环嵌套深度：几层嵌套常意味着 n 的几次方；',
          '每次把问题砍半的步骤贡献 log 因子；',
          '大 O 只保留最高阶项、忽略常数：3n² + 5n + 2 记作 O(n²)。',
        ],
      },
    ],
    relatedAlgorithms: ['linear-search', 'binary-search', 'merge-sort'],
  },
  {
    id: 'space-complexity',
    title: '空间复杂度',
    enTitle: 'Space Complexity',
    summary: '算法运行时额外需要多少内存——常被忽视但同样重要的成本。',
    sections: [
      {
        heading: '它是什么（What）',
        paragraphs: [
          '空间复杂度（space complexity）描述算法运行时所需的额外存储空间随输入规模 n 的增长趋势，同样用大 O 记号。',
          '例如冒泡排序只多用了几个变量（O(1)，称「原地排序」）；归并排序需要与原数组等大的辅助数组（O(n)）；递归调用本身会占用调用栈——深度为 n 的递归就是 O(n) 的栈空间。',
        ],
      },
      {
        heading: '为什么重要（Why）',
        paragraphs: [
          '时间和空间常常可以互相交换：记忆化（备忘录）用 O(n) 的表换掉重复计算，让朴素斐波那契从 O(2ⁿ) 降到 O(n)——代价是多用一块数组。',
          '在内存紧张的场景（嵌入式设备、超大数据集），一个 O(1) 空间的算法可能比更快的算法更合适。',
        ],
      },
      {
        heading: '关键要点（Key Points）',
        paragraphs: ['分析空间时容易忽略的三处开销：'],
        bullets: [
          '辅助数据结构（临时数组、哈希表）；',
          '递归调用栈的深度；',
          '输出的空间（通常不计入，但要知道它在哪）。',
        ],
      },
    ],
    relatedAlgorithms: ['merge-sort', 'fibonacci-recursion', 'fib-dp'],
  },
];

export function getConcept(id: string): ConceptLesson | undefined {
  return CONCEPT_LESSONS.find((c) => c.id === id);
}
