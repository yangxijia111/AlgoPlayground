/**
 * 学习数据加载与迁移测试：无数据 / 正常 / 损坏 / 未来版本 / 字段类型错误。
 */
import { describe, expect, it } from 'vitest';
import { LEARNING_STORAGE_KEY, STORAGE_VERSION, createDefaultProfile } from '../learning/types';
import { loadLearningProfile, migrateRoot, validateProfile, type StorageLike } from './migrate';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function validRootJson(): string {
  return JSON.stringify({
    storageVersion: STORAGE_VERSION,
    profile: {
      progress: {
        'quick-sort': {
          animationWatched: true,
          viewCount: 3,
          lastViewedAt: '2026-09-22T10:00:00.000Z',
          quiz: { 'qs-1': { attemptCount: 2, correctCount: 1, lastCorrect: false, lastAnsweredAt: '2026-09-22T10:01:00.000Z' } },
          predict: { total: 4, correct: 3, recent: [{ at: '2026-09-22T10:02:00.000Z', stepIndex: 5, stepType: 'compare', correct: true }] },
          challenge: {},
        },
      },
      bookmarks: [{ targetId: 'bfs', addedAt: '2026-09-22T10:00:00.000Z' }],
      notes: { 'bfs': { content: 'BFS 用队列', updatedAt: '2026-09-22T10:00:00.000Z' } },
      savedGraphs: [],
      settings: { beginnerMode: true, welcomeDone: true },
      activityDays: ['2026-09-21', '2026-09-22'],
    },
  });
}

describe('loadLearningProfile', () => {
  it('无数据 → fresh + 默认档案', () => {
    const res = loadLearningProfile(memoryStorage());
    expect(res.notice).toBe('fresh');
    expect(res.profile).toEqual(createDefaultProfile());
  });

  it('空字符串 → fresh', () => {
    const res = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: '' }));
    expect(res.notice).toBe('fresh');
  });

  it('v1 正常数据 → loaded 且内容保留', () => {
    const res = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: validRootJson() }));
    expect(res.notice).toBe('loaded');
    expect(res.profile.progress['quick-sort']?.animationWatched).toBe(true);
    expect(res.profile.progress['quick-sort']?.quiz['qs-1']?.attemptCount).toBe(2);
    expect(res.profile.bookmarks).toHaveLength(1);
    expect(res.profile.settings.beginnerMode).toBe(true);
    expect(res.profile.activityDays).toEqual(['2026-09-21', '2026-09-22']);
  });

  it('损坏 JSON → corrupted + 默认档案（不抛异常）', () => {
    const res = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: '{not-json!!' }));
    expect(res.notice).toBe('corrupted');
    expect(res.profile).toEqual(createDefaultProfile());
  });

  it('未来版本 → newer-version + 默认档案', () => {
    const raw = JSON.stringify({ storageVersion: STORAGE_VERSION + 1, profile: { progress: {} } });
    const res = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: raw }));
    expect(res.notice).toBe('newer-version');
    expect(res.profile).toEqual(createDefaultProfile());
  });

  it('storageVersion 缺失/非数字 → corrupted', () => {
    const a = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: JSON.stringify({ profile: {} }) }));
    expect(a.notice).toBe('corrupted');
    const b = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: JSON.stringify({ storageVersion: 'x', profile: {} }) }));
    expect(b.notice).toBe('corrupted');
  });

  it('根不是对象（数字/数组/null）→ corrupted', () => {
    for (const raw of ['123', '[1,2]', 'null', '"str"']) {
      const res = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: raw }));
      expect(res.notice).toBe('corrupted');
    }
  });

  it('getItem 抛异常 → 视为 fresh 不崩溃', () => {
    const storage: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => {}, removeItem: () => {} };
    const res = loadLearningProfile(storage);
    expect(res.notice).toBe('fresh');
  });
});

