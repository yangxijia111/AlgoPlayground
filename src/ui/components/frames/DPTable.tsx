/**
 * DP 表格渲染器：逐格填充 + 当前格高亮 + 依赖格提示 + 物品清单。
 */
import type { DPFrame } from '../../../core/step/frame';

export function DPTable({ frame }: { frame: DPFrame }) {
  const { rowHeaders, colHeaders, cells, current, dependencies, extras } = frame;
  const colCount = colHeaders.length;
  const depSet = new Set(dependencies);

  return (
    <div className="dp-view">
      <div className="structure-caption">{frame.message}</div>
      <div className="dp-table-wrap">
        <table className="dp-table" role="table" aria-label="DP 表">
          <thead>
            <tr>
              <th className="dp-corner" />
              {colHeaders.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowHeaders.map((rh, ri) => (
              <tr key={rh + ri}>
                <th>{rh}</th>
                {colHeaders.map((_, ci) => {
                  const idx = ri * colCount + ci;
                  const v = cells[idx];
                  const classes = ['dp-cell'];
                  if (idx === current) classes.push('is-current');
                  else if (depSet.has(idx)) classes.push('is-dep');
                  else if (v !== null) classes.push('is-filled');
                  return (
                    <td key={ci} className={classes.join(' ')}>
                      {v === null ? '·' : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {extras.items.length > 0 ? (
        <div className="dp-extras">
          <span className="field-label">{extras.label}：</span>
          {extras.items.map((it) => (
            <span key={it} className="viz-chip viz-chip--note">
              {it}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
