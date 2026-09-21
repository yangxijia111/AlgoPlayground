/**
 * 学习路线（Learning Path）：13 章初学者路线，覆盖全部现有算法与基础概念课。
 * 纯数据模块：章节/小节定义 + 完成度派生计算；不强制解锁，只提供推荐。
 */
import { getAlgorithm } from '../registry';
import { CONCEPT_LESSONS, getConcept } from './concepts';

/** 小节引用：概念课或算法页 */
export type LessonRef =
  | { kind: 'concept'; conceptId: string }
  | { kind: 'algorithm'; algorithmId: string };

export interface LearningLesson {
  id: string;
  ref: LessonRef;
}

export interface LearningSection {
  id: string;
  name: string;
  /** 章节一句话简介 */
  blurb: string;
  lessons: LearningLesson[];
}

/** concept:<id> 前缀：概念课在 progress 中的存储键 */
export function conceptProgressKey(conceptId: string): string {
  return `concept:${conceptId}`;
}

export const LEARNING_SECTIONS: LearningSection[] = [
  {
    id: 'basics',
    name: '1. 基础概念',
    blurb: '先弄清四个基本问题：算法是什么、数据结构是什么、怎么衡量快慢与内存。',
    lessons: CONCEPT_LESSONS.map((c) => ({ id: c.id, ref: { kind: 'concept', conceptId: c.id } as const })),
  },
  {
    id: 'array',
    name: '2. 数组',
    blurb: '从冒泡排序开始：在数组上观察比较与交换如何一步步发生。',
    lessons: [{ id: 'bubble-sort', ref: { kind: 'algorithm', algorithmId: 'bubble-sort' } }],
  },
  {
    id: 'linked-list',
    name: '3. 链表',
    blurb: '用指针串起来的线性结构：插入删除灵活，随机访问慢。',
    lessons: [{ id: 'linked-list', ref: { kind: 'algorithm', algorithmId: 'linked-list' } }],
  },
  {
    id: 'stack',
    name: '4. 栈',
    blurb: '后进先出（LIFO）：函数调用栈、括号匹配的共同模型。',
    lessons: [{ id: 'stack', ref: { kind: 'algorithm', algorithmId: 'stack' } }],
  },
  {
    id: 'queue',
    name: '5. 队列',
    blurb: '先进先出（FIFO）：排队处理任务的基本模型。',
    lessons: [{ id: 'queue', ref: { kind: 'algorithm', algorithmId: 'queue' } }],
  },
  {
    id: 'searching',
    name: '6. 搜索',
    blurb: '线性查找人人都会；二分查找则教会我们「有序」的价值。',
    lessons: [
      { id: 'linear-search', ref: { kind: 'algorithm', algorithmId: 'linear-search' } },
      { id: 'binary-search', ref: { kind: 'algorithm', algorithmId: 'binary-search' } },
    ],
  },
  {
    id: 'tree',
    name: '7. 树',
    blurb: 'BST 的插入查找删除与四种遍历，进入分层数据的世界。',
    lessons: [
      { id: 'bst-operations', ref: { kind: 'algorithm', algorithmId: 'bst-operations' } },
      { id: 'tree-traversal', ref: { kind: 'algorithm', algorithmId: 'tree-traversal' } },
    ],
  },
  {
    id: 'heap',
    name: '8. 堆',
    blurb: '完全二叉树实现的优先队列，堆排序的底层结构。',
    lessons: [{ id: 'heap-sort', ref: { kind: 'algorithm', algorithmId: 'heap-sort' } }],
  },
  {
    id: 'sorting',
    name: '9. 排序',
    blurb: '选择、插入是直观策略；归并、快排展示分治思想的两种形态。',
    lessons: [
      { id: 'selection-sort', ref: { kind: 'algorithm', algorithmId: 'selection-sort' } },
      { id: 'insertion-sort', ref: { kind: 'algorithm', algorithmId: 'insertion-sort' } },
      { id: 'merge-sort', ref: { kind: 'algorithm', algorithmId: 'merge-sort' } },
      { id: 'quick-sort', ref: { kind: 'algorithm', algorithmId: 'quick-sort' } },
    ],
  },
  {
    id: 'graph',
    name: '10. 图',
    blurb: '节点与边的世界：BFS 逐层扩散、DFS 一路深入、Dijkstra 求最短路。',
    lessons: [
      { id: 'bfs', ref: { kind: 'algorithm', algorithmId: 'bfs' } },
      { id: 'dfs', ref: { kind: 'algorithm', algorithmId: 'dfs' } },
      { id: 'dijkstra', ref: { kind: 'algorithm', algorithmId: 'dijkstra' } },
    ],
  },
  {
    id: 'recursion',
    name: '11. 递归',
    blurb: '自己调用自己：观察调用栈如何生长与回收。',
    lessons: [
      { id: 'factorial', ref: { kind: 'algorithm', algorithmId: 'factorial' } },
      { id: 'fibonacci-recursion', ref: { kind: 'algorithm', algorithmId: 'fibonacci-recursion' } },
      { id: 'hanoi', ref: { kind: 'algorithm', algorithmId: 'hanoi' } },
    ],
  },
  {
    id: 'backtracking',
    name: '12. 回溯',
    blurb: '试探 + 撤退：N 皇后展示系统性搜索解空间的方法。',
    lessons: [{ id: 'n-queens', ref: { kind: 'algorithm', algorithmId: 'n-queens' } }],
  },
  {
    id: 'dp',
    name: '13. 动态规划',
    blurb: '把递归翻转为填表：斐波那契 DP 与 0/1 背包。',
    lessons: [
      { id: 'fib-dp', ref: { kind: 'algorithm', algorithmId: 'fib-dp' } },
      { id: 'knapsack', ref: { kind: 'algorithm', algorithmId: 'knapsack' } },
    ],
  },
];

