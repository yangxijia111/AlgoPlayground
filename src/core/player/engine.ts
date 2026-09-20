/**
 * PlaybackEngine：纯 TS 播放引擎（headless 可测）。
 * 职责：维护当前步下标、播放状态与速度；不持有帧数据，只持有步骤总数。
 * 推进公式：每步耗时 baseMs / speed；由外部时钟（React 的 rAF）驱动 tick。
 * 详见 docs/STATE_SPEC.md 的状态转移表与不变式 I1–I4。
 */

export const BASE_STEP_MS = 500;
/** 支持的速度档位 */
export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export interface PlayerSnapshot {
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  finished: boolean;
}

export class PlaybackEngine {
  private listeners = new Set<() => void>();
  private snapshot: PlayerSnapshot;
  /** 距下一步的累积时间（ms） */
  private acc = 0;

  constructor(
    /** 步骤总数（可为 0：所有操作安全无效） */
    public readonly total: number,
    private baseMs: number = BASE_STEP_MS,
  ) {
    this.snapshot = {
      index: 0,
      total,
      playing: false,
      speed: 1,
      finished: total === 0 || total === 1,
    };
  }

  // ---- 订阅（供 useSyncExternalStore） ----

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = (): PlayerSnapshot => this.snapshot;

  private emit(): void {
    for (const cb of this.listeners) cb();
  }

  private setIndex(i: number): void {
    const index = Math.max(0, Math.min(i, Math.max(0, this.total - 1)));
    const finished = this.total === 0 || index === this.total - 1;
    if (index === this.snapshot.index && finished === this.snapshot.finished) return;
    this.snapshot = { ...this.snapshot, index, finished };
    this.emit();
  }

  private setPlaying(playing: boolean): void {
    if (this.snapshot.playing === playing) return;
    this.snapshot = { ...this.snapshot, playing };
    this.emit();
  }

  // ---- 时钟驱动 ----

  /** 播放中按 baseMs/speed 累积推进；一次 tick 可推进多步；到达末尾自动暂停 */
  tick(dtMs: number): void {
    if (!this.snapshot.playing || this.total === 0 || this.snapshot.finished) return;
    const stepMs = this.baseMs / this.snapshot.speed;
    this.acc += dtMs;
    while (this.acc >= stepMs && this.snapshot.playing) {
      this.acc -= stepMs;
      const next = this.snapshot.index + 1;
      if (next >= this.total - 1) {
        // 到达最后一步：显示终态并停止
        this.setIndex(this.total - 1);
        this.acc = 0;
        this.setPlaying(false);
        return;
      }
      this.setIndex(next);
    }
  }

  // ---- 控制 ----

  play(): void {
    if (this.total === 0) return;
    if (this.snapshot.finished) {
      // 从头重新播放
      this.acc = 0;
      this.setIndex(0);
      this.snapshot = { ...this.snapshot, finished: false };
    }
    this.setPlaying(true);
  }

  pause(): void {
    this.setPlaying(false);
  }

  toggle(): void {
    if (this.snapshot.playing) this.pause();
    else this.play();
  }

  /** 下一步（手动导航会暂停） */
  next(): void {
    this.setPlaying(false);
    if (this.snapshot.index < this.total - 1) this.setIndex(this.snapshot.index + 1);
    this.acc = 0;
  }

  /** 上一步（手动导航会暂停） */
  prev(): void {
    this.setPlaying(false);
    if (this.snapshot.index > 0) this.setIndex(this.snapshot.index - 1);
    this.acc = 0;
  }

  /** 跳转到任意步（自动钳制，暂停） */
  seek(i: number): void {
    this.setPlaying(false);
    this.acc = 0;
    this.setIndex(i);
  }

  /** 重播：回到第 0 步，保持速度，暂停 */
  restart(): void {
    this.acc = 0;
    this.setPlaying(false);
    this.setIndex(0);
  }

  /** 变速：不影响当前下标 */
  setSpeed(speed: number): void {
    if (!SPEEDS.includes(speed as (typeof SPEEDS)[number])) return;
    this.acc = 0;
    this.snapshot = { ...this.snapshot, speed };
    this.emit();
  }
}
