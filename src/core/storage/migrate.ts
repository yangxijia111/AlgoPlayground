/**
 * 学习数据加载与迁移：绝不因 localStorage 数据损坏而让应用崩溃。
 * 规则（docs/LEARNING_DATA_SPEC.md §5 / STORAGE_RELIABILITY_SPEC §2–§4）：
 * 1. 无数据 → 全新档案（fresh）
 * 2. JSON 损坏 → 全新档案 + corrupted 通知（不立即覆盖写）
 * 3. 未来版本 → 拒绝加载且不写入（newer-version），避免旧代码破坏新数据
 * 4. 当前版本 → 逐字段防御性校验，坏字段修复为默认值（尽量保留可用数据）
 *
 * P11 两条分离路径：
 * - validateProfile（lenient local recovery）：加载 localStorage 用，修 invariant 尽量保数据
 * - strictValidateProfile（strict import validation）：用户导入文件用，坏数据明确失败
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

/** 真实存在的日期（YYYY-MM-DD 且 round-trip 一致）：拒绝 2026-99-99、2026-02-31 */
export function isRealLocalDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function asDayOrNull(v: unknown): string | null {
  return typeof v === 'string' && isRealLocalDate(v) ? v : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

// ---------------------------------------------------------------------------
// 严格图校验（与 validateGraphInput 规则对齐；供 savedGraph 与 Import 使用）
// ---------------------------------------------------------------------------

export interface StrictGraphResult {
  ok: boolean;
  graph?: GraphModel;
  error?: string;
}

/** 严格校验 GraphModel：节点/边全字段 + 自环/重复边规则（STORAGE_RELIABILITY_SPEC §6） */
export function strictValidateGraphModel(raw: unknown): StrictGraphResult {
  if (!isRecord(raw)) return { ok: false, error: '不是对象' };
  const nodesRaw = asArray(raw.nodes);
  const edgesRaw = asArray(raw.edges);
  if (nodesRaw.length < 1) return { ok: false, error: '图至少需要一个节点' };
  if (nodesRaw.length > 12) return { ok: false, error: '节点数不能超过 12' };
  if (edgesRaw.length > 24) return { ok: false, error: '边数不能超过 24' };
  const nodes: GraphModel['nodes'] = [];
  const ids = new Set<string>();
  for (const n of nodesRaw) {
    if (!isRecord(n)) return { ok: false, error: '节点不是对象' };
    const id = n.id;
    if (typeof id !== 'string' || id === '' || id.length > 16) return { ok: false, error: '节点 id 非法（非空字符串 ≤16 字符）' };
    if (ids.has(id)) return { ok: false, error: `节点 id 重复：${id}` };
    ids.add(id);
    const x = n.x;
    const y = n.y;
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1) return { ok: false, error: `节点 ${id} 的 x 必须是 [0,1] 内的数` };
    if (typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > 1) return { ok: false, error: `节点 ${id} 的 y 必须是 [0,1] 内的数` };
    nodes.push({ id, x, y });
  }
  const edges: GraphModel['edges'] = [];
  const edgeIds = new Set<string>();
  const seenPairs = new Set<string>();
  for (const e of edgesRaw) {
    if (!isRecord(e)) return { ok: false, error: '边不是对象' };
    const id = e.id;
    if (typeof id !== 'string' || id === '' || id.length > 32) return { ok: false, error: '边 id 非法' };
    if (edgeIds.has(id)) return { ok: false, error: `边 id 重复：${id}` };
    edgeIds.add(id);
    const from = e.from;
    const to = e.to;
    if (typeof from !== 'string' || typeof to !== 'string') return { ok: false, error: `边 ${id} 的 from/to 必须是字符串` };
    if (!ids.has(from) || !ids.has(to)) return { ok: false, error: `边 ${id} 引用了不存在的节点` };
    if (from === to) return { ok: false, error: `不允许自环边（${from}）` };
    const key = e.directed === true ? `${from}>${to}` : [from, to].sort().join('-');
    if (seenPairs.has(key)) return { ok: false, error: `存在重复边 ${from}-${to}` };
    seenPairs.add(key);
    const directed = e.directed;
    if (typeof directed !== 'boolean') return { ok: false, error: `边 ${id} 的 directed 必须是 boolean` };
    const weight = e.weight;
    if (typeof weight !== 'number' || !Number.isInteger(weight) || weight < 1 || weight > 99) {
      return { ok: false, error: `边 ${id} 的权重必须是 1–99 的整数` };
    }
    edges.push({ id, from, to, directed, weight });
  }
  return { ok: true, graph: { nodes, edges } };
}

