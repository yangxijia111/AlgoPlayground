/**
 * LearningStore：学习数据的单一事实来源（运行时内存 + 防抖持久化到 localStorage）。
 * 纯 TS 可订阅类（与 PlaybackEngine 同风格，headless 可测）；React 侧经 useSyncExternalStore 绑定。
 * 约束：所有修改必须走领域方法（组件禁止直写 localStorage）；更新采用不可变替换以配合 React。
 *
 * P11（STORAGE_RELIABILITY_SPEC）：
 * - PersistenceStatus：flush 失败不再静默，UI 可订阅真实持久化状态
 * - schema v2 + revision：每次成功写入 revision+1
 * - 跨标签页：storage event 传输抽象 + 域级合并（拒绝整包覆盖丢数据）
 */
import type { LearningProfile, LoadNotice } from '../learning/types';
import { LEARNING_STORAGE_KEY, STORAGE_VERSION, createDefaultProfile } from '../learning/types';
import { mergeDay, todayLocalDate } from '../learning/time';
import { loadLearningProfile, migrateRoot, type StorageLike } from './migrate';
import { mergeProfiles, windowStorageTransport, type SyncTransport } from './sync';

const SAVE_DEBOUNCE_MS = 300;

/** 持久化健康状态（flush 不再 catch{} 静默） */
export type PersistenceStatus = 'persistent' | 'memory-only' | 'write-failed' | 'quota-exceeded' | 'unavailable';

/** 深拷贝：profile 是纯 JSON 数据，JSON 序列化即可（无 Date/undefined 语义） */
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof DOMException || typeof e === 'object' || e instanceof Error)) return false;
  const err = e as { name?: string; code?: number };
  return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014;
}

export class LearningStore {
  private listeners = new Set<() => void>();
  private profile: LearningProfile;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastNotice: LoadNotice;
  /** 已领取的加载通知（UI 只提示一次） */
  private noticeTaken = false;
  private presetSeq = 0;
  /** 存储根 revision：每次成功写入 +1 */
  private revision: number;
  private status: PersistenceStatus;
  private statusListeners = new Set<() => void>();
  private unsubscribeSync: (() => void) | null = null;
  /** 合并写回进行中（避免自身写触发的回声再合并；storage event 本就不触发本 tab，双保险） */
  private applyingRemote = false;

  constructor(
    /** null = 内存模式（隐私模式等 localStorage 不可用场景） */
    private readonly storage: StorageLike | null,
    private readonly now: () => Date = () => new Date(),
    /** 跨标签页传输（生产传 windowStorageTransport(window)；测试可注入 fake；null = 关闭同步）。仅构造时订阅 */
    transport: SyncTransport | null = null,
  ) {
    if (storage === null) {
      this.profile = createDefaultProfile();
      this.lastNotice = 'fresh';
      this.revision = 0;
      this.status = 'memory-only';
      return;
    }
    const result = loadLearningProfile(storage);
    this.profile = result.profile;
    this.lastNotice = result.notice;
    this.revision = result.revision;
    this.status = 'persistent';
    if (transport !== null) {
      this.unsubscribeSync = transport.subscribe((key, value) => this.onRemoteWrite(key, value));
    }
  }

  dispose(): void {
    if (this.unsubscribeSync !== null) {
      this.unsubscribeSync();
      this.unsubscribeSync = null;
    }
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

  /** 持久化健康状态订阅（useSyncExternalStore 兼容，值为原始类型引用稳定） */
  subscribeStatus = (cb: () => void): (() => void) => {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  };

  getPersistenceStatus = (): PersistenceStatus => this.status;

  /** 加载通知（fresh/corrupted/newer-version/loaded），只返回一次 */
  takeNotice(): LoadNotice | null {
    if (this.noticeTaken) return null;
    this.noticeTaken = true;
    return this.lastNotice;
  }

  /** localStorage 不可用等场景的降级提示（兼容旧 API） */
  isPersistent(): boolean {
    return this.storage !== null;
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }

  private setStatus(s: PersistenceStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const cb of this.statusListeners) cb();
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

  /** 立即持久化（beforeunload / 页面隐藏时调用；测试中手动调用）。失败记录状态，不静默 */
  flush(): void {
    if (this.storage === null) return;
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.applyingRemote) return; // 远端合并结果已由调用路径写入
    try {
      this.revision += 1;
      const root = { storageVersion: STORAGE_VERSION, revision: this.revision, profile: this.profile };
      this.storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(root));
      this.setStatus('persistent');
    } catch (e) {
      // 持久化失败不再静默：UI 显示真实状态，内存数据继续可用
      this.setStatus(isQuotaError(e) ? 'quota-exceeded' : 'write-failed');
    }
  }

  // ---- 跨标签页合并 ----

  /** 收到其他 tab 写入通知：远端 revision 更新才域合并，合并后写回（revision 取 max+1） */
  private onRemoteWrite(key: string, value: string | null): void {
    if (this.storage === null) return;
    if (key !== LEARNING_STORAGE_KEY) return;
    if (value === null) return; // 远端 reset：本 tab 数据更全，保留本地
    try {
      const migrated = migrateRoot(JSON.parse(value));
      if (migrated.root === null) return; // 远端损坏不传染
      if (migrated.root.revision <= this.revision) return; // 旧回声
      const merged = mergeProfiles(this.profile, migrated.root.profile);
      this.applyingRemote = true;
      this.profile = merged;
      this.revision = Math.max(this.revision, migrated.root.revision) + 1;
      this.emit();
      try {
        this.storage.setItem(
          LEARNING_STORAGE_KEY,
          JSON.stringify({ storageVersion: STORAGE_VERSION, revision: this.revision, profile: this.profile }),
        );
        this.setStatus('persistent');
      } catch (e) {
        this.setStatus(isQuotaError(e) ? 'quota-exceeded' : 'write-failed');
      } finally {
        this.applyingRemote = false;
      }
    } catch {
      // 远端数据无法解析：忽略
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

  /** Import：整体替换（调用方负责先经 strictValidateProfile 校验）。revision 采用远端值+1 以便多端续增 */
  replaceProfile(p: LearningProfile, remoteRevision = 0): void {
    this.profile = deepClone(p);
    this.revision = Math.max(this.revision, remoteRevision) + 1;
    this.emit();
    this.scheduleSave();
  }

  /** 当前存储根 revision（测试/诊断用） */
  getRevision(): number {
    return this.revision;
  }

  /** Reset：仅清除 AlgoPlayground 自己的学习数据键，不动同域其他数据 */
  resetLearningData(): void {
    this.profile = createDefaultProfile();
    this.revision += 1;
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

/** 创建应用单例（storage 不可用时自动降级为内存模式；transport 接 window storage event） */
export function initLearningStore(storage: StorageLike | null): LearningStore {
  singleton = new LearningStore(storage, undefined, typeof window !== 'undefined' ? windowStorageTransport(window) : null);
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
    singleton = new LearningStore(storage, undefined, typeof window !== 'undefined' ? windowStorageTransport(window) : null);
  }
  return singleton;
}
