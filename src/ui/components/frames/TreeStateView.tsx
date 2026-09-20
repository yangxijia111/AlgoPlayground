/**
 * 树帧的"变量与状态"文本视图。
 */
import type { TreeFrame } from '../../../core/step/frame';

export function TreeStateView({ frame }: { frame: TreeFrame }) {
  const activeNodes = frame.nodes.filter((n) => n.state === 'active' || n.state === 'special' || n.state === 'danger');
  return (
    <ul className="state-list">
      <li>
        <span className="state-key">节点数</span>
        <code className="state-val">{frame.nodes.length}</code>
      </li>
      {activeNodes.length > 0 ? (
        <li>
          <span className="state-key">当前关注节点</span>
          <code className="state-val">{activeNodes.map((n) => n.value).join(', ')}</code>
        </li>
      ) : null}
      <li>
        <span className="state-key">遍历输出</span>
        <code className="state-val">{frame.output.length > 0 ? frame.output.join(' → ') : '—'}</code>
      </li>
    </ul>
  );
}
