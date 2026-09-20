/**
 * PlaybackEngine 行为测试：覆盖 docs/STATE_SPEC.md 的状态转移表与不变式 I1–I4。
 */
import { describe, expect, it } from 'vitest';
import { PlaybackEngine } from './engine';

function make(total = 5, baseMs = 100): PlaybackEngine {
  return new PlaybackEngine(total, baseMs);
}

describe('PlaybackEngine', () => {
  it('初始状态：index=0、暂停、1x、total≥1 时未 finished', () => {
    const s = make().getSnapshot();
    expect(s.index).toBe(0);
    expect(s.playing).toBe(false);
    expect(s.speed).toBe(1);
    expect(s.finished).toBe(false);
    expect(s.total).toBe(5);
  });

  it('total=1 时初始即 finished；total=0 时同样 finished', () => {
    expect(make(1).getSnapshot().finished).toBe(true);
    expect(make(0).getSnapshot().finished).toBe(true);
  });

  it('next/prev 在边界安全：0 处 prev 无效，末尾 next 无效', () => {
    const e = make(3);
    e.prev();
    expect(e.getSnapshot().index).toBe(0);
    e.seek(2);
    e.next();
    expect(e.getSnapshot().index).toBe(2);
    expect(e.getSnapshot().finished).toBe(true);
  });

  it('手动导航（next/prev/seek）会暂停', () => {
    const e = make(5);
    e.play();
    e.next();
    expect(e.getSnapshot().playing).toBe(false);
    e.play();
    e.seek(2);
    expect(e.getSnapshot().playing).toBe(false);
    e.play();
    e.prev();
    expect(e.getSnapshot().playing).toBe(false);
  });

  it('tick 按播放推进：baseMs=100 时每 100ms 推进一步', () => {
    const e = make(10, 100);
    e.play();
    e.tick(100);
    expect(e.getSnapshot().index).toBe(1);
    e.tick(50);
    expect(e.getSnapshot().index).toBe(1); // 不足一步不推进
    e.tick(50);
    expect(e.getSnapshot().index).toBe(2);
  });

  it('一次 tick 可推进多步', () => {
    const e = make(10, 100);
    e.play();
    e.tick(450);
    expect(e.getSnapshot().index).toBe(4);
  });

  it('4x 速度推进速率是 1x 的 4 倍（不变式 I4：只影响速率）', () => {
    const a = make(100, 400);
    a.play();
    a.tick(400);
    expect(a.getSnapshot().index).toBe(1);

    const b = make(100, 400);
    b.play();
    b.setSpeed(4);
    b.tick(400);
    expect(b.getSnapshot().index).toBe(4);
  });

  it('暂停后 tick 不改变任何状态（不变式 I2）', () => {
    const e = make(10, 100);
    e.play();
    e.tick(100);
    e.pause();
    const before = e.getSnapshot();
    e.tick(10_000);
    expect(e.getSnapshot()).toEqual(before);
  });

  it('到达最后一步自动暂停并 finished', () => {
    const e = make(3, 100);
    e.play();
    e.tick(1000);
    const s = e.getSnapshot();
    expect(s.index).toBe(2);
    expect(s.playing).toBe(false);
    expect(s.finished).toBe(true);
  });

  it('finished 后 play 从头播放', () => {
    const e = make(3, 100);
    e.seek(2);
    e.play();
    expect(e.getSnapshot().index).toBe(0);
    expect(e.getSnapshot().playing).toBe(true);
  });

  it('seek 越界自动钳制到 [0, total-1]', () => {
    const e = make(3);
    e.seek(-5);
    expect(e.getSnapshot().index).toBe(0);
    e.seek(99);
    expect(e.getSnapshot().index).toBe(2);
  });

  it('restart 回到 0、暂停、保持速度', () => {
    const e = make(10, 100);
    e.setSpeed(2);
    e.play();
    e.tick(500);
    e.restart();
    const s = e.getSnapshot();
    expect(s.index).toBe(0);
    expect(s.playing).toBe(false);
    expect(s.speed).toBe(2);
  });

  it('setSpeed 不改变当前下标', () => {
    const e = make(10, 100);
    e.play();
    e.tick(250);
    e.setSpeed(0.5);
    expect(e.getSnapshot().index).toBe(2);
    expect(e.getSnapshot().speed).toBe(0.5);
  });

  it('非法速度被忽略', () => {
    const e = make(5);
    e.setSpeed(3);
    expect(e.getSnapshot().speed).toBe(1);
  });

  it('total=0 时所有操作安全（不变式 I1）', () => {
    const e = make(0);
    expect(() => {
      e.play();
      e.tick(1000);
      e.next();
      e.prev();
      e.seek(3);
      e.restart();
      e.setSpeed(2);
    }).not.toThrow();
    expect(e.getSnapshot().index).toBe(0);
    expect(e.getSnapshot().finished).toBe(true);
  });

  it('可重放性（不变式 I3）：不同操作路径到达同一下标，快照一致', () => {
    const a = make(20, 100);
    a.play();
    a.tick(650);
    a.pause();

    const b = make(20, 100);
    b.seek(4);
    b.setSpeed(2);
    b.seek(6);

    const sa = a.getSnapshot();
    const sb = b.getSnapshot();
    expect(sb.index).toBe(sa.index);
    expect(sa.index).toBe(6);
    expect(sb.playing).toBe(sa.playing);
    expect(sb.finished).toBe(sa.finished);
  });

  it('订阅：状态变化时通知监听器', () => {
    const e = make(5);
    let calls = 0;
    const unsub = e.subscribe(() => calls++);
    e.play();
    e.tick(100);
    e.pause();
    unsub();
    e.play(); // 取消订阅后不再通知
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