/** 全部路线小节（扁平） */
export function allLessons(): LearningLesson[] {
  return LEARNING_SECTIONS.flatMap((s) => s.lessons);
}

/** 小节标题（概念课取标题、算法取注册表名称；找不到返回 id 兜底） */
export function lessonTitle(lesson: LearningLesson): { title: string; en: string } {
  if (lesson.ref.kind === 'concept') {
    const c = getConcept(lesson.ref.conceptId);
    return c ? { title: c.title, en: c.enTitle } : { title: lesson.ref.conceptId, en: '' };
  }
  const entry = getAlgorithm(lesson.ref.algorithmId);
  return entry ? { title: entry.meta.name, en: entry.meta.enName } : { title: lesson.ref.algorithmId, en: '' };
}

/** 小节路由链接 */
export function lessonLink(lesson: LearningLesson): string {
  if (lesson.ref.kind === 'concept') return `/learn/concept/${lesson.ref.conceptId}`;
  const entry = getAlgorithm(lesson.ref.algorithmId);
  return entry ? `/${entry.meta.category}/${entry.meta.id}` : '/';
}

/** 小节是否已完成：算法 viewCount ≥ 1；概念课同理（concept: 前缀键） */
export function isLessonDone(lesson: LearningLesson, viewCounts: Record<string, number>): boolean {
  const key = lesson.ref.kind === 'concept' ? conceptProgressKey(lesson.ref.conceptId) : lesson.ref.algorithmId;
  return (viewCounts[key] ?? 0) >= 1;
}

export interface SectionProgress {
  done: number;
  total: number;
  /** 第一个未完成小节；全部完成时为 null */
  nextLesson: LearningLesson | null;
}

export function sectionProgress(section: LearningSection, viewCounts: Record<string, number>): SectionProgress {
  let done = 0;
  let nextLesson: LearningLesson | null = null;
  for (const l of section.lessons) {
    if (isLessonDone(l, viewCounts)) done++;
    else if (nextLesson === null) nextLesson = l;
  }
  return { done, total: section.lessons.length, nextLesson };
}

/** 整体进度：已完成小节数 / 总小节数 */
export function overallProgress(viewCounts: Record<string, number>): { done: number; total: number } {
  const lessons = allLessons();
  return { done: lessons.filter((l) => isLessonDone(l, viewCounts)).length, total: lessons.length };
}
