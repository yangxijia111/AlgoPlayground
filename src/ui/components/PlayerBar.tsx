/**
 * 底部播放控制器：播放/暂停/上一步/下一步/重播/速度/时间轴/步数。
 */
import { SPEEDS } from '../../core/player/engine';
import type { PlaybackEngine, PlayerSnapshot } from '../../core/player/engine';

const SPEED_LABELS: Record<string, string> = {
  '0.25': '0.25x',
  '0.5': '0.5x',
  '1': '1x',
  '2': '2x',
  '4': '4x',
};

export function PlayerBar({ snapshot, engine }: { snapshot: PlayerSnapshot; engine: PlaybackEngine }) {
  const { index, total, playing, speed } = snapshot;
  const disabled = total === 0;

  return (
    <div className="player-bar" role="toolbar" aria-label="播放控制器">
      <div className="player-buttons">
        <button type="button" className="btn btn-icon" aria-label="重播" title="重播 (R)" disabled={disabled} onClick={() => engine.restart()}>
          ⟲
        </button>
        <button type="button" className="btn btn-icon" aria-label="上一步" title="上一步 (←)" disabled={disabled} onClick={() => engine.prev()}>
          ⏮
        </button>
        <button
          type="button"
          className="btn btn-icon btn-primary"
          aria-label={playing ? '暂停' : '播放'}
          title={playing ? '暂停 (空格)' : '播放 (空格)'}
          disabled={disabled}
          onClick={() => engine.toggle()}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button type="button" className="btn btn-icon" aria-label="下一步" title="下一步 (→)" disabled={disabled} onClick={() => engine.next()}>
          ⏭
        </button>
      </div>

      <div className="player-progress">
        <input
          type="range"
          className="player-slider"
          min={0}
          max={Math.max(0, total - 1)}
          value={index}
          disabled={disabled}
          aria-label="时间轴"
          onChange={(e) => engine.seek(Number(e.target.value))}
        />
        <span className="player-step" aria-live="polite">
          {disabled ? '0 / 0' : `${index + 1} / ${total}`}
        </span>
      </div>

      <div className="player-speed" role="group" aria-label="播放速度">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn btn-speed${speed === s ? ' is-active' : ''}`}
            aria-pressed={speed === s}
            aria-label={`速度 ${SPEED_LABELS[String(s)]}`}
            onClick={() => engine.setSpeed(s)}
          >
            {SPEED_LABELS[String(s)]}
          </button>
        ))}
      </div>
    </div>
  );
}
