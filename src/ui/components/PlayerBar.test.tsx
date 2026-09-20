/**
 * PlayerBar 组件测试（TEST_PLAN T5）。
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { describe, expect, it } from 'vitest';
import { PlaybackEngine } from '../../core/player/engine';
import { PlayerBar } from './PlayerBar';

/** 订阅引擎快照的测试壳：引擎状态变化时触发重渲染（与生产 usePlayback 行为一致） */
function Harness({ engine }: { engine: PlaybackEngine }) {
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  return <PlayerBar snapshot={snapshot} engine={engine} />;
}

function mount(total: number) {
  const engine = new PlaybackEngine(total);
  render(<Harness engine={engine} />);
  return engine;
}

describe('PlayerBar', () => {
  it('下一步/上一步按钮推进与回退引擎', () => {
    const engine = mount(5);
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(engine.getSnapshot().index).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '上一步' }));
    expect(engine.getSnapshot().index).toBe(0);
  });

  it('重播按钮回到第 0 步', () => {
    const engine = mount(5);
    engine.seek(3);
    fireEvent.click(screen.getByRole('button', { name: '重播' }));
    expect(engine.getSnapshot().index).toBe(0);
  });

  it('播放按钮切换播放状态', () => {
    const engine = mount(5);
    fireEvent.click(screen.getByRole('button', { name: '播放' }));
    expect(engine.getSnapshot().playing).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    expect(engine.getSnapshot().playing).toBe(false);
  });

  it('速度按钮切换速度档位', () => {
    const engine = mount(5);
    fireEvent.click(screen.getByRole('button', { name: '速度 4x' }));
    expect(engine.getSnapshot().speed).toBe(4);
  });

  it('拖动时间轴触发 seek', () => {
    const engine = mount(5);
    const slider = screen.getByRole('slider', { name: '时间轴' });
    fireEvent.change(slider, { target: { value: '3' } });
    expect(engine.getSnapshot().index).toBe(3);
  });

  it('显示当前步/总步数', () => {
    mount(7);
    expect(screen.getByText('1 / 7')).toBeInTheDocument();
  });

  it('total=0 时按钮禁用', () => {
    mount(0);
    expect(screen.getByRole('button', { name: '播放' })).toBeDisabled();
  });
});
