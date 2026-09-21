/**
 * LearningStore 测试：领域方法、防抖持久化、flush、reset、replaceProfile、订阅通知。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEARNING_STORAGE_KEY, createDefaultProfile, STORAGE_VERSION } from '../learning/types';
import { LearningStore, getLearningStore, initLearningStore } from './store';
import type { StorageLike } from './migrate';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

/** 固定时钟：2026-09-22T10:00:00Z 起，每次调用前进 1s */
function fixedClock() {
  let t = Date.parse('2026-09-22T10:00:00Z');
  return () => new Date((t += 1000));
}

describe('LearningStore 基础', () => {
  it('无存储 → 内存模式，仍可完整工作', () => {
    const store = new LearningStore(null);
    store.recordAlgorithmView('bubble-sort');
    expect(store.getProfile().progress['bubble-sort']?.viewCount).toBe(1);
    expect(store.isPersistent()).toBe(false);
    expect(() => store.flush()).not.toThrow();
  });

  it('构造时加载已有数据，takeNotice 只返回一次', () => {
    const storage = memoryStorage();
    const first = new LearningStore(storage, fixedClock());
    first.setBeginnerMode(true);
    first.flush();
    const second = new LearningStore(storage);
    expect(second.takeNotice()).toBe('loaded');
    expect(second.takeNotice()).toBeNull();
    expect(second.getProfile().settings.beginnerMode).toBe(true);
  });

  it('订阅：update 后通知，getProfile 引用替换', () => {
    const store = new LearningStore(null);
    let notified = 0;
    const before = store.getProfile();
    store.subscribe(() => {
      notified++;
    });
    store.recordAlgorithmView('bfs');
    expect(notified).toBe(1);
    expect(store.getProfile()).not.toBe(before);
  });

  it('setBeginnerMode / markWelcomeDone 幂等（无变化不通知）', () => {
    const store = new LearningStore(null);
    let notified = 0;
    store.subscribe(() => notified++);
    store.setBeginnerMode(false);
    store.markWelcomeDone(); // 首次：false → true，1 次通知
    store.markWelcomeDone(); // 幂等：无通知
    expect(notified).toBe(1);
    store.setBeginnerMode(true);
    expect(notified).toBe(2);
    store.setBeginnerMode(true);
    store.markWelcomeDone();
    expect(notified).toBe(2);
  });
});

describe('领域方法', () => {
  let store: LearningStore;

  beforeEach(() => {
    store = new LearningStore(memoryStorage(), fixedClock());
  });

  it('recordAlgorithmView 累加 viewCount 与 lastViewedAt，并记活动日', () => {
    store.recordAlgorithmView('quick-sort');
    store.recordAlgorithmView('quick-sort');
    const p = store.getProfile().progress['quick-sort'];
    expect(p?.viewCount).toBe(2);
    expect(p?.lastViewedAt).toBe('2026-09-22T10:00:03.000Z');
    expect(store.getProfile().activityDays).toEqual(['2026-09-22']);
  });

  it('markAnimationWatched 置位一次', () => {
    store.markAnimationWatched('quick-sort');
    store.markAnimationWatched('quick-sort');
    expect(store.getProfile().progress['quick-sort']?.animationWatched).toBe(true);
  });

  it('recordQuizAnswer 累加与覆盖 lastCorrect', () => {
    store.recordQuizAnswer('quick-sort', 'qs-1', true);
    store.recordQuizAnswer('quick-sort', 'qs-1', false);
    const r = store.getProfile().progress['quick-sort']?.quiz['qs-1'];
    expect(r?.attemptCount).toBe(2);
    expect(r?.correctCount).toBe(1);
    expect(r?.lastCorrect).toBe(false);
  });

  it('recordPredictAttempt 聚合计数 + recent 上限 50', () => {
    for (let i = 0; i < 55; i++) {
      store.recordPredictAttempt('bfs', { stepIndex: i, stepType: 'visit', correct: i % 2 === 0 });
    }
    const p = store.getProfile().progress['bfs']?.predict;
    expect(p?.total).toBe(55);
    expect(p?.correct).toBe(28);
    expect(p?.recent).toHaveLength(50);
    expect(p?.recent[0]?.stepIndex).toBe(5);
  });

  it('recordChallengeResult：完成置位、bestMistakes 取最小、失败不影响 completed', () => {
    store.recordChallengeResult('quick-sort', 'bubble-pass', true, 3);
    store.recordChallengeResult('quick-sort', 'bubble-pass', true, 1);
    store.recordChallengeResult('quick-sort', 'bubble-pass', false, 9);
    const r = store.getProfile().progress['quick-sort']?.challenge['bubble-pass'];
    expect(r?.completed).toBe(true);
    expect(r?.bestMistakes).toBe(1);
    expect(r?.attempts).toBe(3);
    expect(r?.lastCompletedAt).not.toBeNull();
  });

  it('bookmark：加入/移除/查询', () => {
    store.toggleBookmark('bfs');
    expect(store.isBookmarked('bfs')).toBe(true);
    store.toggleBookmark('bfs');
    expect(store.isBookmarked('bfs')).toBe(false);
  });

  it('note：保存并截断超长内容', () => {
    store.saveNote('bfs', 'x'.repeat(6000));
    const n = store.getProfile().notes['bfs'];
    expect(n?.content.length).toBe(5000);
  });

  it('图预设：保存生成唯一 id、删除、上限 20', () => {
    const graph = { nodes: [{ id: 'A', x: 0.1, y: 0.1 }], edges: [] };
    for (let i = 0; i < 23; i++) store.saveGraphPreset(`图${i}`, graph);
    const list = store.getProfile().savedGraphs;
    expect(list).toHaveLength(20);
    const ids = new Set(list.map((g) => g.id));
    expect(ids.size).toBe(20);
    store.deleteGraphPreset(list[0]!.id);
    expect(store.getProfile().savedGraphs).toHaveLength(19);
  });
});

