/**
 * 播放器 React 绑定：rAF 驱动引擎 + useSyncExternalStore 订阅快照。
 * 步骤数组变化（新运行）时重建引擎，从第 0 步开始。
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { PlaybackEngine } from '../../core/player/engine';
import type { PlayerSnapshot } from '../../core/player/engine';
import type { VizStep } from '../../core/step/step';

export function usePlayback(steps: VizStep[]): { engine: PlaybackEngine; snapshot: PlayerSnapshot } {
  const engine = useMemo(() => new PlaybackEngine(steps.length), [steps]);
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  useEffect(() => {
    // jsdom 等测试环境可能没有 rAF：无时钟时引擎仍可通过控制按钮驱动
    if (typeof requestAnimationFrame !== 'function') return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      engine.tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  return { engine, snapshot };
}
