/**
 * AlgorithmPage 冒烟测试：默认输入加载步骤，播放按钮可用（TEST_PLAN T5）。
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerAll } from '../../core/registry';
import { allEntries } from '../../core/algorithms';
import AlgorithmPage from './AlgorithmPage';

beforeAll(() => {
  registerAll(allEntries);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:category/:algoId" element={<AlgorithmPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AlgorithmPage', () => {
  it('冒泡排序页：标题、教学面板、播放器与步数显示', () => {
    renderAt('/sorting/bubble-sort');
    // 标题同时出现在中间卡片与右侧教学面板
    expect(screen.getAllByText('冒泡排序').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('核心思想', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('时间复杂度', { selector: 'dt' })).toBeInTheDocument();
    // 默认输入 10 个元素：初始态即有步骤
    expect(screen.getByText((_, el) => el?.classList.contains('player-step') === true)).toHaveTextContent('1 /');
  });

  it('点击下一步推进步骤并更新解释', () => {
    renderAt('/sorting/selection-sort');
    const before = screen.getByText((_, el) => el?.classList.contains('player-step') === true).textContent;
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    const after = screen.getByText((_, el) => el?.classList.contains('player-step') === true).textContent;
    expect(after).not.toBe(before);
  });

  it('无效算法 id 显示未找到', () => {
    renderAt('/sorting/no-such-algo');
    expect(screen.getByText('未找到该算法')).toBeInTheDocument();
  });

  it('自定义非法数组显示错误且不崩溃', () => {
    renderAt('/sorting/bubble-sort');
    const input = screen.getByLabelText('自定义数组');
    fireEvent.change(input, { target: { value: '1, 2, abc' } });
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(screen.getByText(/不是整数/)).toBeInTheDocument();
  });

  it('应用合法数组后步骤重新生成', () => {
    renderAt('/sorting/bubble-sort');
    fireEvent.change(screen.getByLabelText('自定义数组'), { target: { value: '2, 1' } });
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(screen.getByText((_, el) => el?.classList.contains('player-step') === true)).toHaveTextContent('1 /');
  });
});
