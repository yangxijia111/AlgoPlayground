/**
 * 学习数据加载与迁移：绝不因 localStorage 数据损坏而让应用崩溃。
 * 规则（docs/LEARNING_DATA_SPEC.md §5）：
 * 1. 无数据 → 全新档案（fresh）
 * 2. JSON 损坏 → 全新档案 + corrupted 通知（不立即覆盖写）
 * 3. 未来版本 → 拒绝加载且不写入（newer-version），避免旧代码破坏新数据
 * 4. 当前版本 → 逐字段防御性校验，坏字段修复为默认值（尽量保留可用数据）
 */
import {
  createDefaultProfile,
  type AlgorithmProgress,
  type BookmarkEntry,
  type ChallengeRecord,
  type LearningProfile,
  type LearningStorageRoot,
  type LoadNotice,
  type NoteEntry,
  type PredictAttempt,
  type PredictSummary,
  type QuizRecord,
  type SavedGraph,
  type LearningSettings,
  LEARNING_STORAGE_KEY,
  NOTE_MAX_LENGTH,
  PREDICT_RECENT_LIMIT,
  SAVED_GRAPH_LIMIT,
  STORAGE_VERSION,
} from '../learning/types';
import type { GraphModel } from '../registry';

/** 最小存储接口（兼容 localStorage，测试可注入内存实现） */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  profile: LearningProfile;
  notice: LoadNotice;
}

// ---------------------------------------------------------------------------
// 防御性类型工具（不信任任何来自 storage 的数据）
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback: number, min: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min) return fallback;
  return Math.floor(v);
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asIsoOrNull(v: unknown): string | null {
  // ISO 8601 可被 Date 解析才接受
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : v;
}

