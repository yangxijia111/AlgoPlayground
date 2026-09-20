/**
 * 线性结构帧的"变量与状态"文本视图。
 */
import type { StructureFrame } from '../../../core/step/frame';

export function StructureStateView({ frame }: { frame: StructureFrame }) {
  const rows: [string, string][] = [['元素个数', String(frame.nodes.length)]];
  for (const [name, idx] of Object.entries(frame.pointers)) {
    const node = idx === null ? '空（null）' : `${frame.nodes[idx]?.value ?? '—'}（#${idx}）`;
    rows.push([name, node]);
  }
  return (
    <ul className="state-list">
      {rows.map(([k, v]) => (
        <li key={k}>
          <span className="state-key">{k}</span>
          <code className="state-val">{v}</code>
        </li>
      ))}
    </ul>
  );
}