// ---------------------------------------------------------------------------
// lenient 子结构校验（坏字段修复为默认；P11 起修跨字段 invariant）
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
  const attemptCount = asNumber(r.attemptCount, 0, 0);
  // invariant 修复：0 ≤ correctCount ≤ attemptCount
  const correctCount = Math.min(asNumber(r.correctCount, 0, 0), attemptCount);
  return {
    attemptCount,
    correctCount,
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
  const total = asNumber(r.total, 0, 0);
  // invariant 修复：0 ≤ correct ≤ total
  const correct = Math.min(asNumber(r.correct, 0, 0), total);
  return { total, correct, recent };
}

function validateChallengeRecord(raw: unknown): ChallengeRecord {
  const r = isRecord(raw) ? raw : {};
  const completed = asBool(r.completed, false);
  // invariant 修复：completed=false 不得保留伪完成时间
  const lastCompletedAt = completed ? asIsoOrNull(r.lastCompletedAt) : null;
  return {
    completed,
    bestMistakes: asNumber(r.bestMistakes, 0, 0),
    attempts: asNumber(r.attempts, 0, 0),
    lastCompletedAt,
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

function validateGraphModelLenient(raw: unknown): GraphModel | null {
  // lenient：不合法条目整体丢弃（保其余）
  const r = strictValidateGraphModel(raw);
  return r.ok ? (r.graph ?? null) : null;
}

function validateSavedGraph(raw: unknown): SavedGraph | null {
  if (!isRecord(raw)) return null;
  const graph = validateGraphModelLenient(raw.graph);
  const name = asString(raw.name, '');
  const id = asString(raw.id, '');
  if (graph === null || name === '' || id === '') return null;
  return { id, name, graph, createdAt: asIsoOrNull(raw.createdAt) ?? new Date(0).toISOString() };
}

/** 逐字段校验修复（尽量保留可用数据，坏字段重置默认；invariant 一并修复） */
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

  // 真实日期 + 去重 + 升序（P11：不再只 regex、不再保留重复）
  profile.activityDays = [...new Set(asArray(r.activityDays).map(asDayOrNull).filter((d): d is string => d !== null))].sort();

  return profile;
}

// ---------------------------------------------------------------------------
// strict import validation（用户主动导入：坏数据明确失败，不静默吞字段）
// ---------------------------------------------------------------------------

export type StrictProfileResult = { ok: true; profile: LearningProfile } | { ok: false; error: string };

/** 子结构校验结果（值类型随子结构） */
type StrictResult<T> = { ok: true; value: T } | { ok: false; error: string };

function strictFail(path: string, why: string): { ok: false; error: string } {
  return { ok: false, error: `${path}：${why}` };
}

function strictQuiz(path: string, raw: unknown): StrictResult<QuizRecord> {
  if (!isRecord(raw)) return strictFail(path, '不是对象');
  const attemptCount = raw.attemptCount;
  const correctCount = raw.correctCount;
  if (typeof attemptCount !== 'number' || !Number.isInteger(attemptCount) || attemptCount < 0) {
    return strictFail(`${path}.attemptCount`, '必须是 ≥0 的整数');
  }
  if (typeof correctCount !== 'number' || !Number.isInteger(correctCount) || correctCount < 0 || correctCount > attemptCount) {
    return strictFail(`${path}.correctCount`, '必须满足 0 ≤ correctCount ≤ attemptCount');
  }
  if (typeof raw.lastCorrect !== 'boolean') return strictFail(`${path}.lastCorrect`, '必须是 boolean');
  if (asIsoOrNull(raw.lastAnsweredAt) === null) return strictFail(`${path}.lastAnsweredAt`, '必须是合法 ISO 时间');
  return { ok: true, value: validateQuizRecord(raw) };
}

function strictPredictSummary(path: string, raw: unknown): StrictResult<PredictSummary> {
  if (!isRecord(raw)) return strictFail(path, '不是对象');
  const total = raw.total;
  const correct = raw.correct;
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 0) {
    return strictFail(`${path}.total`, '必须是 ≥0 的整数');
  }
  if (typeof correct !== 'number' || !Number.isInteger(correct) || correct < 0 || correct > total) {
    return strictFail(`${path}.correct`, '必须满足 0 ≤ correct ≤ total');
  }
  if (!Array.isArray(raw.recent)) return strictFail(`${path}.recent`, '必须是数组');
  return { ok: true, value: validatePredictSummary(raw) };
}

