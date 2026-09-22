/**
 * Storage 可靠性测试（STORAGE_RELIABILITY_SPEC §8）：
 * v1→v2 迁移、PersistenceStatus、跨字段 invariant（lenient 修复 + strict 拒绝）、
 * 真实日期校验、SavedGraph 严格校验、跨标签页域合并（fake transport）。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createDefaultProfile, LEARNING_STORAGE_KEY, STORAGE_VERSION, type LearningProfile } from '../learning/types';
import { loadLearningProfile, migrateRoot, strictValidateProfile, strictValidateGraphModel, isRealLocalDate, type StorageLike } from './migrate';
import { LearningStore } from './store';
import { mergeProfiles, type SyncTransport } from './sync';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

/** 双向 fake transport：两个 store 互相通知（模拟两个标签页 + storage event 广播） */
function fakeBidirectionalTransport(): { t1: SyncTransport; t2: SyncTransport; notifyOther: (from: 1 | 2, key: string, value: string | null) => void } {
  const subs1: Array<(key: string, value: string | null) => void> = [];
  const subs2: Array<(key: string, value: string | null) => void> = [];
  return {
    t1: { subscribe: (cb) => { subs2.push(cb); return () => undefined; } }, // store1 的监听由 store2 的写入触发
    t2: { subscribe: (cb) => { subs1.push(cb); return () => undefined; } },
    notifyOther: (from, key, value) => {
      // storage event 语义：写入方不收到自己的事件，另一方收到
      const targets = from === 1 ? subs1 : subs2;
      for (const cb of [...targets]) cb(key, value);
    },
  };
}

const withRoot = (profile: unknown, revision = 0, version: number = STORAGE_VERSION) =>
  JSON.stringify({ storageVersion: version, revision, profile });

// ---------------------------------------------------------------------------
// 迁移
// ---------------------------------------------------------------------------

