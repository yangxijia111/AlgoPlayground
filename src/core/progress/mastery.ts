/**
 * 掌握度（Mastery）：可解释的确定性规则（docs/PROGRESS_SPEC.md），不是 AI。
 * 0–100 分制：看完动画 25 + Quiz 25 + Predict 25 + Challenge 20 + 复习 5。
 */

export type MasteryLevel = 'not-started' | 'learning' | 'practicing' | 'almost' | 'mastered';

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  'not-started': '未开始',
  learning: '学习中',
  practicing: '练习中',
  almost: '接近掌握',
  mastered: '已掌握',
};

export interface MasteryResult {
  score: number;
  level: MasteryLevel;
  /** 各信号明细（Progress 页解释「为什么是这个等级」） */
  signals: {
    animationWatched: boolean;
    quizAnswered: number;
    quizAccuracy: number | null; // 0–1；题量不足时为 null
    predictAttempts: number;
    predictAccuracy: number | null;
    challengeCompleted: boolean;
    reviewBoost: boolean;
  };
}

function quizSignal(quiz: Record<string, { attemptCount: number; correctCount: number }>): { points: number; answered: number; accuracy: number | null } {
  let attempts = 0;
  let correct = 0;
  for (const r of Object.values(quiz)) {
    attempts += r.attemptCount;
    correct += r.correctCount;
  }
  if (attempts >= 3) return { points: Math.round((correct / attempts) * 25), answered: attempts, accuracy: correct / attempts };
  if (attempts > 0) return { points: attempts * 5, answered: attempts, accuracy: correct / attempts };
  return { points: 0, answered: 0, accuracy: null };
}

function predictSignal(predict: { total: number; correct: number }): { points: number; attempts: number; accuracy: number | null } {
  if (predict.total >= 5) return { points: Math.round((predict.correct / predict.total) * 25), attempts: predict.total, accuracy: predict.correct / predict.total };
  if (predict.total > 0) return { points: predict.total * 4, attempts: predict.total, accuracy: predict.correct / predict.total };
  return { points: 0, attempts: 0, accuracy: null };
}

function challengeSignal(challenge: Record<string, { completed: boolean }>): boolean {
  return Object.values(challenge).some((c) => c.completed);
}

/** 判定「有任何学习记录」 */
export function hasAnyRecord(p: {
  viewCount: number;
  animationWatched: boolean;
  quiz: Record<string, unknown>;
  predict: { total: number };
  challenge: Record<string, unknown>;
}): boolean {
  return p.viewCount >= 1 || p.animationWatched || Object.keys(p.quiz).length > 0 || p.predict.total > 0 || Object.keys(p.challenge).length > 0;
}

/** 等级映射：无记录 not-started；有记录 0–44 learning；45–64 practicing；65–84 almost；85–100 mastered */
export function levelOf(score: number, hasRecord: boolean): MasteryLevel {
  if (!hasRecord) return 'not-started';
  if (score >= 85) return 'mastered';
  if (score >= 65) return 'almost';
  if (score >= 45) return 'practicing';
  return 'learning';
}

/** 计算单个算法的掌握度（纯函数） */
export function computeMastery(progress: {
  viewCount: number;
  animationWatched: boolean;
  lastViewedAt: string | null;
  quiz: Record<string, { attemptCount: number; correctCount: number; lastCorrect: boolean; lastAnsweredAt: string }>;
  predict: { total: number; correct: number; recent: unknown[] };
  challenge: Record<string, { completed: boolean; bestMistakes: number; attempts: number; lastCompletedAt: string | null }>;
}): MasteryResult {
  const hasRecord = hasAnyRecord(progress);
  const q = quizSignal(progress.quiz);
  const pr = predictSignal(progress.predict);
  const challengeDone = challengeSignal(progress.challenge);
  const reviewBoost = progress.viewCount >= 3;

  const score = Math.min(
    100,
    (progress.animationWatched ? 25 : 0) + q.points + pr.points + (challengeDone ? 20 : 0) + (reviewBoost ? 5 : 0),
  );

  return {
    score,
    level: levelOf(score, hasRecord),
    signals: {
      animationWatched: progress.animationWatched,
      quizAnswered: q.answered,
      quizAccuracy: q.accuracy,
      predictAttempts: pr.attempts,
      predictAccuracy: pr.accuracy,
      challengeCompleted: challengeDone,
      reviewBoost,
    },
  };
}
