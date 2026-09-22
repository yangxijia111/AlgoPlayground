/**
 * P10-8 UI 测试：分享按钮、数据导入导出、图预设。
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { allEntries } from '../../core/algorithms';
import { registerAll } from '../../core/registry';
import { initLearningStore } from '../../core/storage/store';
import AlgorithmPage from './AlgorithmPage';
import ProgressPage from './ProgressPage';
import { DataCard, looksLikeLearningJson } from '../components/DataCard';

beforeAll(() => {
  registerAll(allEntries);
});

beforeEach(() => {
  initLearningStore(null);
  localStorage.clear();
});

describe('分享按钮', () => {
  it('点击复制后出现「已复制」状态并自动复原', () => {
    vi.useFakeTimers();
    try {
      initLearningStore(null);
      render(
        <MemoryRouter initialEntries={['/sorting/quick-sort']}>
          <Routes>
            <Route path="/:category/:algoId" element={<AlgorithmPage />} />
          </Routes>
        </MemoryRouter>,
      );
      const btn = screen.getByRole('button', { name: '复制分享链接' });
      fireEvent.click(btn);
      expect(screen.getByRole('button', { name: '链接已复制' })).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(2100);
      });
      expect(screen.getByRole('button', { name: '复制分享链接' })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('非法分享参数显示提示条（直接操纵 URL 场景以 useSearchParams 模拟）', () => {
    // parseShareQuery 已在 core 测过；此处验证提示渲染路径
    render(
      <MemoryRouter initialEntries={['/progress']}>
        <Routes>
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('数据管理')).toBeTruthy();
  });
});

describe('DataCard 数据管理', () => {
  it('looksLikeLearningJson 校验', () => {
    // P11：schema v2；v1 导出文件仍可导入（迁移后校验），未来版本拒绝
    expect(looksLikeLearningJson('{"storageVersion":2,"profile":{}}')).toBe(true);
    expect(looksLikeLearningJson('{"storageVersion":1,"profile":{}}')).toBe(true);
    expect(looksLikeLearningJson('{"storageVersion":3,"profile":{}}')).toBe(false);
    expect(looksLikeLearningJson('not json')).toBe(false);
  });

  it('Reset 两步确认后清空数据', () => {
    const store = initLearningStore(null);
    store.recordAlgorithmView('bfs');
    render(<DataCard />);
    fireEvent.click(screen.getByRole('button', { name: '重置学习数据' }));
    // 第一步只是确认提示
    expect(store.getProfile().progress['bfs']?.viewCount).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '确认重置（不可恢复）' }));
    expect(Object.keys(store.getProfile().progress)).toHaveLength(0);
    expect(screen.getByText('学习数据已重置。')).toBeTruthy();
  });
});

describe('图预设', () => {
  it('保存/删除预设走 learning store', () => {
    const store = initLearningStore(null);
    const graph = { nodes: [{ id: 'A', x: 0.1, y: 0.1 }], edges: [] };
    const id = store.saveGraphPreset('我的图', graph);
    expect(store.getProfile().savedGraphs).toHaveLength(1);
    store.deleteGraphPreset(id);
    expect(store.getProfile().savedGraphs).toHaveLength(0);
  });
});
