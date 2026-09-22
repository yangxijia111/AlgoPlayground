/**
 * Progress 页聚合计算：统计卡、分类掌握、算法明细、最近学习（纯函数、可测）。
 */
import { CATEGORIES, allAlgorithms } from '../registry';
import type { LearningProfile } from '../learning/types';
import { computeMastery, hasAnyRecord, levelOf, type MasteryLevel, type MasteryResult } from './mastery';

export interface AlgoProgressRow {
  algorithmId: string;
  name: string;
  category: string;
  mastery: MasteryResult;
  quizAttempts: number;
  predictTotal: number;
  challengeAttempts: number;
  lastViewedAt: string | null;
}

export interface ProgressSummary {
  learningDays: number;
  totalPractice: number;
  studiedCount: number;
  masteredCount: number;
  bookmarks: number;
}

export interface CategoryRow {
  id: string;
  name: string;
  /** 平均分（只统计真实算法） */
  avgScore: number;
  mastered: number;
  studied: number;
  total: number;
}

/** 全部算法的进度明细行（跳过 concept: 前缀键） */
export function progressRows(profile: LearningProfile): AlgoProgressRow[] {
  const rows: AlgoProgressRow[] = [];
  for (const entry of allAlgorithms()) {
    const p = profile.progress[entry.meta.id];
    const mastery = p
      ? computeMastery(p)
      : {
          score: 0,
          level: 'not-started' as MasteryLevel,
          signals: {
            animationWatched: false,
            quizAnswered: 0,
            quizAccuracy: null,
            predictAttempts: 0,
            predictAccuracy: null,
            challengeCompleted: false,
            reviewBoost: false,
          },
        };
    rows.push({
      algorithmId: entry.meta.id,
      name: entry.meta.name,
      category: entry.meta.category,
      mastery,
      quizAttempts: p ? Object.values(p.quiz).reduce((s, r) => s + r.attemptCount, 0) : 0,
      predictTotal: p?.predict.total ?? 0,
      challengeAttempts: p ? Object.values(p.challenge).reduce((s, r) => s + r.attempts, 0) : 0,
      lastViewedAt: p?.lastViewedAt ?? null,
    });
  }
  return rows;
}

/** 顶部统计 */
export function progressSummary(profile: LearningProfile): ProgressSummary {
  const rows = progressRows(profile);
  let quizAttempts = 0;
  let predictTotal = 0;
  let challengeAttempts = 0;
  for (const p of Object.values(profile.progress)) {
    quizAttempts += Object.values(p.quiz).reduce((s, r) => s + r.attemptCount, 0);
    predictTotal += p.predict.total;
    challengeAttempts += Object.values(p.challenge).reduce((s, r) => s + r.attempts, 0);
  }
  return {
    learningDays: profile.activityDays.length,
    totalPractice: quizAttempts + predictTotal + challengeAttempts,
    studiedCount: rows.filter((r) => r.mastery.level !== 'not-started').length,
    masteredCount: rows.filter((r) => r.mastery.level === 'mastered').length,
    bookmarks: profile.bookmarks.length,
  };
}

/** 分类聚合（排序/搜索/线性结构/树/图/递归/回溯/DP） */
export function categoryRows(profile: LearningProfile): CategoryRow[] {
  const rows = progressRows(profile);
  return CATEGORIES.map((cat) => {
    const sub = rows.filter((r) => r.category === cat.id);
    const studied = sub.filter((r) => r.mastery.level !== 'not-started');
    const avgScore =
      sub.length === 0 ? 0 : Math.round(sub.reduce((s, r) => s + r.mastery.score, 0) / sub.length);
    return {
      id: cat.id,
      name: cat.name,
      avgScore,
      mastered: sub.filter((r) => r.mastery.level === 'mastered').length,
      studied: studied.length,
      total: sub.length,
    };
  });
}

/** 最近学习（lastViewedAt 倒序前 N；含概念课） */
export function recentlyViewed(profile: LearningProfile, limit = 5): { id: string; name: string; at: string }[] {
  const out: { id: string; name: string; at: string }[] = [];
  for (const [id, p] of Object.entries(profile.progress)) {
    if (!p.lastViewedAt) continue;
    const isConcept = id.startsWith('concept:');
    const name = isConcept ? id.slice('concept:'.length) : allAlgorithms().find((e) => e.meta.id === id)?.meta.name ?? id;
    out.push({ id, name, at: p.lastViewedAt });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

/** 收藏条目展示名 */
export function bookmarkLabel(targetId: string): string {
  if (targetId.startsWith('concept:')) return `概念课：${targetId.slice('concept:'.length)}`;
  return allAlgorithms().find((e) => e.meta.id === targetId)?.meta.name ?? targetId;
}

export { computeMastery, hasAnyRecord, levelOf };
