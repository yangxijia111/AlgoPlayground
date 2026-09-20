/**
 * ComparePage 冒烟测试（TEST_PLAN T5 + FR-12 验收）。
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerAll } from '../../core/registry';
import { allEntries } from '../../core/algorithms';
import { collectSteps } from '../../core/step/step';
import ComparePage from './ComparePage';

beforeAll(() => {
  registerAll(allEntries);
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/compare']}>
      <ComparePage />
    </MemoryRouter>,
  );

describe('ComparePage', () => {
  it('默认选择 3 个算法并显示统计表', () => {
    renderPage();
    expect(screen.getByText('排序比较模式')).toBeInTheDocument();
    expect(screen.getByText('统计对比')).toBeInTheDocument();
    // 算法名同时出现在选择按钮与统计表中
    expect(screen.getAllByText('冒泡排序').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('快速排序').length).toBeGreaterThanOrEqual(2);
  });

  it('统计数字与单独运行一致', () => {
    renderPage();
    const bubble = allEntries.find((e) => e.meta.id === 'bubble-sort')!;
    const solo = collectSteps(bubble.run({ type: 'sort', array: [10, 3, 7, 1, 8, 2, 9, 4, 6, 5] }));
    const soloCounters = solo[solo.length - 1].counters;
    // 页面上的比较次数单元格中出现与单独运行一致的数值
    const cells = screen.getAllByText(String(soloCounters.comparisons));
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it('取消选择至 0 个算法显示空态；重新选择恢复', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '冒泡排序' }));
    fireEvent.click(screen.getByRole('button', { name: '选择排序' }));
    fireEvent.click(screen.getByRole('button', { name: '快速排序' }));
    expect(screen.getByText('请至少选择一个算法')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '冒泡排序' }));
    expect(screen.queryByText('请至少选择一个算法')).not.toBeInTheDocument();
  });

  it('最多只能选择 3 个算法', () => {
    renderPage();
    // 默认已选 3 个，尝试追加第 4 个（插入排序）应无效
    fireEvent.click(screen.getByRole('button', { name: '插入排序' }));
    expect(screen.getByRole('button', { name: '插入排序' }).getAttribute('aria-pressed')).toBe('false');
  });
});
