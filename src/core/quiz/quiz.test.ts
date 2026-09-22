/**
 * Quiz 测试：判分规则、题库完整性、记录持久化。
 */
import { describe, expect, it } from 'vitest';
import { allEntries } from '../algorithms';
import { getAlgorithm, registerAll } from '../registry';
import { ALL_QUESTIONS, questionsByAlgorithm, quizStats } from './index';
import { gradeQuiz, type QuizQuestion } from './types';

registerAll(allEntries);

/** 任务要求覆盖的核心算法 */
const CORE_ALGOS = [
  'bubble-sort', 'selection-sort', 'insertion-sort', 'merge-sort', 'quick-sort', 'heap-sort',
  'linear-search', 'binary-search', 'stack', 'queue', 'linked-list', 'bst-operations',
  'tree-traversal', 'bfs', 'dfs', 'dijkstra', 'fibonacci-recursion', 'n-queens', 'fib-dp', 'knapsack',
];

describe('题库完整性（静态校验）', () => {
  it('id 全局唯一且格式合法', () => {
    const ids = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+-\d+$/);
  });

  it('algorithmId 均存在于注册表（当前无独立概念题组）', () => {
    for (const q of ALL_QUESTIONS) {
      expect(getAlgorithm(q.algorithmId), `${q.id} 引用 ${q.algorithmId}`).toBeDefined();
    }
  });

  it('options 数量符合题型：judge 恰 2 项，single/multiple ≥3 项', () => {
    for (const q of ALL_QUESTIONS) {
      if (q.type === 'judge') expect(q.options, q.id).toHaveLength(2);
      else expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('answer 下标合法、升序、长度符合题型（single/judge 为 1）', () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.answer.length, q.id).toBeGreaterThan(0);
      for (const a of q.answer) expect(a, q.id).toBeLessThan(q.options.length);
      const sorted = [...q.answer].sort((x, y) => x - y);
      expect(q.answer, q.id).toEqual(sorted);
      if (q.type !== 'multiple') expect(q.answer, q.id).toHaveLength(1);
    }
  });

  it('question / explanation 非空，difficulty 合法，tags 非空', () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.question.length, q.id).toBeGreaterThan(4);
      expect(q.explanation.length, q.id).toBeGreaterThan(10);
      expect([1, 2, 3]).toContain(q.difficulty);
      expect(q.tags.length, q.id).toBeGreaterThan(0);
    }
  });

  it('全部核心算法至少 3 道题（任务要求 3–5 道）', () => {
    for (const algoId of CORE_ALGOS) {
      const n = questionsByAlgorithm(algoId).length;
      expect(n, `${algoId} 仅 ${n} 题`).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('每算法覆盖至少 2 个类别', () => {
    for (const algoId of CORE_ALGOS) {
      const cats = new Set(questionsByAlgorithm(algoId).map((q) => q.category));
      expect(cats.size, `${algoId} 类别数`).toBeGreaterThanOrEqual(2);
    }
  });

  it('题库统计可用', () => {
    const stats = quizStats();
    expect(stats.total).toBe(ALL_QUESTIONS.length);
    expect(stats.total).toBeGreaterThanOrEqual(60);
  });
});

describe('判分 gradeQuiz', () => {
  const single: QuizQuestion = {
    id: 't-1', algorithmId: 'bubble-sort', category: 'concept', type: 'single',
    question: 'q', options: ['a', 'b', 'c'], answer: [1], explanation: 'e', difficulty: 1, tags: [],
  };
  const multi: QuizQuestion = {
    ...single, id: 't-2', type: 'multiple', answer: [0, 2], options: ['a', 'b', 'c'],
  };
  const judge: QuizQuestion = {
    ...single, id: 't-3', type: 'judge', options: ['对', '错'], answer: [0],
  };

  it('single：唯一正确选项得分', () => {
    expect(gradeQuiz(single, [1]).correct).toBe(true);
    expect(gradeQuiz(single, [0]).correct).toBe(false);
    expect(gradeQuiz(single, [2]).correct).toBe(false);
  });

  it('multiple：全对得分，部分对/多选/全错不得分', () => {
    expect(gradeQuiz(multi, [0, 2]).correct).toBe(true);
    expect(gradeQuiz(multi, [2, 0]).correct).toBe(true); // 乱序等价
    expect(gradeQuiz(multi, [0]).correct).toBe(false);
    expect(gradeQuiz(multi, [0, 1, 2]).correct).toBe(false);
    expect(gradeQuiz(multi, [1]).correct).toBe(false);
  });

  it('judge：两项选项判分', () => {
    expect(gradeQuiz(judge, [0]).correct).toBe(true);
    expect(gradeQuiz(judge, [1]).correct).toBe(false);
  });

  it('空选择与越界下标一律错误（防御）', () => {
    expect(gradeQuiz(single, []).correct).toBe(false);
    expect(gradeQuiz(single, [99]).correct).toBe(false);
    expect(gradeQuiz(single, [-1]).correct).toBe(false);
    expect(gradeQuiz(multi, [0, 2, 99]).correct).toBe(false);
  });
});
