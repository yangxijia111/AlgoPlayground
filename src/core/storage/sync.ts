/**
 * 跨标签页同步（STORAGE_RELIABILITY_SPEC §5）：
 * - 传输抽象 SyncTransport（生产 = window storage event；测试 = fake transport）
 * - 域级合并：拒绝整包 Last-Writer-Wins 覆盖，各域按「信息量更大/更新」合并
 * - revision 单调递增；远端 revision 更高才触发合并
 */
import type { LearningProfile } from '../learning/types';
import { PREDICT_RECENT_LIMIT, SAVED_GRAPH_LIMIT } from '../learning/types';

/** 同步传输层抽象（jsdom 难以真实触发 storage event，测试注入 fake） */
export interface SyncTransport {
  subscribe(cb: (key: string, value: string | null) => void): () => void;
}

type StorageEventLike = { key: string | null; newValue: string | null };

/** 生产实现：window 的 storage 事件（同源其他 tab 写入本 key 时触发，本 tab 不触发） */
export function windowStorageTransport(win: Window): SyncTransport {
  return {
    subscribe(cb) {
      const handler = (e: Event) => {
        const se = e as unknown as StorageEventLike;
        cb(typeof se.key === 'string' ? se.key : '', se.newValue);
      };
      win.addEventListener('storage', handler);
      return () => win.removeEventListener('storage', handler);
    },
  };
}

// ---------------------------------------------------------------------------
// 域合并
// ---------------------------------------------------------------------------

const later = (a: string | null, b: string | null): string | null => {
  if (a === null) return b;
  if (b === null) return a;
  return Date.parse(b) > Date.parse(a) || (Date.parse(b) === Date.parse(a) && b > a) ? b : a;
};

function mergeQuiz(
  local: LearningProfile['progress'][string]['quiz'],
  remote: LearningProfile['progress'][string]['quiz'],
): LearningProfile['progress'][string]['quiz'] {
  const out = { ...local };
  for (const [qid, rq] of Object.entries(remote)) {
    const lq = out[qid];
    if (!lq) {
      out[qid] = rq;
      continue;
    }
    // 信息量更大者胜：attemptCount 优先，相等比 correctCount，再相等取本地
    if (rq.attemptCount > lq.attemptCount || (rq.attemptCount === lq.attemptCount && rq.correctCount > lq.correctCount)) {
      out[qid] = rq;
    }
  }
  return out;
}

function mergePredict(
  local: LearningProfile['progress'][string]['predict'],
  remote: LearningProfile['progress'][string]['predict'],
): LearningProfile['progress'][string]['predict'] {
  const merged = [
    ...local.recent.map((r) => ({ ...r })),
    ...remote.recent.map((r) => ({ ...r })),
  ].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  // 按 at 去重（保留后出现者，其 correct 与本地一致才有意义）
  const seen = new Map<string, typeof merged[number]>();
  for (const m of merged) seen.set(`${m.at}|${m.stepIndex}`, m);
  return {
    total: Math.max(local.total, remote.total),
    correct: Math.max(local.correct, remote.correct),
    recent: [...seen.values()].slice(-PREDICT_RECENT_LIMIT),
  };
}

function mergeChallenge(
  local: LearningProfile['progress'][string]['challenge'],
  remote: LearningProfile['progress'][string]['challenge'],
): LearningProfile['progress'][string]['challenge'] {
  const out = { ...local };
  for (const [cid, rc] of Object.entries(remote)) {
    const lc = out[cid];
    if (!lc) {
      out[cid] = rc;
      continue;
    }
    out[cid] = {
      completed: lc.completed || rc.completed,
      bestMistakes: Math.min(lc.bestMistakes, rc.bestMistakes),
      attempts: Math.max(lc.attempts, rc.attempts),
      lastCompletedAt: later(lc.lastCompletedAt, rc.lastCompletedAt),
    };
  }
  return out;
}

function mergeProgressDomain(
  local: LearningProfile['progress'],
  remote: LearningProfile['progress'],
): LearningProfile['progress'] {
  const out: LearningProfile['progress'] = { ...local };
  for (const [algoId, rp] of Object.entries(remote)) {
    const lp = out[algoId];
    if (!lp) {
      out[algoId] = rp;
      continue;
    }
    out[algoId] = {
      animationWatched: lp.animationWatched || rp.animationWatched,
      viewCount: Math.max(lp.viewCount, rp.viewCount),
      lastViewedAt: later(lp.lastViewedAt, rp.lastViewedAt),
      quiz: mergeQuiz(lp.quiz, rp.quiz),
      predict: mergePredict(lp.predict, rp.predict),
      challenge: mergeChallenge(lp.challenge, rp.challenge),
    };
  }
  return out;
}

/** 域级合并入口：两个 profile 合并为并集/信息量更大者 */
export function mergeProfiles(local: LearningProfile, remote: LearningProfile): LearningProfile {
  // notes：按 algorithmId 取 updatedAt 新者
  const notes: LearningProfile['notes'] = { ...local.notes };
  for (const [algoId, rn] of Object.entries(remote.notes)) {
    const ln = notes[algoId];
    if (!ln || Date.parse(rn.updatedAt) > Date.parse(ln.updatedAt)) notes[algoId] = rn;
  }

  // bookmarks：按 targetId 并集，冲突取 addedAt 新
  const bookmarkMap = new Map(local.bookmarks.map((b) => [b.targetId, b]));
  for (const rb of remote.bookmarks) {
    const lb = bookmarkMap.get(rb.targetId);
    if (!lb || Date.parse(rb.addedAt) > Date.parse(lb.addedAt)) bookmarkMap.set(rb.targetId, rb);
  }

  // savedGraphs：按 id 并集，冲突取 createdAt 新，截尾
  const graphMap = new Map(local.savedGraphs.map((g) => [g.id, g]));
  for (const rg of remote.savedGraphs) {
    const lg = graphMap.get(rg.id);
    if (!lg || Date.parse(rg.createdAt) > Date.parse(lg.createdAt)) graphMap.set(rg.id, rg);
  }

  return {
    progress: mergeProgressDomain(local.progress, remote.progress),
    bookmarks: [...bookmarkMap.values()],
    notes,
    savedGraphs: [...graphMap.values()].slice(-SAVED_GRAPH_LIMIT),
    settings: {
      beginnerMode: local.settings.beginnerMode || remote.settings.beginnerMode,
      welcomeDone: local.settings.welcomeDone || remote.settings.welcomeDone,
    },
    // activityDays：并集去重升序
    activityDays: [...new Set([...local.activityDays, ...remote.activityDays])].sort(),
  };
}
