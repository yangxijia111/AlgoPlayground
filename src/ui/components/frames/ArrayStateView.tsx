/**
 * 数组帧的"变量与状态"文本视图（右栏展示）。
 */
import { formatDistance } from '../../../core/validation';
import type { ArrayFrame } from '../../../core/step/frame';

export function ArrayStateView({ frame }: { frame: ArrayFrame }) {
  const rows: [string, string][] = [];
  for (const [name, idx] of Object.entries(frame.pointers)) {
    rows.push([name, `a[${idx}] = ${frame.values[idx] ?? '—'}`]);
  }
  if (frame.range) rows.push(['区间', `a[${frame.range[0]}..${frame.range[1]}]`]);
  if (frame.pivot !== null) rows.push(['pivot', `a[${frame.pivot}] = ${frame.values[frame.pivot]}`]);
  if (frame.target !== null) rows.push(['目标值', formatDistance(frame.target)]);
  if (frame.found !== null) rows.push(['找到位置', `a[${frame.found}]`]);

  if (rows.length === 0) {
    return <p className="state-empty">当前步骤没有需要显示的变量</p>;
  }
  return (
    <ul className="state-list">
      {rows.map(([k, v]) => (
        <li key={k + v}>
          <span className="state-key">{k}</span>
          <code className="state-val">{v}</code>
        </li>
      ))}
    </ul>
  );
}
