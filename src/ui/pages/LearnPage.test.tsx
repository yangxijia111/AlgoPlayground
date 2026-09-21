/**
 * 学习路线页与概念课页测试。
 * 注意：组件经 getLearningStore() 使用应用单例，测试用 initLearningStore 隔离。
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initLearningStore } from '../../core/storage/store';
import LearnPage from './LearnPage';
import ConceptPage from './ConceptPage';
import { LEARNING_SECTIONS, allLessons } from '../../core/learning/path';
import { allEntries } from '../../core/algorithms';
import { registerAll } from '../../core/registry';

beforeAll(() => {
  registerAll(allEntries);
});

/** 在真实路由上下文中渲染：path 决定 useParams 的取值 */
function renderAt(ui: React.ReactElement, path = '/learn') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/learn" element={ui} />
        <Route path="/learn/concept/:conceptId" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LearnPage', () => {
  beforeEach(() => {
    initLearningStore(null);
  });

  it('渲染标题与全部 13 章', () => {
    renderAt(<LearnPage />);
    expect(screen.getByRole('heading', { name: '学习路线' })).toBeTruthy();
    for (const section of LEARNING_SECTIONS) {
      expect(screen.getByRole('heading', { name: section.name })).toBeTruthy();
    }
  });

  it('渲染全部小节链接，算法小节指向算法路由', () => {
    renderAt(<LearnPage />);
    for (const lesson of allLessons()) {
      const link = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.includes(lesson.id));
      expect(link, `小节 ${lesson.id} 应有链接`).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: /冒泡排序/ }).getAttribute('href')).toBe('/sorting/bubble-sort');
    expect(screen.getByRole('link', { name: /算法是什么/ }).getAttribute('href')).toBe('/learn/concept/what-is-algorithm');
  });

  it('已访问小节显示已完成、章节进度更新、推荐下一步落到首个未完成小节', () => {
    const store = initLearningStore(null);
    store.recordAlgorithmView('bubble-sort');
    renderAt(<LearnPage />);
    expect(screen.getAllByText('已完成')).toHaveLength(1);
    // 数组章完成度 1/1
    const arraySection = screen.getByRole('heading', { name: '2. 数组' }).closest('section');
    if (arraySection) expect(within(arraySection).getByText('1/1')).toBeTruthy();
    // 推荐下一步出现在基础概念章（第一个未完成）
    const basicsSection = screen.getByRole('heading', { name: '1. 基础概念' }).closest('section');
    if (basicsSection) expect(within(basicsSection).getAllByText('推荐下一步').length).toBeGreaterThan(0);
  });
});

describe('ConceptPage', () => {
  beforeEach(() => {
    initLearningStore(null);
  });

  it('渲染课程全部小节与关联算法', () => {
    renderAt(<ConceptPage />, '/learn/concept/what-is-algorithm');
    expect(screen.getByRole('heading', { name: /算法是什么/ })).toBeTruthy();
    expect(screen.getAllByText(/菜谱/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /冒泡排序/ })).toBeTruthy();
  });

  it('访问课程写入 concept: 前缀进度', () => {
    const store = initLearningStore(null);
    renderAt(<ConceptPage />, '/learn/concept/time-complexity');
    expect(store.getProfile().progress['concept:time-complexity']?.viewCount).toBe(1);
  });

  it('未知课程显示未找到', () => {
    renderAt(<ConceptPage />, '/learn/concept/nope');
    expect(screen.getByText('未找到该课程')).toBeTruthy();
  });
});