describe('Schema v2 迁移', () => {
  it('v1 根对象（无 revision）迁移到 v2：revision=0 且 profile 保真', () => {
    const v1Profile = { settings: { beginnerMode: true, welcomeDone: true }, activityDays: ['2026-01-01'], bookmarks: [] };
    const migrated = migrateRoot({ storageVersion: 1, profile: v1Profile });
    expect(migrated.root).not.toBeNull();
    expect(migrated.root!.storageVersion).toBe(2);
    expect(migrated.root!.revision).toBe(0);
    expect(migrated.root!.profile.settings.beginnerMode).toBe(true);
  });

  it('v2 根对象直接通过（revision 保留）', () => {
    const migrated = migrateRoot({ storageVersion: 2, revision: 7, profile: createDefaultProfile() });
    expect(migrated.root!.revision).toBe(7);
  });

  it('未来版本拒绝且不写入', () => {
    expect(migrateRoot({ storageVersion: 3, revision: 0, profile: {} }).root).toBeNull();
  });

  it('loadLearningProfile：v1 数据自动迁移后 notice=loaded', () => {
    const s = memoryStorage({ [LEARNING_STORAGE_KEY]: JSON.stringify({ storageVersion: 1, profile: { settings: { beginnerMode: true } } }) });
    const r = loadLearningProfile(s);
    expect(r.notice).toBe('loaded');
    expect(r.profile.settings.beginnerMode).toBe(true);
    expect(r.revision).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PersistenceStatus
// ---------------------------------------------------------------------------

describe('PersistenceStatus', () => {
  it('memory-only：storage 不可用', () => {
    const store = new LearningStore(null);
    expect(store.getPersistenceStatus()).toBe('memory-only');
  });

  it('persistent → write-failed：flush 抛错后状态可见，恢复后回到 persistent', () => {
    const s = memoryStorage();
    let fail = false;
    const origSet = s.setItem;
    s.setItem = (k, v) => {
      if (fail) throw new Error('write failed');
      origSet(k, v);
    };
    const store = new LearningStore(s);
    store.saveNote('bfs', 'hello');
    store.flush();
    expect(store.getPersistenceStatus()).toBe('persistent');
    fail = true;
    store.saveNote('bfs', 'world');
    store.flush();
    expect(store.getPersistenceStatus()).toBe('write-failed');
    fail = false;
    store.saveNote('bfs', 'again');
    store.flush();
    expect(store.getPersistenceStatus()).toBe('persistent');
  });

  it('quota-exceeded：QuotaExceededError 被识别', () => {
    const s = memoryStorage();
    s.setItem = () => {
      const e = new DOMException('quota', 'QuotaExceededError');
      throw e;
    };
    const store = new LearningStore(s);
    store.saveNote('bfs', 'x');
    store.flush();
    expect(store.getPersistenceStatus()).toBe('quota-exceeded');
  });

  it('每次成功写入 revision 单调 +1', () => {
    const s = memoryStorage();
    const store = new LearningStore(s);
    const r0 = store.getRevision();
    store.saveNote('bfs', 'a');
    store.flush();
    expect(store.getRevision()).toBe(r0 + 1);
    store.saveNote('bfs', 'b');
    store.flush();
    expect(store.getRevision()).toBe(r0 + 2);
  });
});

// ---------------------------------------------------------------------------
// invariant：lenient 修复 / strict 拒绝
// ---------------------------------------------------------------------------

describe('跨字段 invariant', () => {
  const badQuizProfile = {
    progress: {
      bfs: { quiz: { q1: { attemptCount: 2, correctCount: 5, lastCorrect: true, lastAnsweredAt: '2026-01-01T00:00:00.000Z' } } },
    },
  };

  it('lenient 加载：correctCount > attemptCount 被 clamp 修复', () => {
    const s = memoryStorage({ [LEARNING_STORAGE_KEY]: withRoot(badQuizProfile) });
    const r = loadLearningProfile(s);
    expect(r.profile.progress['bfs']?.quiz['q1']?.correctCount).toBe(2);
    expect(r.profile.progress['bfs']?.quiz['q1']?.attemptCount).toBe(2);
  });

  it('strict import：correctCount > attemptCount 明确拒绝', () => {
    const res = strictValidateProfile(badQuizProfile);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('correctCount');
  });

  it('completed=false 携带 lastCompletedAt：lenient 清除 / strict 拒绝', () => {
    const profile = {
      progress: {
        bfs: { challenge: { c1: { completed: false, bestMistakes: 0, attempts: 1, lastCompletedAt: '2026-01-01T00:00:00.000Z' } } },
      },
    };
    const lenient = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: withRoot(profile) }));
    expect(lenient.profile.progress['bfs']?.challenge['c1']?.lastCompletedAt).toBeNull();
    const strict = strictValidateProfile(profile);
    expect(strict.ok).toBe(false);
    if (!strict.ok) expect(strict.error).toContain('lastCompletedAt');
  });

  it('predict correct > total：lenient clamp / strict 拒绝', () => {
    const profile = { progress: { bfs: { predict: { total: 3, correct: 9, recent: [] } } } };
    const lenient = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: withRoot(profile) }));
    expect(lenient.profile.progress['bfs']?.predict.correct).toBe(3);
    expect(strictValidateProfile(profile).ok).toBe(false);
  });

  it('合法数据 strict 通过并保留', () => {
    const good = createDefaultProfile();
    good.progress['bfs'] = {
      animationWatched: true,
      viewCount: 2,
      lastViewedAt: '2026-01-02T00:00:00.000Z',
      quiz: { q1: { attemptCount: 3, correctCount: 2, lastCorrect: false, lastAnsweredAt: '2026-01-02T00:00:00.000Z' } },
      predict: { total: 5, correct: 4, recent: [] },
      challenge: {},
    };
    const res = strictValidateProfile(good);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.profile.progress['bfs']?.quiz['q1']?.attemptCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 日期校验
// ---------------------------------------------------------------------------

describe('真实日期校验', () => {
  it.each([
    ['2026-09-01', true],
    ['2024-02-29', true], // 闰日合法
    ['2026-02-28', true],
    ['2026-99-99', false],
    ['2026-02-31', false], // 2 月没有 31 日
    ['2026-13-01', false],
    ['2026-9-1', false], // 格式
    ['not-a-date', false],
  ])('%s → %s', (s, expected) => {
    expect(isRealLocalDate(s)).toBe(expected);
  });

  it('lenient：非法日期丢弃、重复去重、升序排序', () => {
    const profile = { activityDays: ['2026-09-02', '2026-99-99', '2026-09-01', '2026-09-02', '2026-02-31'] };
    const r = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: withRoot(profile) }));
    expect(r.profile.activityDays).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('strict：非法日期与重复日期拒绝', () => {
    expect(strictValidateProfile({ activityDays: ['2026-02-31'] }).ok).toBe(false);
    expect(strictValidateProfile({ activityDays: ['2026-01-01', '2026-01-01'] }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SavedGraph 严格校验
// ---------------------------------------------------------------------------

describe('SavedGraph 严格校验', () => {
  const goodGraph = {
    nodes: [
      { id: 'A', x: 0.1, y: 0.2 },
      { id: 'B', x: 0.8, y: 0.7 },
    ],
    edges: [{ id: 'e1', from: 'A', to: 'B', directed: false, weight: 4 }],
  };

  it('合法图通过', () => {
    expect(strictValidateGraphModel(goodGraph).ok).toBe(true);
  });

  it.each([
    ['节点数超上限', { nodes: Array.from({ length: 13 }, (_, i) => ({ id: `N${i}`, x: 0.5, y: 0.5 })), edges: [] }],
    ['id 重复', { nodes: [{ id: 'A', x: 0.5, y: 0.5 }, { id: 'A', x: 0.4, y: 0.4 }], edges: [] }],
    ['x 越界', { nodes: [{ id: 'A', x: 1.5, y: 0.5 }], edges: [] }],
    ['y 非数', { nodes: [{ id: 'A', x: 0.5, y: 'x' }], edges: [] }],
    ['from 不存在', { nodes: [{ id: 'A', x: 0.5, y: 0.5 }], edges: [{ id: 'e1', from: 'A', to: 'Z', directed: false, weight: 3 }] }],
    ['自环', { nodes: [{ id: 'A', x: 0.5, y: 0.5 }], edges: [{ id: 'e1', from: 'A', to: 'A', directed: false, weight: 3 }] }],
    ['权重越界', { nodes: [{ id: 'A', x: 0.5, y: 0.5 }, { id: 'B', x: 0.6, y: 0.6 }], edges: [{ id: 'e1', from: 'A', to: 'B', directed: false, weight: 100 }] }],
    ['无向重复边', { nodes: [{ id: 'A', x: 0.5, y: 0.5 }, { id: 'B', x: 0.6, y: 0.6 }], edges: [{ id: 'e1', from: 'A', to: 'B', directed: false, weight: 3 }, { id: 'e2', from: 'B', to: 'A', directed: false, weight: 4 }] }],
    ['directed 非 boolean', { nodes: [{ id: 'A', x: 0.5, y: 0.5 }, { id: 'B', x: 0.6, y: 0.6 }], edges: [{ id: 'e1', from: 'A', to: 'B', directed: 1, weight: 3 }] }],
  ])('%s 拒绝', (_name, graph) => {
    const r = strictValidateGraphModel(graph);
    expect(r.ok).toBe(false);
  });

  it('lenient：不合法 savedGraph 条目丢弃（保其余）', () => {
    const profile = {
      savedGraphs: [
        { id: 'g1', name: '好图', graph: goodGraph, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'g2', name: '坏图', graph: { nodes: 'not-array', edges: [] }, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    };
    const r = loadLearningProfile(memoryStorage({ [LEARNING_STORAGE_KEY]: withRoot(profile) }));
    expect(r.profile.savedGraphs.map((g) => g.id)).toEqual(['g1']);
  });

  it('strict import：坏图明确拒绝', () => {
    const profile = {
      savedGraphs: [{ id: 'g2', name: '坏图', graph: { nodes: [{ id: 'A', x: 5, y: 0.5 }], edges: [] }, createdAt: '2026-01-01T00:00:00.000Z' }],
    };
    const res = strictValidateProfile(profile);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('x');
  });
});

// ---------------------------------------------------------------------------
// 跨标签页域合并
// ---------------------------------------------------------------------------

describe('跨标签页域合并（fake transport）', () => {
  let s1: ReturnType<typeof memoryStorage>;
  let s2: ReturnType<typeof memoryStorage>;
  let t1: SyncTransport;
  let t2: SyncTransport;
  let notifyOther: (from: 1 | 2, key: string, value: string | null) => void;

  beforeEach(() => {
    s1 = memoryStorage();
    s2 = memoryStorage();
    const f = fakeBidirectionalTransport();
    t1 = f.t1;
    t2 = f.t2;
    notifyOther = f.notifyOther;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** 模拟真实浏览器：写入方写 storage + 通知另一方（storage event） */
  const flushAndNotify = (store: LearningStore, which: 1 | 2, storage: typeof s1) => {
    const before = store.getRevision();
    store.flush();
    const value = storage.getItem(LEARNING_STORAGE_KEY);
    void before;
    notifyOther(which, LEARNING_STORAGE_KEY, value);
  };

  it('核心场景：Tab A 答题、Tab B 记笔记 → 同步后两域都保留（不丢数据）', () => {
    const a = new LearningStore(s1, () => new Date('2026-09-22T10:00:00Z'), t1);
    const b = new LearningStore(s2, () => new Date('2026-09-22T10:00:00Z'), t2);

    // Tab A：答题（写 quiz）
    a.recordQuizAnswer('bfs', 'q1', true);
    a.recordQuizAnswer('bfs', 'q1', false);
    flushAndNotify(a, 1, s1);
    // 模拟 Tab B 此前已读过（真实场景 B 先打开）——把 A 的数据给 B 加载一次
    s2.setItem(LEARNING_STORAGE_KEY, s1.getItem(LEARNING_STORAGE_KEY)!);
    b.dispose();
    const b2 = new LearningStore(s2, () => new Date('2026-09-22T10:00:00Z'), t2);

    // Tab B：记笔记（写 notes）
    b2.saveNote('bfs', 'BFS 用队列');
    const bValue = s2.getItem(LEARNING_STORAGE_KEY)!;
    b2.flush();
    notifyOther(2, LEARNING_STORAGE_KEY, s2.getItem(LEARNING_STORAGE_KEY));

    // Tab A 再写一笔并同步
    a.recordAlgorithmView('bfs');
    a.flush();
    notifyOther(1, LEARNING_STORAGE_KEY, s1.getItem(LEARNING_STORAGE_KEY));
    void bValue;

    // 断言：Tab A 的 profile 同时含 quiz（A 写）与 note（B 写）
    const mergedA = a.getProfile();
    expect(mergedA.progress['bfs']?.quiz['q1']?.attemptCount).toBe(2);
    expect(mergedA.notes['bfs']?.content).toBe('BFS 用队列');
    // 断言：Tab B 的 profile 同样两域保留
    const mergedB = b2.getProfile();
    expect(mergedB.progress['bfs']?.quiz['q1']?.attemptCount).toBe(2);
    expect(mergedB.notes['bfs']?.content).toBe('BFS 用队列');
  });

  it('同域竞争：双方更新同一 quiz 条目取信息量大者（不丢 attempt）', () => {
    const a = new LearningStore(s1, () => new Date('2026-09-22T10:00:00Z'), t1);
    a.recordQuizAnswer('dfs', 'q1', true);
    a.flush();
    // B 加载 A 的数据后继续答题两次
    s2.setItem(LEARNING_STORAGE_KEY, s1.getItem(LEARNING_STORAGE_KEY)!);
    const b = new LearningStore(s2, () => new Date('2026-09-22T10:00:00Z'), t2);
    b.recordQuizAnswer('dfs', 'q1', true);
    b.recordQuizAnswer('dfs', 'q1', true);
    b.flush();
    notifyOther(2, LEARNING_STORAGE_KEY, s2.getItem(LEARNING_STORAGE_KEY));
    const mergedA = a.getProfile();
    expect(mergedA.progress['dfs']?.quiz['q1']?.attemptCount).toBe(3);
    expect(mergedA.progress['dfs']?.quiz['q1']?.correctCount).toBe(3);
  });

  it('旧 revision 回声被忽略（不循环合并）', () => {
    const a = new LearningStore(s1, () => new Date('2026-09-22T10:00:00Z'), t1);
    a.recordAlgorithmView('bfs');
    a.flush();
    const rev = a.getRevision();
    // 伪造旧 revision 的远端写入
    notifyOther(2, LEARNING_STORAGE_KEY, withRoot(createDefaultProfile(), rev - 1));
    expect(a.getRevision()).toBe(rev);
  });

  it('损坏的远端数据被忽略（不传染）', () => {
    const a = new LearningStore(s1, () => new Date('2026-09-22T10:00:00Z'), t1);
    a.recordAlgorithmView('bfs');
    a.flush();
    const before = a.getProfile();
    notifyOther(2, LEARNING_STORAGE_KEY, '!!!not-json');
    notifyOther(2, LEARNING_STORAGE_KEY, withRoot(null, 9999)); // profile 损坏 → migrateRoot corrupted
    expect(a.getProfile()).toEqual(before);
  });

  it('mergeProfiles：bookmarks/savedGraphs/activityDays 并集', () => {
    const p1: LearningProfile = {
      ...createDefaultProfile(),
      bookmarks: [{ targetId: 'bfs', addedAt: '2026-01-01T00:00:00.000Z' }],
      activityDays: ['2026-01-01'],
      savedGraphs: [{ id: 'g1', name: 'a', graph: { nodes: [{ id: 'A', x: 0.5, y: 0.5 }], edges: [] }, createdAt: '2026-01-01T00:00:00.000Z' }],
    };
    const p2: LearningProfile = {
      ...createDefaultProfile(),
      bookmarks: [{ targetId: 'dfs', addedAt: '2026-01-02T00:00:00.000Z' }],
      activityDays: ['2026-01-01', '2026-01-03'],
      savedGraphs: [{ id: 'g2', name: 'b', graph: { nodes: [{ id: 'B', x: 0.5, y: 0.5 }], edges: [] }, createdAt: '2026-01-02T00:00:00.000Z' }],
    };
    const m = mergeProfiles(p1, p2);
    expect(m.bookmarks.map((b) => b.targetId).sort()).toEqual(['bfs', 'dfs']);
    expect(m.activityDays).toEqual(['2026-01-01', '2026-01-03']);
    expect(m.savedGraphs.map((g) => g.id).sort()).toEqual(['g1', 'g2']);
  });
});