function asDayOrNull(v: unknown): string | null {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

// ---------------------------------------------------------------------------
// 子结构校验
// ---------------------------------------------------------------------------

function validateSettings(raw: unknown): LearningSettings {
  const r = isRecord(raw) ? raw : {};
  return {
    beginnerMode: asBool(r.beginnerMode, false),
    welcomeDone: asBool(r.welcomeDone, false),
  };
}

function validateQuizRecord(raw: unknown): QuizRecord {
  const r = isRecord(raw) ? raw : {};
  return {
    attemptCount: asNumber(r.attemptCount, 0, 0),
    correctCount: asNumber(r.correctCount, 0, 0),
    lastCorrect: asBool(r.lastCorrect, false),
    lastAnsweredAt: asIsoOrNull(r.lastAnsweredAt) ?? new Date(0).toISOString(),
  };
}

function validatePredictAttempt(raw: unknown): PredictAttempt {
  const r = isRecord(raw) ? raw : {};
  return {
    at: asIsoOrNull(r.at) ?? new Date(0).toISOString(),
    stepIndex: asNumber(r.stepIndex, 0, 0),
    stepType: asString(r.stepType, 'unknown'),
    correct: asBool(r.correct, false),
  };
}

function validatePredictSummary(raw: unknown): PredictSummary {
  const r = isRecord(raw) ? raw : {};
  const recent = asArray(r.recent).slice(-PREDICT_RECENT_LIMIT).map(validatePredictAttempt);
  return {
    total: asNumber(r.total, 0, 0),
    correct: asNumber(r.correct, 0, 0),
    recent,
  };
}

function validateChallengeRecord(raw: unknown): ChallengeRecord {
  const r = isRecord(raw) ? raw : {};
  return {
    completed: asBool(r.completed, false),
    bestMistakes: asNumber(r.bestMistakes, 0, 0),
    attempts: asNumber(r.attempts, 0, 0),
    lastCompletedAt: asIsoOrNull(r.lastCompletedAt),
  };
}

function validateProgress(raw: unknown): AlgorithmProgress {
  const r = isRecord(raw) ? raw : {};
  const quiz: Record<string, QuizRecord> = {};
  const qr = isRecord(r.quiz) ? r.quiz : {};
  for (const [k, v] of Object.entries(qr)) quiz[k] = validateQuizRecord(v);
  const challenge: Record<string, ChallengeRecord> = {};
  const cr = isRecord(r.challenge) ? r.challenge : {};
  for (const [k, v] of Object.entries(cr)) challenge[k] = validateChallengeRecord(v);
  return {
    animationWatched: asBool(r.animationWatched, false),
    viewCount: asNumber(r.viewCount, 0, 0),
    lastViewedAt: asIsoOrNull(r.lastViewedAt),
    quiz,
    predict: validatePredictSummary(r.predict),
    challenge,
  };
}

function validateBookmark(raw: unknown): BookmarkEntry | null {
  if (!isRecord(raw)) return null;
  const targetId = asString(raw.targetId, '');
  if (targetId === '') return null;
  return { targetId, addedAt: asIsoOrNull(raw.addedAt) ?? new Date(0).toISOString() };
}

function validateNote(raw: unknown): NoteEntry {
  const r = isRecord(raw) ? raw : {};
  const content = asString(r.content, '').slice(0, NOTE_MAX_LENGTH);
  return { content, updatedAt: asIsoOrNull(r.updatedAt) ?? new Date(0).toISOString() };
}

function validateGraphModel(raw: unknown): GraphModel | null {
  if (!isRecord(raw)) return null;
  const nodes = asArray(raw.nodes);
  const edges = asArray(raw.edges);
  // 粗校验：节点/边结构存在即可（图本身合法性由图编辑器加载时再校验）
  const okNodes = nodes.every((n) => isRecord(n) && typeof (n as Record<string, unknown>).id === 'string');
  const okEdges = edges.every((e) => isRecord(e) && typeof (e as Record<string, unknown>).id === 'string');
  if (!okNodes || !okEdges) return null;
  return raw as unknown as GraphModel;
}

function validateSavedGraph(raw: unknown): SavedGraph | null {
  if (!isRecord(raw)) return null;
  const graph = validateGraphModel(raw.graph);
  const name = asString(raw.name, '');
  const id = asString(raw.id, '');
  if (graph === null || name === '' || id === '') return null;
  return { id, name, graph, createdAt: asIsoOrNull(raw.createdAt) ?? new Date(0).toISOString() };
}

/** 逐字段校验修复（尽量保留可用数据，坏字段重置默认） */
export function validateProfile(raw: unknown): LearningProfile {
  const r = isRecord(raw) ? raw : {};
  const profile = createDefaultProfile();

  const progress: Record<string, AlgorithmProgress> = {};
  const pr = isRecord(r.progress) ? r.progress : {};
  for (const [k, v] of Object.entries(pr)) progress[k] = validateProgress(v);
  profile.progress = progress;

  profile.bookmarks = asArray(r.bookmarks)
    .map(validateBookmark)
    .filter((b): b is BookmarkEntry => b !== null);

  const notes: Record<string, NoteEntry> = {};
  const nr = isRecord(r.notes) ? r.notes : {};
  for (const [k, v] of Object.entries(nr)) notes[k] = validateNote(v);
  profile.notes = notes;

  profile.savedGraphs = asArray(r.savedGraphs)
    .map(validateSavedGraph)
    .filter((g): g is SavedGraph => g !== null)
    .slice(-SAVED_GRAPH_LIMIT);

  profile.settings = validateSettings(r.settings);

  profile.activityDays = asArray(r.activityDays)
    .map(asDayOrNull)
    .filter((d): d is string => d !== null)
    .sort();

  return profile;
}

// ---------------------------------------------------------------------------
// 迁移框架：键 = 数据的 storageVersion，值 = 迁移到下一版本的转换函数。
// 未来 v1→v2：在 v1 处注册转换并把 STORAGE_VERSION 提升为 2。
// ---------------------------------------------------------------------------

type MigrationFn = (raw: Record<string, unknown>) => Record<string, unknown>;
const MIGRATIONS: Record<number, MigrationFn> = {};

/** 把任意 raw 根对象迁移到当前版本；返回 null 表示不可迁移 */
export function migrateRoot(raw: unknown): { root: LearningStorageRoot } | { root: null; reason: 'corrupted' | 'newer-version' } {
  if (!isRecord(raw)) return { root: null, reason: 'corrupted' };
  let version = raw.storageVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) return { root: null, reason: 'corrupted' };
  if (version > STORAGE_VERSION) return { root: null, reason: 'newer-version' };

  let current: Record<string, unknown> = raw;
  while (version < STORAGE_VERSION) {
    const fn = MIGRATIONS[version];
    if (!fn) return { root: null, reason: 'corrupted' };
    current = fn(current);
    version++;
  }
  return { root: { storageVersion: STORAGE_VERSION, profile: validateProfile(current.profile) } };
}

// ---------------------------------------------------------------------------
// 加载入口
// ---------------------------------------------------------------------------

export function loadLearningProfile(storage: StorageLike): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(LEARNING_STORAGE_KEY);
  } catch {
    return { profile: createDefaultProfile(), notice: 'fresh' };
  }
  if (raw === null || raw === '') return { profile: createDefaultProfile(), notice: 'fresh' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { profile: createDefaultProfile(), notice: 'corrupted' };
  }
  const migrated = migrateRoot(parsed);
  if (migrated.root === null) {
    return { profile: createDefaultProfile(), notice: migrated.reason };
  }
  return { profile: migrated.root.profile, notice: 'loaded' };
}
