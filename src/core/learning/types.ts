/**
 * 学习数据类型定义（v1 schema）。
 * 单一事实来源与持久化见 src/core/storage/；字段语义见 docs/LEARNING_DATA_SPEC.md。
 * 约定：所有时间一律 ISO 8601 字符串；所有记录均有界（防止 localStorage 无限增长）。
 */
import type { GraphModel } from '../registry';

/** 当前学习数据 schema 版本；未来结构性变更必须 +1 并注册迁移函数 */
export const STORAGE_VERSION = 1;

/** localStorage 键名（禁止 localStorage.clear()，只操作自己的键） */
export const LEARNING_STORAGE_KEY = 'algoplayground-learning';

/** 学习记录容量上限 */
export const PREDICT_RECENT_LIMIT = 50;
export const SAVED_GRAPH_LIMIT = 20;
export const NOTE_MAX_LENGTH = 5000;

// ---------------------------------------------------------------------------
// 子结构
// ---------------------------------------------------------------------------

export interface LearningSettings {
  /** Beginner Mode 全局开关（关闭 = Standard） */
  beginnerMode: boolean;
  /** 首次使用引导是否已完成 */
  welcomeDone: boolean;
}

export interface QuizRecord {
  attemptCount: number;
  correctCount: number;
  lastCorrect: boolean;
  /** ISO 8601 */
  lastAnsweredAt: string;
}

export interface PredictAttempt {
  /** ISO 8601 */
  at: string;
  stepIndex: number;
  /** deriveStepKind 的结果 */
  stepType: string;
  correct: boolean;
}

export interface PredictSummary {
  total: number;
  correct: number;
  /** 最近明细（FIFO，上限 PREDICT_RECENT_LIMIT） */
  recent: PredictAttempt[];
}

export interface ChallengeRecord {
  completed: boolean;
  /** 历史最少错误次数 */
  bestMistakes: number;
  attempts: number;
  /** ISO 8601，未完成过为 null */
  lastCompletedAt: string | null;
}

export interface AlgorithmProgress {
  /** 曾播放到最后一步 */
  animationWatched: boolean;
  /** 进入算法页次数 */
  viewCount: number;
  /** ISO 8601 */
  lastViewedAt: string | null;
  /** questionId → 答题记录 */
  quiz: Record<string, QuizRecord>;
  predict: PredictSummary;
  /** challengeId → 挑战记录 */
  challenge: Record<string, ChallengeRecord>;
}

export interface BookmarkEntry {
  /** algorithmId 或 'concept:<conceptId>' */
  targetId: string;
  /** ISO 8601 */
  addedAt: string;
}

export interface NoteEntry {
  content: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface SavedGraph {
  id: string;
  name: string;
  graph: GraphModel;
  /** ISO 8601 */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 根结构
// ---------------------------------------------------------------------------

export interface LearningProfile {
  /** algorithmId（或 concept:<id>）→ 学习进度 */
  progress: Record<string, AlgorithmProgress>;
  bookmarks: BookmarkEntry[];
  /** algorithmId → 学习笔记 */
  notes: Record<string, NoteEntry>;
  savedGraphs: SavedGraph[];
  settings: LearningSettings;
  /** 有学习活动的本地日期（YYYY-MM-DD，升序去重） */
  activityDays: string[];
}

/** localStorage 根对象（版本化，供迁移） */
export interface LearningStorageRoot {
  storageVersion: number;
  profile: LearningProfile;
}

/** 加载结果通知类型 */
export type LoadNotice = 'fresh' | 'loaded' | 'corrupted' | 'newer-version';

/** 全新默认档案 */
export function createDefaultProfile(): LearningProfile {
  return {
    progress: {},
    bookmarks: [],
    notes: {},
    savedGraphs: [],
    settings: { beginnerMode: false, welcomeDone: false },
    activityDays: [],
  };
}
