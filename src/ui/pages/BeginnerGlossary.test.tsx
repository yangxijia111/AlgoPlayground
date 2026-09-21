/**
 * P10-2 UI 测试：术语弹窗、富文本标记解析、Beginner Mode 集成。
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { allEntries } from '../../core/algorithms';
import { registerAll, getAlgorithm } from '../../core/registry';
import { collectSteps } from '../../core/step/step';
import { initLearningStore } from '../../core/storage/store';
import { TermTip } from '../components/TermTip';
import { renderRichText } from '../components/RichText';
import { TeachingPanel } from '../components/TeachingPanel';
import AlgorithmPage from './AlgorithmPage';
import App from '../../App';
import GlossaryPage from './GlossaryPage';
import ConceptPage from './ConceptPage';

beforeAll(() => {
  registerAll(allEntries);
});

beforeEach(() => {
  initLearningStore(null);
});

function renderRouted(ui: React.ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/learn" element={ui} />
        <Route path="/learn/concept/:conceptId" element={ui} />
        <Route path="/glossary" element={ui} />
        <Route path="/:category/:algoId" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TermTip 术语弹窗', () => {
  it('点击术语弹出解释，Esc 关闭', () => {
    render(<TermTip termId="pivot" />);
    const btn = screen.getByRole('button', { name: '基准值（pivot）' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(btn);
    expect(screen.getByRole('dialog', { name: /术语解释：基准值/ })).toBeTruthy();
    expect(screen.getByText(/快速排序每轮分区选定的参照元素/)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('未知术语 id 原样显示（不崩溃）', () => {
    render(<TermTip termId="no-such">自定义文本</TermTip>);
    expect(screen.getByText('自定义文本')).toBeTruthy();
  });
});

describe('RichText 标记解析', () => {
  it('[[term:id]] 解析为可点击术语，普通文本保留', () => {
    const { container } = render(<p>{renderRichText('学习 [[term:pivot]] 与 [[term:queue|队列]] 的故事')}</p>);
    const refs = container.querySelectorAll('.term-ref');
    expect(refs).toHaveLength(2);
    expect(refs[0]?.textContent).toBe('基准值（pivot）');
    expect(refs[1]?.textContent).toBe('队列');
    expect(container.textContent).toContain('的故事');
  });

  it('无标记文本原样返回', () => {
    render(<p>{renderRichText('普通文本')}</p>);
    expect(screen.getByText('普通文本')).toBeTruthy();
  });
});

describe('TeachingPanel Beginner 区块', () => {
  it('传入 beginner 内容时显示详解与要点', () => {
    const entry = getAlgorithm('quick-sort')!;
    const steps = collectSteps(entry.run(entry.defaultInput));
    render(
      <TeachingPanel
        meta={entry.meta}
        step={steps[1]}
        beginner={{ detail: '这是逐步详解内容。', note: '这是算法要点。' }}
      />,
    );
    expect(screen.getByText('这是逐步详解内容。')).toBeTruthy();
    expect(screen.getByText(/这是算法要点/)).toBeTruthy();
  });

  it('未传入 beginner（Standard 模式）不渲染详解区', () => {
    const entry = getAlgorithm('quick-sort')!;
    const steps = collectSteps(entry.run(entry.defaultInput));
    render(<TeachingPanel meta={entry.meta} step={steps[1]} />);
    expect(screen.queryByText('这是逐步详解内容。')).toBeNull();
  });
});

describe('Beginner Mode 全局切换集成', () => {
  it('算法页开启新手模式后显示逐步详解；关闭后消失', () => {
    const store = initLearningStore(null);
    renderRouted(<AlgorithmPage />, '/sorting/quick-sort');
    // 前进两步到「分区开始」步（pivot-set 有详解）
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(document.querySelector('.beginner-detail')).toBeNull();
    act(() => store.setBeginnerMode(true));
    expect(document.querySelector('.beginner-detail')).not.toBeNull();
    act(() => store.setBeginnerMode(false));
    expect(document.querySelector('.beginner-detail')).toBeNull();
  });

  it('顶栏新手按钮存在且 aria-pressed 反映状态', () => {
    const store = initLearningStore(null);
    render(<App />);
    const btn = screen.getByRole('button', { name: /切换到新手模式/ });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    act(() => store.setBeginnerMode(true));
    expect(screen.getByRole('button', { name: '切换到标准模式' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('GlossaryPage', () => {
  it('渲染全部术语卡片', () => {
    renderRouted(<GlossaryPage />, '/glossary');
    expect(screen.getByRole('heading', { name: '术语表' })).toBeTruthy();
    expect(screen.getByText('基准值（pivot）')).toBeTruthy();
    expect(screen.getByText(/动态规划中「子问题的精确描述」/)).toBeTruthy();
  });
});

describe('概念课术语标记', () => {
  it('概念课页渲染术语引用（可点击）', () => {
    renderRouted(<ConceptPage />, '/learn/concept/space-complexity');
    const refs = document.querySelectorAll('.term-ref');
    expect(refs.length).toBeGreaterThanOrEqual(3);
  });
});
