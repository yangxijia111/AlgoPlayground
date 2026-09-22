/**
 * Progress 页 UI 测试：统计卡、明细表、空态。
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { allEntries } from '../../core/algorithms';
import { registerAll } from '../../core/registry';
import { initLearningStore } from '../../core/storage/store';
import ProgressPage from './ProgressPage';

beforeAll(() => {
  registerAll(allEntries);
});

beforeEach(() => {
  initLearningStore(null);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/progress']}>
      <ProgressPage />
    </MemoryRouter>,
  );
}

describe('ProgressPage', () => {
  it('空档案：统计全 0，显示引导空态', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '学习进度' })).toBeTruthy();
    const nums = Array.from(document.querySelectorAll('.stat-num')).map((el) => el.textContent);
    expect(nums).toEqual(['0', '0', '0', '0', '0']);
    expect(screen.getAllByText(/还没有学习记录|尚无算法学习记录|还没有收藏/).length).toBeGreaterThan(0);
  });

  it('有学习数据：统计与明细表正确渲染', () => {
    const store = initLearningStore(null);
    // 动画 25 + Quiz 全对 25 + 挑战 20 + Predict 1 次 4 分 = 74 → 接近掌握
    store.markAnimationWatched('bubble-sort');
    for (let i = 0; i < 5; i++) store.recordQuizAnswer('bubble-sort', `q${i}`, true);
    store.recordChallengeResult('bubble-sort', 'bubble-pass', true, 0);
    store.recordAlgorithmView('bubble-sort');
    store.recordPredictAttempt('bubble-sort', { stepIndex: 3, stepType: 'compare', correct: true });

    renderPage();
    expect(screen.getByText(/算法明细/)).toBeTruthy();
    expect(screen.getByText(/接近掌握 74/)).toBeTruthy();
    // 正确率显示（quiz 100%）
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    // 挑战 ✓
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('分类掌握区域渲染 8 个分类', () => {
    renderPage();
    expect(screen.getByLabelText('分类掌握')).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(8);
  });
});
