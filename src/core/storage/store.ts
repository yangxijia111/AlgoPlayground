/**
 * LearningStore：学习数据的单一事实来源（运行时内存 + 防抖持久化到 localStorage）。
 * 纯 TS 可订阅类（与 PlaybackEngine 同风格，headless 可测）；React 侧经 useSyncExternalStore 绑定。
 * 约束：所有修改必须走领域方法（组件禁止直写 localStorage）；更新采用不可变替换以配合 React。
 */
import type { LearningProfile, LoadNotice } from '../learning/types';
import { LEARNING_STORAGE_KEY, STORAGE_VERSION, createDefaultProfile } from '../learning/types';
import { mergeDay, todayLocalDate } from '../learning/time';
import { loadLearningProfile, type StorageLike } from './migrate';

const SAVE_DEBOUNCE_MS = 300;

/** 深拷贝：profile 是纯 JSON 数据，JSON 序列化即可（无 Date/undefined 语义） */
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class LearningStore {
  private listeners = new Set<() => void>();
  private profile: LearningProfile;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastNotice: LoadNotice;
  /** 已领取的加载通知（UI 只提示一次） */
  private noticeTaken = false;
  private presetSeq = 0;

  constructor(
    /** null = 内存模式（隐私模式等 localStorage 不可用场景） */
    private readonly storage: StorageLike | null,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (storage === null) {
      this.profile = createDefaultProfile();
      this.lastNotice = 'fresh';
      return;
    }
    const result = loadLearningProfile(storage);
    this.profile = result.profile;
    this.lastNotice = result.notice;
  }

  // ---- 订阅 ----

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  /** getSnapshot：引用稳定（不可变更新，仅在变化时替换） */
  getProfile = (): LearningProfile => this.profile;

  /** 加载通知（fresh/corrupted/newer-version/loaded），只返回一次 */
  takeNotice(): LoadNotice | null {
    if (this.noticeTaken) return null;
    this.noticeTaken = true;
    return this.lastNotice;
  }

  /** localStorage 不可用等场景的降级提示 */
  isPersistent(): boolean {
    return this.storage !== null;
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }

  /** 更新档案（fn 收到深拷贝，返回新档案），并安排持久化 */
  private update(mutate: (draft: LearningProfile) => void): void {
    const draft = deepClone(this.profile);
    mutate(draft);
    this.touchActivity(draft);
    this.profile = draft;
    this.emit();
    this.scheduleSave();
  }

  /** 任何一次领域写入都记入活动日期 */
  private touchActivity(draft: LearningProfile): void {
    draft.activityDays = mergeDay(draft.activityDays, todayLocalDate(this.now()));
  }

  private scheduleSave(): void {
    if (this.storage === null) return;
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  }

  /** 立即持久化（beforeunload / 页面隐藏时调用；测试中手动调用） */
  flush(): void {
    if (this.storage === null) return;
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      const root = { storageVersion: STORAGE_VERSION, profile: this.profile };
      this.storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(root));
    } catch {
      // 持久化失败静默降级（内存模式继续工作）
    }
  }

  // ---- 算法进度 ----

  private ensureProgress(draft: LearningProfile, algorithmId: string) {
    let p = draft.progress[algorithmId];
    if (!p) {
      p = {
        animationWatched: false,
        viewCount: 0,
        lastViewedAt: null,
        quiz: {},
        predict: { total: 0, correct: 0, recent: [] },
        challenge: {},
      };
      draft.progress[algorithmId] = p;
    }
    return p;
  }

  recordAlgorithmView(algorithmId: string): void {
    this.update((draft) => {
      const p = this.ensureProgress(draft, algorithmId);
      p.viewCount += 1;
      p.lastViewedAt = this.now().toISOString();
    });
  }

  markAnimationWatched(algorithmId: string): void {
    this.update((draft) => {
      const p = this.ensureProgress(draft, algorithmId);
      if (p.animationWatched) return;
      p.animationWatched = true;
    });
  }

  // ---- Quiz ----

  recordQuizAnswer(algorithmId: string, questionId: string, correct: boolean): void {
    this.update((draft) => {
      const p = this.ensureProgress(draft, algorithmId);
      const prev = p.quiz[questionId];
      p.quiz[questionId] = {
        attemptCount: (prev?.attemptCount ?? 0) + 1,
        correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
        lastCorrect: correct,
        lastAnsweredAt: this.now().toISOString(),
      };
    });
  }

  // ---- Predict ----

  recordPredictAttempt(
    algorithmId: string,
    attempt: { stepIndex: number; stepType: string; correct: boolean },
  ): void {
    this.update((draft) => {
      const p = this.ensureProgress(draft, algorithmId);
      p.predict.total += 1;
      if (attempt.correct) p.predict.correct += 1;
      p.predict.recent = [
        ...p.predict.recent,
        { at: this.now().toISOString(), stepIndex: attempt.stepIndex, stepType: attempt.stepType, correct: attempt.correct },
      ].slice(-50);
    });
  }

  // ---- Challenge ----

  recordChallengeResult(algorithmId: string, challengeId: string, completed: boolean, mistakes: number): void {
    this.update((draft) => {
      const p = this.ensureProgress(draft, algorithmId);
      const prev = p.challenge[challengeId];
      const best = Math.min(prev?.bestMistakes ?? Number.POSITIVE_INFINITY, mistakes);
      p.challenge[challengeId] = {
        completed: (prev?.completed ?? false) || completed,
        bestMistakes: Number.isFinite(best) ? best : 0,
        attempts: (prev?.attempts ?? 0) + 1,
        lastCompletedAt: completed ? this.now().toISOString() : (prev?.lastCompletedAt ?? null),
      };
    });
  }

  // ---- Bookmarks / Notes ----

  toggleBookmark(targetId: string): void {
    this.update((draft) => {
      const idx = draft.bookmarks.findIndex((b) => b.targetId === targetId);
      if (idx >= 0) draft.bookmarks.splice(idx, 1);
      else draft.bookmarks.push({ targetId, addedAt: this.now().toISOString() });
    });
  }

  isBookmarked(targetId: string): boolean {
    return this.profile.bookmarks.some((b) => b.targetId === targetId);
  }

  saveNote(algorithmId: string, content: string): void {
    this.update((draft) => {
      draft.notes[algorithmId] = { content: content.slice(0, 5000), updatedAt: this.now().toISOString() };
    });
  }

  // ---- 图预设 ----

  /** 保存图预设。返回生成的唯一 id */
  saveGraphPreset(name: string, graph: LearningProfile['savedGraphs'][number]['graph']): string {
    const id = `graph-${this.now().getTime().toString(36)}-${(this.presetSeq++).toString(36)}`;
    this.update((draft) => {
      draft.savedGraphs.push({ id, name, graph: deepClone(graph), createdAt: this.now().toISOString() });
      if (draft.savedGraphs.length > 20) {
        draft.savedGraphs = draft.savedGraphs.slice(-20);
      }
    });
    return id;
  }

  deleteGraphPreset(id: string): void {
    this.update((draft) => {
      draft.savedGraphs = draft.savedGraphs.filter((g) => g.id !== id);
    });
  }

  // ---- 设置 ----

  setBeginnerMode(on: boolean): void {
    if (this.profile.settings.beginnerMode === on) return;
    this.update((draft) => {
      draft.settings.beginnerMode = on;
    });
  }

  markWelcomeDone(): void {
    if (this.profile.settings.welcomeDone) return;
    this.update((draft) => {
      draft.settings.welcomeDone = true;
    });
  }

  // ---- 整体操作 ----

  /** Import：整体替换（调用方负责先校验版本与 schema） */
  replaceProfile(p: LearningProfile): void {
    this.profile = deepClone(p);
    this.emit();
    this.scheduleSave();
  }

  /** Reset：仅清除 AlgoPlayground 自己的学习数据键，不动同域其他数据 */
  resetLearningData(): void {
    this.profile = createDefaultProfile();
    this.emit();
    if (this.storage === null) return;
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      this.storage.removeItem(LEARNING_STORAGE_KEY);
    } catch {
      // 忽略
    }
  }
}

// ---------------------------------------------------------------------------
// 应用级单例（惰性创建；测试使用独立实例，不经过这里）
// ---------------------------------------------------------------------------

let singleton: LearningStore | null = null;

/** 创建应用单例（storage 不可用时自动降级为内存模式） */
export function initLearningStore(storage: StorageLike | null): LearningStore {
  singleton = new LearningStore(storage);
  return singleton;
}

export function getLearningStore(): LearningStore {
  if (singleton === null) {
    let storage: StorageLike | null = null;
    try {
      if (typeof localStorage !== 'undefined') storage = localStorage;
    } catch {
      storage = null;
    }
    singleton = new LearningStore(storage);
  }
  return singleton;
}
