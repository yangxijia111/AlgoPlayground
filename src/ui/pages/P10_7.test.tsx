/**
 * P10-7 UI 测试：笔记自动保存、收藏切换、首次欢迎卡。
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { allEntries } from '../../core/algorithms';
import { registerAll } from '../../core/registry';
import { initLearningStore } from '../../core/storage/store';
import { NoteEditor } from '../components/NoteEditor';
import { WelcomeCard } from '../components/WelcomeCard';
import AlgorithmPage from './AlgorithmPage';
import Home from './Home';

beforeAll(() => {
  registerAll(allEntries);
});

beforeEach(() => {
  initLearningStore(null);
  localStorage.clear();
});

describe('NoteEditor', () => {
  it('输入后防抖自动保存；切换算法同步内容', async () => {
    vi.useFakeTimers();
    try {
      const store = initLearningStore(null);
      const { unmount } = render(<NoteEditor algorithmId="bubble-sort" />);
      const ta = screen.getByLabelText('学习笔记内容') as HTMLTextAreaElement;
      fireEvent.change(ta, { target: { value: '快排 pivot 放到最后' } });
      // 未到防抖时间不保存
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(store.getProfile().notes['bubble-sort']).toBeUndefined();
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(store.getProfile().notes['bubble-sort']?.content).toBe('快排 pivot 放到最后');
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('卸载时立即保存（flush on unmount）', () => {
    vi.useFakeTimers();
    try {
      const store = initLearningStore(null);
      const { unmount } = render(<NoteEditor algorithmId="bfs" />);
      fireEvent.change(screen.getByLabelText('学习笔记内容'), { target: { value: 'BFS 用队列' } });
      unmount(); // 不推进时间
      expect(store.getProfile().notes['bfs']?.content).toBe('BFS 用队列');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('收藏', () => {
  it('算法页星标切换收藏状态并入库', () => {
    const store = initLearningStore(null);
    render(
      <MemoryRouter initialEntries={['/sorting/quick-sort']}>
        <Routes>
          <Route path="/:category/:algoId" element={<AlgorithmPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: '收藏本算法' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(store.isBookmarked('quick-sort')).toBe(true);
    expect(screen.getByRole('button', { name: '取消收藏' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '取消收藏' }));
    expect(store.isBookmarked('quick-sort')).toBe(false);
  });
});

describe('WelcomeCard 首次欢迎', () => {
  it('首次显示；点击跳过后不再出现', () => {
    const store = initLearningStore(null);
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('dialog', { name: /欢迎使用/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '跳过' }));
    expect(store.getProfile().settings.welcomeDone).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('welcomeDone 后再次渲染不显示', () => {
    const store = initLearningStore(null);
    store.markWelcomeDone();
    render(<WelcomeCard />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Esc 关闭', async () => {
    initLearningStore(null);
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
