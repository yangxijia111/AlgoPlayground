/**
 * ArrayBars / TeachingPanel 组件测试（TEST_PLAN T5）。
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { arrayFrame } from '../../core/step/frame';
import { ArrayBars } from './frames/ArrayBars';
import { TeachingPanel } from './TeachingPanel';
import type { AlgorithmMeta } from '../../core/registry';
import type { VizStep } from '../../core/step/step';

describe('ArrayBars', () => {
  it('按元素数量渲染柱子', () => {
    const frame = arrayFrame([3, 1, 2]);
    const { container } = render(<ArrayBars frame={frame} />);
    expect(container.querySelectorAll('rect.viz-el')).toHaveLength(3);
  });

  it('comparing 下标应用 active 样式，sorted 应用 success 样式', () => {
    const frame = arrayFrame([3, 1, 2], { comparing: [0], sorted: [2] });
    const { container } = render(<ArrayBars frame={frame} />);
    const rects = container.querySelectorAll('rect.viz-el');
    expect(rects[0].classList.contains('viz-el--active')).toBe(true);
    expect(rects[2].classList.contains('viz-el--success')).toBe(true);
  });

  it('range 之外且无其他状态的下标为 muted', () => {
    const frame = arrayFrame([5, 4, 3, 2, 1], { range: [2, 4] });
    const { container } = render(<ArrayBars frame={frame} />);
    const rects = container.querySelectorAll('rect.viz-el');
    expect(rects[0].classList.contains('viz-el--muted')).toBe(true);
    expect(rects[2].classList.contains('viz-el--muted')).toBe(false);
  });

  it('空数组显示空态', () => {
    render(<ArrayBars frame={arrayFrame([])} />);
    expect(screen.getByText('数组为空')).toBeInTheDocument();
  });

  it('n ≤ 30 时显示数值标签与目标值', () => {
    const frame = arrayFrame([7, 8], { target: 8 });
    const { container } = render(<ArrayBars frame={frame} />);
    expect(screen.getByText('目标值：8')).toBeInTheDocument();
    expect(container.querySelectorAll('text.viz-text').length).toBeGreaterThanOrEqual(2);
  });
});

const meta: AlgorithmMeta = {
  id: 'test',
  name: '测试算法',
  enName: 'Test Algorithm',
  category: 'sorting',
  purpose: '用途文本',
  coreIdea: '核心思想文本',
  timeComplexity: 'O(1)',
  spaceComplexity: 'O(1)',
  stability: '稳定',
  pseudocode: ['line zero', 'line one', 'line two'],
};

function makeStep(lines: number[]): VizStep {
  return {
    frame: arrayFrame([1, 2, 3]),
    description: '正在测试',
    pseudocodeLines: lines,
    counters: { comparisons: 2, swaps: 1 },
  };
}

describe('TeachingPanel', () => {
  it('渲染元信息（复杂度/稳定性）', () => {
    render(<TeachingPanel meta={meta} step={makeStep([])} />);
    expect(screen.getAllByText('O(1)').length).toBe(2);
    expect(screen.getByText('稳定')).toBeInTheDocument();
  });

  it('高亮当前伪代码行', () => {
    const { container } = render(<TeachingPanel meta={meta} step={makeStep([1])} />);
    const items = container.querySelectorAll('.pseudocode li');
    expect(items[1].classList.contains('is-active')).toBe(true);
    expect(items[0].classList.contains('is-active')).toBe(false);
  });

  it('显示当前步骤解释与计数器', () => {
    render(<TeachingPanel meta={meta} step={makeStep([])} />);
    expect(screen.getByText('正在测试')).toBeInTheDocument();
    expect(screen.getByText('比较次数')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('交换次数')).toBeInTheDocument();
  });
});