describe('持久化', () => {
  it('防抖 300ms 写盘；flush 立即写盘', () => {
    vi.useFakeTimers();
    try {
      const storage = memoryStorage();
      const store = new LearningStore(storage, fixedClock());
      store.recordAlgorithmView('bfs');
      expect(storage.data.has(LEARNING_STORAGE_KEY)).toBe(false);
      vi.advanceTimersByTime(299);
      expect(storage.data.has(LEARNING_STORAGE_KEY)).toBe(false);
      vi.advanceTimersByTime(1);
      expect(storage.data.has(LEARNING_STORAGE_KEY)).toBe(true);
      const root = JSON.parse(storage.data.get(LEARNING_STORAGE_KEY)!);
      expect(root.storageVersion).toBe(STORAGE_VERSION);
      expect(root.profile.progress['bfs']?.viewCount).toBe(1);

      // flush：清掉 timer 立即写
      store.recordAlgorithmView('bfs');
      expect(JSON.parse(storage.data.get(LEARNING_STORAGE_KEY)!).profile.progress['bfs']?.viewCount).toBe(1);
      store.flush();
      expect(JSON.parse(storage.data.get(LEARNING_STORAGE_KEY)!).profile.progress['bfs']?.viewCount).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('连续写入合并为一次磁盘写', () => {
    vi.useFakeTimers();
    try {
      const storage = memoryStorage();
      const store = new LearningStore(storage, fixedClock());
      let writes = 0;
      const orig = storage.setItem;
      storage.setItem = (k, v) => {
        writes++;
        orig(k, v);
      };
      store.recordAlgorithmView('a');
      store.recordAlgorithmView('b');
      store.recordQuizAnswer('a', 'q1', true);
      vi.advanceTimersByTime(300);
      expect(writes).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('setItem 抛异常不崩溃（静默降级）', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    const store = new LearningStore(storage);
    store.recordAlgorithmView('bfs');
    expect(() => store.flush()).not.toThrow();
    expect(store.getProfile().progress['bfs']?.viewCount).toBe(1);
  });

  it('replaceProfile 深拷贝替换并持久化', () => {
    vi.useFakeTimers();
    try {
      const storage = memoryStorage();
      const store = new LearningStore(storage, fixedClock());
      const p = createDefaultProfile();
      p.progress['x'] = {
        animationWatched: true, viewCount: 9, lastViewedAt: null,
        quiz: {}, predict: { total: 1, correct: 1, recent: [] }, challenge: {},
      };
      store.replaceProfile(p);
      p.progress['x']!.viewCount = 0; // 外部突变不影响 store
      expect(store.getProfile().progress['x']?.viewCount).toBe(9);
      store.flush();
      const root = JSON.parse(storage.data.get(LEARNING_STORAGE_KEY)!);
      expect(root.profile.progress['x']?.viewCount).toBe(9);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resetLearningData：内存清零且只删自己的键', () => {
    const storage = memoryStorage();
    storage.data.set('other-app-key', 'keep-me');
    const store = new LearningStore(storage, fixedClock());
    store.recordAlgorithmView('bfs');
    store.flush();
    expect(storage.data.has(LEARNING_STORAGE_KEY)).toBe(true);
    store.resetLearningData();
    expect(storage.data.has(LEARNING_STORAGE_KEY)).toBe(false);
    expect(storage.data.get('other-app-key')).toBe('keep-me');
    expect(store.getProfile()).toEqual(createDefaultProfile());
  });

  it('损坏数据加载 → 默认档案且下次保存自然替换', () => {
    const storage = memoryStorage({ [LEARNING_STORAGE_KEY]: '{broken' });
    const store = new LearningStore(storage);
    expect(store.takeNotice()).toBe('corrupted');
    store.recordAlgorithmView('bfs');
    store.flush();
    const root = JSON.parse(storage.data.get(LEARNING_STORAGE_KEY)!);
    expect(root.profile.progress['bfs']?.viewCount).toBe(1);
  });

  it('订阅退订函数生效：退订后不再收到通知', () => {
    const store = new LearningStore(null);
    let notified = 0;
    const unsub = store.subscribe(() => notified++);
    store.recordAlgorithmView('bfs');
    unsub();
    store.recordAlgorithmView('bfs');
    expect(notified).toBe(1);
  });

  it('内存模式下 resetLearningData 也不写盘', () => {
    const store = new LearningStore(null);
    store.recordAlgorithmView('bfs');
    store.resetLearningData();
    expect(store.getProfile()).toEqual(createDefaultProfile());
  });

  it('removeItem 抛异常不崩溃', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const store = new LearningStore(storage);
    expect(() => store.resetLearningData()).not.toThrow();
  });
});

describe('应用单例', () => {
  it('initLearningStore 以给定 storage 重建单例；getLearningStore 复用同一实例', () => {
    const s = initLearningStore(null);
    expect(getLearningStore()).toBe(s);
    expect(s.isPersistent()).toBe(false);
  });
});
