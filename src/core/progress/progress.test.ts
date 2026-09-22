/**
 * 掌握度规则测试：PROGRESS_SPEC §4 锚定表逐行对齐 + 边界。
 */
import { describe, expect, it } from 'vitest';
import { createDefaultProfile, type AlgorithmProgress, type LearningProfile } from '../learning/types';
import { computeMastery, levelOf } from './mastery';
import { bookmarkLabel, categoryRows, progressRows, progressSummary, recentlyViewed } from './summary';
import { allEntries } from '../algorithms';
import { registerAll } from '../registry';

registerAll(allEntries);

function emptyProgress(): AlgorithmProgress {
  return {
    animationWatched: false,
    viewCount: 0,
    lastViewedAt: null,
    quiz: {},
    predict: { total: 0, correct: 0, recent: [] },
    challenge: {},
  };
}

function quizOf(n: number, correct: number) {
  const quiz: AlgorithmProgress['quiz'] = {};
  for (let i = 0; i < n; i++) quiz[`q${i}`] = { attemptCount: 1, correctCount: i < correct ? 1 : 0, lastCorrect: i < correct, lastAnsweredAt: '2026-09-22T00:00:00.000Z' };
  return quiz;
}

describe('锚定表（PROGRESS_SPEC §4）', () => {
  it('零记录 → 0 分 not-started', () => {
    const r = computeMastery(emptyProgress());
    expect(r.score).toBe(0);
    expect(r.level).toBe('not-started');
  });

  it('仅 viewCount=1 → 0 分 learning（有记录但分数低归 learning）', () => {
    const p = { ...emptyProgress(), viewCount: 1 };
    const r = computeMastery(p);
    expect(r.score).toBe(0);
    expect(r.level).toBe('learning');
  });

  it('仅看完动画 → 25 learning', () => {
    const r = computeMastery({ ...emptyProgress(), animationWatched: true });
    expect(r.score).toBe(25);
    expect(r.level).toBe('learning');
  });

  it('动画 + Quiz 3 题对 2 → 42 learning（round(2/3×25)=17）', () => {
    const r = computeMastery({ ...emptyProgress(), animationWatched: true, quiz: quizOf(3, 2) });
    expect(r.score).toBe(42);
    expect(r.level).toBe('learning');
  });

  it('动画 + Quiz 5 全对 → 50 practicing', () => {
    const r = computeMastery({ ...emptyProgress(), animationWatched: true, quiz: quizOf(5, 5) });
    expect(r.score).toBe(50);
    expect(r.level).toBe('practicing');
  });

  it('动画 + Quiz 全对 + Predict 10 对 8 → 70 almost', () => {
    const r = computeMastery({
      ...emptyProgress(),
      animationWatched: true,
      quiz: quizOf(5, 5),
      predict: { total: 10, correct: 8, recent: [] },
    });
    expect(r.score).toBe(70);
    expect(r.level).toBe('almost');
  });

  it('动画 + Quiz 全对 + Predict 10 对 8 + Challenge → 90 mastered', () => {
    const r = computeMastery({
      ...emptyProgress(),
      animationWatched: true,
      quiz: quizOf(5, 5),
      predict: { total: 10, correct: 8, recent: [] },
      challenge: { 'bubble-pass': { completed: true, bestMistakes: 0, attempts: 1, lastCompletedAt: '2026-09-22T00:00:00.000Z' } },
    });
    expect(r.score).toBe(90);
    expect(r.level).toBe('mastered');
  });

  it('全部信号 + viewCount≥3 → 100 mastered', () => {
    const r = computeMastery({
      ...emptyProgress(),
      animationWatched: true,
      quiz: quizOf(5, 5),
      predict: { total: 5, correct: 5, recent: [] },
      challenge: { 'bubble-pass': { completed: true, bestMistakes: 0, attempts: 1, lastCompletedAt: null } },
      viewCount: 3,
    });
    expect(r.score).toBe(100);
    expect(r.level).toBe('mastered');
    expect(r.signals.reviewBoost).toBe(true);
  });
});

