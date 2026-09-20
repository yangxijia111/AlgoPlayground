/**
 * 数组柱状图渲染器（排序/搜索共用）。
 * 颜色由元素语义状态决定（见 VISUALIZATION_SPEC §2），数值/下标在规模允许时显示。
 */
import type { ArrayFrame, ElementState } from '../../../core/step/frame';

const VIEW_W = 1000;
const CHART_H = 380;
const AXIS_H = 64;

function stateFor(frame: ArrayFrame, i: number): ElementState {
  if (frame.found === i) return 'success';
  if (frame.swapping.includes(i)) return 'danger';
  if (frame.comparing.includes(i)) return 'active';
  if (frame.pivot === i) return 'special';
  if (frame.sorted.includes(i)) return 'success';
  if (frame.range && (i < frame.range[0] || i > frame.range[1])) return 'muted';
  return 'normal';
}

export function ArrayBars({ frame }: { frame: ArrayFrame }) {
  const { values } = frame;
  const n = values.length;
  if (n === 0) {
    return <div className="viz-empty">数组为空</div>;
  }

  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const slotW = VIEW_W / n;
  const barW = slotW * 0.72;
  const showValue = n <= 30;
  const showIndex = n <= 40;

  // 指针按下标分组，便于同行显示
  const pointerEntries = Object.entries(frame.pointers);
  const pointersByIndex = new Map<number, string[]>();
  for (const [name, idx] of pointerEntries) {
    const list = pointersByIndex.get(idx) ?? [];
    list.push(name);
    pointersByIndex.set(idx, list);
  }

  return (
    <div className="array-bars">
      {(frame.target !== null || frame.note) && (
        <div className="viz-caption">
          {frame.target !== null && <span className="viz-chip">目标值：{frame.target}</span>}
          {frame.note && <span className="viz-chip viz-chip--note">{frame.note}</span>}
        </div>
      )}
      <svg
        viewBox={`0 0 ${VIEW_W} ${CHART_H + AXIS_H}`}
        className="array-svg"
        role="img"
        aria-label={`数组可视化，共 ${n} 个元素`}
        preserveAspectRatio="xMidYMid meet"
      >
        {values.map((v, i) => {
          const h = 26 + ((v - min) / span) * (CHART_H - 50);
          const x = i * slotW + (slotW - barW) / 2;
          const y = CHART_H - h;
          const st = stateFor(frame, i);
          const cx = i * slotW + slotW / 2;
          return (
            <g key={i}>
              <rect
                className={`viz-el viz-el--${st}`}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={Math.min(4, barW / 4)}
              />
              {showValue && (
                <text x={cx} y={y - 7} textAnchor="middle" className="viz-text">
                  {v}
                </text>
              )}
              {showIndex && (
                <text x={cx} y={CHART_H + 18} textAnchor="middle" className="viz-text viz-text--dim">
                  {i}
                </text>
              )}
            </g>
          );
        })}
        {[...pointersByIndex.entries()].map(([idx, names]) => {
          const cx = idx * slotW + slotW / 2;
          return (
            <text key={idx} x={cx} y={CHART_H + 42} textAnchor="middle" className="viz-pointer">
              {names.join('·')}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