describe('validateProfile 字段级修复', () => {
  it('整体不是对象 → 默认档案', () => {
    expect(validateProfile('nope')).toEqual(createDefaultProfile());
    expect(validateProfile(null)).toEqual(createDefaultProfile());
  });

  it('字段类型错误 → 重置为默认值而非拒绝', () => {
    const res = validateProfile({
      progress: {
        a: { animationWatched: 'yes', viewCount: -5, lastViewedAt: 42, quiz: 'x', predict: null, challenge: [] },
        b: 'garbage',
      },
      bookmarks: [{ targetId: 'bfs' }, 'junk', null, { targetId: '' }],
      notes: { a: { content: 123, updatedAt: 'bad-date' } },
      savedGraphs: [{ id: '', name: 'x', graph: null }, 'junk'],
      settings: { beginnerMode: 1, welcomeDone: null },
      activityDays: ['2026-09-22', 'oops', 5],
    });
    const pa = res.progress['a'];
    expect(pa?.animationWatched).toBe(false);
    expect(pa?.viewCount).toBe(0);
    expect(pa?.lastViewedAt).toBeNull();
    expect(pa?.quiz).toEqual({});
    expect(pa?.predict).toEqual({ total: 0, correct: 0, recent: [] });
    expect(pa?.challenge).toEqual({});
    expect(res.progress['b']).toBeDefined();
    expect(res.bookmarks).toEqual([expect.objectContaining({ targetId: 'bfs' })]);
    expect(res.notes['a']?.content).toBe('');
    expect(res.savedGraphs).toEqual([]);
    expect(res.settings).toEqual({ beginnerMode: false, welcomeDone: false });
    expect(res.activityDays).toEqual(['2026-09-22']);
  });

  it('predict.recent 超限裁剪到 50 条，savedGraphs 裁剪到 20 个', () => {
    const recent = Array.from({ length: 80 }, (_, i) => ({ at: '2026-09-22T00:00:00.000Z', stepIndex: i, stepType: 'compare', correct: true }));
    const graphs = Array.from({ length: 25 }, (_, i) => ({
      id: `g${i}`, name: `图${i}`, createdAt: '2026-09-22T00:00:00.000Z',
      graph: { nodes: [{ id: 'A', x: 0.1, y: 0.1 }], edges: [] },
    }));
    const res = validateProfile({
      progress: { a: { predict: { total: 80, correct: 80, recent } } },
      savedGraphs: graphs,
    });
    expect(res.progress['a']?.predict.recent).toHaveLength(50);
    expect(res.progress['a']?.predict.recent[0]?.stepIndex).toBe(30);
    expect(res.savedGraphs).toHaveLength(20);
  });

  it('无效 ISO 日期字符串被拒绝', () => {
    const res = validateProfile({ progress: { a: { lastViewedAt: 'not-a-date' } } });
    expect(res.progress['a']?.lastViewedAt).toBeNull();
  });
});

describe('migrateRoot 迁移框架', () => {
  it('当前版本直接校验通过', () => {
    const res = migrateRoot(JSON.parse(validRootJson()));
    expect(res.root).not.toBeNull();
    if (res.root !== null) {
      expect(res.root.storageVersion).toBe(STORAGE_VERSION);
      expect(res.root.profile.settings.welcomeDone).toBe(true);
    }
  });

  it('未来版本返回 newer-version', () => {
    const res = migrateRoot({ storageVersion: 999, profile: {} });
    if (res.root !== null) throw new Error('应拒绝未来版本');
    expect(res.reason).toBe('newer-version');
  });

  it('低于当前版本且无迁移函数 → corrupted（迁移通路预留）', () => {
    const res = migrateRoot({ storageVersion: 0, profile: {} });
    if (res.root !== null) throw new Error('应不可迁移');
    expect(res.reason).toBe('corrupted');
  });

  it('challenge 记录逐字段校验（validateProfile）', () => {
    const res = validateProfile({
      progress: {
        a: {
          challenge: {
            'bubble-pass': { completed: true, bestMistakes: 2, attempts: 3, lastCompletedAt: '2026-09-22T00:00:00.000Z' },
            'bad': { completed: 'yes', bestMistakes: -1, attempts: 'x', lastCompletedAt: 'nope' },
          },
        },
      },
    });
    const good = res.progress['a']?.challenge['bubble-pass'];
    expect(good).toEqual({
      completed: true, bestMistakes: 2, attempts: 3, lastCompletedAt: '2026-09-22T00:00:00.000Z',
    });
    const bad = res.progress['a']?.challenge['bad'];
    expect(bad).toEqual({
      completed: false, bestMistakes: 0, attempts: 0, lastCompletedAt: null,
    });
  });

  it('savedGraphs：图模型结构非法则丢弃该项', () => {
    const res = validateProfile({
      savedGraphs: [
        { id: 'g1', name: '好图', createdAt: '2026-09-22T00:00:00.000Z', graph: { nodes: [{ id: 'A', x: 0.1, y: 0.1 }], edges: [] } },
        { id: 'g2', name: '坏图', createdAt: '2026-09-22T00:00:00.000Z', graph: { nodes: [{ noId: true }], edges: [] } },
        { id: 'g3', name: '坏边', createdAt: '2026-09-22T00:00:00.000Z', graph: { nodes: [], edges: ['oops'] } },
      ],
    });
    expect(res.savedGraphs).toHaveLength(1);
    expect(res.savedGraphs[0]?.name).toBe('好图');
  });
});