function strictChallenge(path: string, raw: unknown): StrictResult<ChallengeRecord> {
  if (!isRecord(raw)) return strictFail(path, '不是对象');
  const completed = raw.completed;
  if (typeof completed !== 'boolean') return strictFail(`${path}.completed`, '必须是 boolean');
  if (typeof raw.attempts !== 'number' || !Number.isInteger(raw.attempts) || raw.attempts < 0) {
    return strictFail(`${path}.attempts`, '必须是 ≥0 的整数');
  }
  if (typeof raw.bestMistakes !== 'number' || !Number.isInteger(raw.bestMistakes) || raw.bestMistakes < 0) {
    return strictFail(`${path}.bestMistakes`, '必须是 ≥0 的整数');
  }
  if (completed === false && raw.lastCompletedAt != null) {
    return strictFail(`${path}.lastCompletedAt`, 'completed=false 时不得携带完成时间');
  }
  if (raw.lastCompletedAt != null && asIsoOrNull(raw.lastCompletedAt) === null) {
    return strictFail(`${path}.lastCompletedAt`, '必须是合法 ISO 时间');
  }
  return { ok: true, value: validateChallengeRecord(raw) };
}

function strictProgress(path: string, raw: unknown): StrictResult<AlgorithmProgress> {
  if (!isRecord(raw)) return strictFail(path, '不是对象');
  // 语义：字段「存在但坏」拒绝；「缺失」交给 lenient 补默认（导出文件允许省略域）
  if (raw.quiz !== undefined) {
    if (!isRecord(raw.quiz)) return strictFail(`${path}.quiz`, '不是对象');
    for (const [k, v] of Object.entries(raw.quiz)) {
      const r = strictQuiz(`${path}.quiz.${k}`, v);
      if (!r.ok) return r;
    }
  }
  if (raw.predict !== undefined) {
    const p = strictPredictSummary(`${path}.predict`, raw.predict);
    if (!p.ok) return p;
  }
  if (raw.challenge !== undefined) {
    if (!isRecord(raw.challenge)) return strictFail(`${path}.challenge`, '不是对象');
    for (const [k, v] of Object.entries(raw.challenge)) {
      const r = strictChallenge(`${path}.challenge.${k}`, v);
      if (!r.ok) return r;
    }
  }
  if (raw.animationWatched !== undefined && typeof raw.animationWatched !== 'boolean') {
    return strictFail(`${path}.animationWatched`, '必须是 boolean');
  }
  if (raw.viewCount !== undefined && (typeof raw.viewCount !== 'number' || !Number.isInteger(raw.viewCount) || raw.viewCount < 0)) {
    return strictFail(`${path}.viewCount`, '必须是 ≥0 的整数');
  }
  return { ok: true, value: validateProgress(raw) };
}

