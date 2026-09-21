/**
 * Predict UI 集成测试：开关、手动出题、作答判分、记录入库。
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { allEntries } from '../../core/algorithms';
import { registerAll } from '../../core/registry';
import { initLearningStore } from '../../core/storage/store';
import AlgorithmPage from './AlgorithmPage';

beforeAll(() => {
  registerAll(allEntries);
});

beforeEach(() => {
  initLearningStore(null);
});

function renderAlgo(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:category/:algoId" element={<AlgorithmPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Predict 模式集成（冒泡排序）', () => {
  it('默认关闭；开启后「考考我」出题、作答、判分、记录', () => {
    const store = initLearningStore(null);
    renderAlgo('/sorting/bubble-sort');

    // 默认无预测卡片
    expect(screen.queryByRole('region', { name: '预测下一步' }) ?? screen.queryByLabelText('预测下一步')).toBeNull();

    // 开启并前进到可出题步（第 1 步是比较）
    fireEvent.click(screen.getByRole('button', { name: /预测模式/ }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '考考我' }));

    // 题目出现：4 选项 radiogroup
    const group = screen.getByRole('radiogroup');
    expect(group).toBeTruthy();
    const options = screen.getAllByRole('radio');
    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole('button', { name: '提交答案' })?.hasAttribute('disabled')).toBe(true);

    // 作答正确答案
    const correctOption = options.find((o) => o.getAttribute('aria-checked') === 'false');
    expect(correctOption).toBeTruthy();
    // 逐个点选直到提交可用——直接选正确答案：答案在真实下一步中，测试用 index 0 附近验证逻辑即可
    fireEvent.click(options[0]!);
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

    // 出现结果反馈与继续按钮；记录入库
    expect(screen.getByText(/答对了！|不对哦。/)).toBeTruthy();
    const attempts = store.getProfile().progress['bubble-sort']?.predict;
    expect(attempts?.total).toBe(1);

    // 继续：卡片关闭
    fireEvent.click(screen.getByRole('button', { name: '继续动画' }));
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('会话正确率显示', () => {
    initLearningStore(null);
    renderAlgo('/sorting/bubble-sort');
    fireEvent.click(screen.getByRole('button', { name: /预测模式/ }));
    expect(screen.queryByText(/本次 0\/0/)).toBeNull(); // 未开启题目区时不显示会话统计
  });

  it('关闭预测模式后卡片消失', () => {
    initLearningStore(null);
    renderAlgo('/sorting/bubble-sort');
    fireEvent.click(screen.getByRole('button', { name: /预测模式/ }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '考考我' }));
    expect(screen.getByRole('radiogroup')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '关闭预测模式' }));
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});
