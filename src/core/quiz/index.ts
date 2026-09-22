/**
 * 题库聚合：ALL_QUESTIONS 与 questionsByAlgorithm（按算法分组、按文件顺序稳定排列）。
 */
import type { QuizQuestion } from './types';
import { SORTING_SEARCH_QUESTIONS } from './questions/sortingSearching';
import { STRUCTURE_ALGO_QUESTIONS } from './questions/structuresAlgo';

export const ALL_QUESTIONS: readonly QuizQuestion[] = [...SORTING_SEARCH_QUESTIONS, ...STRUCTURE_ALGO_QUESTIONS];

/** 按算法取题（保持声明顺序） */
export function questionsByAlgorithm(algorithmId: string): QuizQuestion[] {
  return ALL_QUESTIONS.filter((q) => q.algorithmId === algorithmId);
}

/** 题库统计（Progress 页与测试用） */
export function quizStats(): { total: number; byAlgorithm: Record<string, number> } {
  const byAlgorithm: Record<string, number> = {};
  for (const q of ALL_QUESTIONS) byAlgorithm[q.algorithmId] = (byAlgorithm[q.algorithmId] ?? 0) + 1;
  return { total: ALL_QUESTIONS.length, byAlgorithm };
}
