/**
 * Quiz 类型与判分（docs/QUIZ_SPEC.md）。
 * 题库数据与 React 组件完全分离；判分为纯函数。
 */

export type QuizType = 'single' | 'multiple' | 'judge';

export type QuizCategory = 'concept' | 'complexity' | 'stability' | 'trace' | 'mechanism';

export interface QuizQuestion {
  /** 全局唯一，如 'bubble-sort-1' */
  id: string;
  /** 关联算法 id（concept 前缀为概念题，如 'concept:time-complexity'） */
  algorithmId: string;
  category: QuizCategory;
  type: QuizType;
  /** 中文题干 */
  question: string;
  /** judge 恰 2 项；single/multiple ≥3 项 */
  options: string[];
  /** 正确选项下标升序数组（single/judge 长度 1） */
  answer: number[];
  /** 必填解析 */
  explanation: string;
  /** 1=入门 2=进阶 3=挑战 */
  difficulty: 1 | 2 | 3;
  tags: string[];
}

export interface QuizGradeResult {
  correct: boolean;
}

/**
 * 判分规则：
 * - single/judge：selected 恰为 answer[0]
 * - multiple：selected 升序排序后与 answer 完全相等（全对才得分）
 * - 含越界下标一律错误（防御）
 */
export function gradeQuiz(q: QuizQuestion, selected: readonly number[]): QuizGradeResult {
  if (selected.length === 0) return { correct: false };
  const valid = q.options.length;
  for (const s of selected) {
    if (!Number.isInteger(s) || s < 0 || s >= valid) return { correct: false };
  }
  const sorted = [...selected].sort((a, b) => a - b);
  if (q.type === 'multiple') {
    return { correct: sorted.length === q.answer.length && sorted.every((v, i) => v === q.answer[i]) };
  }
  // single / judge
  return { correct: sorted.length === 1 && sorted[0] === q.answer[0] };
}