/** strict import 校验：返回规范化 profile 或明确错误（含字段路径） */
export function strictValidateProfile(raw: unknown): StrictProfileResult {
  if (!isRecord(raw)) return strictFail('profile', '不是对象');
  const r = raw;

  if (r.progress !== undefined) {
    if (!isRecord(r.progress)) return strictFail('profile.progress', '不是对象');
    for (const [k, v] of Object.entries(r.progress)) {
      const res = strictProgress(`profile.progress.${k}`, v);
      if (!res.ok) return res;
    }
  }

  if (r.bookmarks !== undefined) {
    if (!Array.isArray(r.bookmarks)) return strictFail('profile.bookmarks', '必须是数组');
    for (const b of r.bookmarks) {
      if (!isRecord(b) || typeof b.targetId !== 'string' || b.targetId === '') {
        return strictFail('profile.bookmarks', '条目缺少 targetId');
      }
    }
  }

  if (r.notes !== undefined) {
    if (!isRecord(r.notes)) return strictFail('profile.notes', '不是对象');
    for (const [k, v] of Object.entries(r.notes)) {
      if (!isRecord(v) || typeof v.content !== 'string') return strictFail(`profile.notes.${k}`, '缺少 content');
      if (v.content.length > NOTE_MAX_LENGTH) return strictFail(`profile.notes.${k}.content`, `超过 ${NOTE_MAX_LENGTH} 字符`);
    }
  }

  if (r.savedGraphs !== undefined) {
    if (!Array.isArray(r.savedGraphs)) return strictFail('profile.savedGraphs', '必须是数组');
    if (r.savedGraphs.length > SAVED_GRAPH_LIMIT) return strictFail('profile.savedGraphs', `超过 ${SAVED_GRAPH_LIMIT} 条`);
    for (const g of r.savedGraphs) {
      if (!isRecord(g) || typeof g.id !== 'string' || g.id === '' || typeof g.name !== 'string' || g.name === '') {
        return strictFail('profile.savedGraphs', '条目缺少 id/name');
      }
      const gr = strictValidateGraphModel(g.graph);
      if (!gr.ok) return strictFail(`profile.savedGraphs(${g.name}).graph`, gr.error ?? '图数据非法');
    }
  }

  if (r.activityDays !== undefined) {
    if (!Array.isArray(r.activityDays)) return strictFail('profile.activityDays', '必须是数组');
    for (const d of r.activityDays) {
      if (typeof d !== 'string' || !isRealLocalDate(d)) {
        return strictFail('profile.activityDays', `${String(d)} 不是真实存在的日期（如 2026-02-31 会被拒绝）`);
      }
    }
    const unique = new Set(r.activityDays as string[]);
    if (unique.size !== (r.activityDays as string[]).length) {
      return strictFail('profile.activityDays', '存在重复日期');
    }
  }

  if (r.settings !== undefined) {
    if (!isRecord(r.settings)) return strictFail('profile.settings', '不是对象');
    if (typeof r.settings.beginnerMode !== 'boolean') return strictFail('profile.settings.beginnerMode', '必须是 boolean');
    if (typeof r.settings.welcomeDone !== 'boolean') return strictFail('profile.settings.welcomeDone', '必须是 boolean');
  }

  return { ok: true, profile: validateProfile(raw) };
}

// ---------------------------------------------------------------------------
// 迁移框架：键 = 数据的 storageVersion，值 = 迁移到下一版本的转换函数。
// v1→v2：补充 revision=0（跨标签页合并协议）。
// ---------------------------------------------------------------------------

type MigrationFn = (raw: Record<string, unknown>) => Record<string, unknown>;
const MIGRATIONS: Record<number, MigrationFn> = {
  1: (raw) => ({ ...raw, storageVersion: 2, revision: 0 }),
};

/** 把任意 raw 根对象迁移到当前版本；返回 null 表示不可迁移 */
export function migrateRoot(
  raw: unknown,
): { root: LearningStorageRoot } | { root: null; reason: 'corrupted' | 'newer-version' } {
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
  const revision = typeof current.revision === 'number' && Number.isInteger(current.revision) && current.revision >= 0 ? current.revision : 0;
  return { root: { storageVersion: STORAGE_VERSION, revision, profile: validateProfile(current.profile) } };
}

// ---------------------------------------------------------------------------
// 加载入口
// ---------------------------------------------------------------------------

export interface LoadResultV2 extends LoadResult {
  /** 远端 revision（跨标签页同步起点；fresh 为 0） */
  revision: number;
}

export function loadLearningProfile(storage: StorageLike): LoadResultV2 {
  let raw: string | null = null;
  try {
    raw = storage.getItem(LEARNING_STORAGE_KEY);
  } catch {
    return { profile: createDefaultProfile(), notice: 'fresh', revision: 0 };
  }
  if (raw === null || raw === '') return { profile: createDefaultProfile(), notice: 'fresh', revision: 0 };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { profile: createDefaultProfile(), notice: 'corrupted', revision: 0 };
  }
  const migrated = migrateRoot(parsed);
  if (migrated.root === null) {
    return { profile: createDefaultProfile(), notice: migrated.reason, revision: 0 };
  }
  return { profile: migrated.root.profile, notice: 'loaded', revision: migrated.root.revision };
}