describe('边界', () => {
  it('Quiz 1–2 题按 5 分/题：2 题对 2 → 10 分', () => {
    const r = computeMastery({ ...emptyProgress(), quiz: quizOf(2, 2) });
    expect(r.score).toBe(10);
    expect(r.level).toBe('learning');
  });

  it('Predict 1–4 次按 4 分/次：4 次 → 16 分', () => {
    const r = computeMastery({ ...emptyProgress(), predict: { total: 4, correct: 4, recent: [] } });
    expect(r.score).toBe(16);
    expect(r.level).toBe('learning');
  });

  it('challenge completed=false 不计分', () => {
    const r = computeMastery({
      ...emptyProgress(),
      challenge: { x: { completed: false, bestMistakes: 3, attempts: 2, lastCompletedAt: null } },
    });
    expect(r.score).toBe(0);
    expect(r.signals.challengeCompleted).toBe(false);
    expect(r.level).toBe('learning'); // 有挑战尝试记录 → 有记录
  });

  it('levelOf 边界值：44/45/64/65/84/85', () => {
    expect(levelOf(44, true)).toBe('learning');
    expect(levelOf(45, true)).toBe('practicing');
    expect(levelOf(64, true)).toBe('practicing');
    expect(levelOf(65, true)).toBe('almost');
    expect(levelOf(84, true)).toBe('almost');
    expect(levelOf(85, true)).toBe('mastered');
    expect(levelOf(100, false)).toBe('not-started'); // 无记录优先
  });
});

describe('聚合计算', () => {
  it('progressSummary 统计学习天数/练习次数/已学/已掌握', () => {
    const profile: LearningProfile = createDefaultProfile();
    profile.activityDays = ['2026-09-21', '2026-09-22'];
    profile.progress['bubble-sort'] = {
      ...emptyProgress(),
      viewCount: 2,
      animationWatched: true,
      quiz: quizOf(5, 5),
      predict: { total: 10, correct: 8, recent: [] },
      challenge: { 'bubble-pass': { completed: true, bestMistakes: 0, attempts: 1, lastCompletedAt: null } },
    };
    profile.progress['concept:time-complexity'] = { ...emptyProgress(), viewCount: 1 };
    const s = progressSummary(profile);
    expect(s.learningDays).toBe(2);
    expect(s.totalPractice).toBe(5 + 10 + 1);
    expect(s.studiedCount).toBe(1);
    expect(s.masteredCount).toBe(1);
    expect(s.bookmarks).toBe(0);
  });

  it('progressRows 覆盖全部注册算法且跳过 concept 键', () => {
    const profile = createDefaultProfile();
    const rows = progressRows(profile);
    expect(rows.length).toBe(allEntries.length);
    expect(rows.every((r) => !r.algorithmId.startsWith('concept:'))).toBe(true);
  });

  it('categoryRows 每分类总分等于该类算法数', () => {
    const profile = createDefaultProfile();
    const rows = categoryRows(profile);
    const total = rows.reduce((s, c) => s + c.total, 0);
    expect(total).toBe(allEntries.length);
  });

  it('recentlyViewed 按 lastViewedAt 倒序', () => {
    const profile = createDefaultProfile();
    profile.progress['a'] = { ...emptyProgress(), lastViewedAt: '2026-09-21T00:00:00.000Z' };
    profile.progress['b'] = { ...emptyProgress(), lastViewedAt: '2026-09-22T00:00:00.000Z' };
    const rec = recentlyViewed(profile);
    expect(rec.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('bookmarkLabel 命中算法名与概念课前缀', () => {
    expect(bookmarkLabel('bubble-sort')).toBe('冒泡排序');
    expect(bookmarkLabel('concept:time-complexity')).toBe('概念课：time-complexity');
    expect(bookmarkLabel('nope')).toBe('nope');
  });
});
