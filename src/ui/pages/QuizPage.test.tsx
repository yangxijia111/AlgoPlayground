/**
 * Quiz UI 集成测试：作答流程、判分显示、重做、历史点。
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { allEntries } from '../../core/algorithms';
import { registerAll } from '../../core/registry';
import { initLearningStore } from '../../core/storage/store';
import { questionsByAlgorithm } from '../../core/quiz';
import { QuizCard } from '../components/QuizCard';
import AlgorithmPage from './AlgorithmPage';

beforeAll(() => {
  registerAll(allEntries);
});

beforeEach(() => {
  initLearningStore(null);
});

/** 在路由上下文中渲染算法页 */
function renderAlgo(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:category/:algoId" element={<AlgorithmPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QuizCard（直接渲染）', () => {
  it('完整流程：作答 → 判分 → 解析 → 下一题 → 重开一轮', () => {
    const qs = questionsByAlgorithm('bubble-sort');
    const answers: string[] = [];
    render(<QuizCard questions={qs} history={{}} onAnswer={(id) => answers.push(id)} />);

    expect(screen.getByText('1/4')).toBeTruthy();
    // 提交前禁用
    expect(screen.getByRole('button', { name: '提交' }).hasAttribute('disabled')).toBe(true);
    // 选择第一个选项提交
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    expect(screen.getByText(/✅ 正确|❌ 不正确/)).toBeTruthy();
    expect(answers).toHaveLength(1);
    expect(answers[0]).toBe(qs[0]!.id);

    // 下一题
    fireEvent.click(screen.getByRole('button', { name: '下一题' }));
    expect(screen.getByText('2/4')).toBeTruthy();
    expect(screen.getByRole('button', { name: '提交' }).hasAttribute('disabled')).toBe(true);

    // 走完剩余题目：有「提交」就作答，答完点「下一题」/「再做一轮」
    for (let i = 1; i < qs.length; i++) {
      fireEvent.click(screen.getAllByRole('radio')[0]!);
      fireEvent.click(screen.getByRole('button', { name: '提交' }));
      if (i < qs.length - 1) fireEvent.click(screen.getByRole('button', { name: '下一题' }));
    }
    expect(screen.getByRole('button', { name: '再做一轮' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '再做一轮' }));
    expect(screen.getByText('1/4')).toBeTruthy();
    expect(answers).toHaveLength(qs.length);
  });

  it('空题库显示占位', () => {
    render(<QuizCard questions={[]} history={{}} onAnswer={() => {}} />);
    expect(screen.getByText(/题目正在编写中/)).toBeTruthy();
  });
});

describe('算法页 Quiz 集成', () => {
  it('冒泡排序页显示随堂小测，作答写入 store', () => {
    const store = initLearningStore(null);
    renderAlgo('/sorting/bubble-sort');
    const quiz = screen.getByLabelText('随堂小测');
    expect(quiz).toBeTruthy();

    // 答第一题：选择后提交
    const quizScope = quiz;
    const radios = Array.from(quizScope.querySelectorAll('[role="radio"]')) as HTMLButtonElement[];
    fireEvent.click(radios[0]!);
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    expect(store.getProfile().progress['bubble-sort']?.quiz).toBeTruthy();
    const records = Object.values(store.getProfile().progress['bubble-sort']?.quiz ?? {});
    expect(records).toHaveLength(1);
    expect(records[0]?.attemptCount).toBe(1);
  });

  it('无题算法（如 factorial 无独立题组）不渲染 Quiz 区', () => {
    initLearningStore(null);
    renderAlgo('/recursion/factorial');
    expect(screen.queryByLabelText('随堂小测')).toBeNull();
  });

  it('同一轮内提交后锁定选项（可更换答案需重开一轮）', () => {
    initLearningStore(null);
    renderAlgo('/sorting/bubble-sort');
    const radios = () => Array.from(screen.getByLabelText('随堂小测').querySelectorAll('[role="radio"]')) as HTMLButtonElement[];
    fireEvent.click(radios()[0]!);
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    // 提交后选项全部禁用（判分展示态），提交按钮被结果区替换
    for (const r of radios()) expect(r.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull();
  });

  it('重开一轮重答同一题：attemptCount 累加', () => {
    const store = initLearningStore(null);
    renderAlgo('/sorting/bubble-sort');
    const qs = questionsByAlgorithm('bubble-sort');
    const radios = () => Array.from(screen.getByLabelText('随堂小测').querySelectorAll('[role="radio"]')) as HTMLButtonElement[];
    // 第一轮：每题都答
    for (let i = 0; i < qs.length; i++) {
      fireEvent.click(radios()[0]!);
      fireEvent.click(screen.getByRole('button', { name: '提交' }));
      if (i < qs.length - 1) fireEvent.click(screen.getByRole('button', { name: '下一题' }));
    }
    fireEvent.click(screen.getByRole('button', { name: '再做一轮' }));
    // 第二轮第 1 题
    fireEvent.click(radios()[0]!);
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    const rec = store.getProfile().progress['bubble-sort']?.quiz[qs[0]!.id];
    expect(rec?.attemptCount).toBe(2);
  });
});

