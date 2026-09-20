/**
 * 图帧的"变量与状态"文本视图：距离/前驱表 + frontier。
 */
import type { GraphFrame } from '../../../core/step/frame';
import { formatDistance } from '../../../core/validation';

const FRONTIER_LABELS: Record<string, string> = {
  queue: '队列内容',
  stack: '栈内容',
  set: '未确定集',
  none: '',
};

export function GraphStateView({ frame }: { frame: GraphFrame }) {
  return (
    <div className="graph-state">
      <ul className="state-list">
        {frame.nodes.map((n) => (
          <li key={n.id}>
            <span className="state-key">
              {n.id}
              {frame.current === n.id ? '（当前）' : ''}
            </span>
            <code className="state-val">
              dist={formatDistance(n.distance)}
              {n.predecessor ? `，pred=${n.predecessor}` : ''}
            </code>
          </li>
        ))}
        {frame.frontierKind !== 'none' && frame.frontier.length > 0 ? (
          <li>
            <span className="state-key">{FRONTIER_LABELS[frame.frontierKind]}</span>
            <code className="state-val">{frame.frontier.map((f) => f.id).join(' · ')}</code>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
