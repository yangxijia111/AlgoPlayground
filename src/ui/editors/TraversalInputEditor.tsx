/**
 * 遍历编辑器：选择遍历顺序 + 重建树。
 */
import { useState } from 'react';
import { parseIntArray } from '../../core/validation';
import type { BSTInput, TraverseOrder } from '../../core/registry';

const MAX_NODES = 31;

const ORDERS: { id: TraverseOrder; name: string }[] = [
  { id: 'pre', name: '前序 Preorder' },
  { id: 'in', name: '中序 Inorder' },
  { id: 'post', name: '后序 Postorder' },
  { id: 'level', name: '层序 Level Order' },
];

export function TraversalInputEditor({ value, onCommit }: { value: BSTInput; onCommit: (v: BSTInput) => void }) {
  const [tree, setTree] = useState<number[]>(value.startTree);
  const [text, setText] = useState(value.startTree.join(', '));
  const [error, setError] = useState<string | null>(null);

  const onRebuild = () => {
    const r = parseIntArray(text, { minLen: 1, maxLen: MAX_NODES, minVal: -99, maxVal: 999 });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setTree(r.values);
    onCommit({ type: 'bst', startTree: r.values, operation: { op: 'build', values: r.values } });
  };

  const onTraverse = (order: TraverseOrder) => {
    setError(null);
    onCommit({ type: 'bst', startTree: tree, operation: { op: 'traverse', order } });
  };

  const currentOrder = value.operation.op === 'traverse' ? value.operation.order : null;

  return (
    <div className="input-editor">
      <div className="editor-row">
        <label className="field field--grow">
          <span className="field-label">树节点（逗号分隔插入序，≤31 个）</span>
          <input type="text" value={text} aria-label="树的初始值" onChange={(e) => setText(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={onRebuild}>
          重建树
        </button>
      </div>
      <div className="editor-row" role="group" aria-label="遍历顺序">
        <span className="field-label">遍历顺序：</span>
        {ORDERS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`btn btn-speed${currentOrder === o.id ? ' is-active' : ''}`}
            aria-pressed={currentOrder === o.id}
            onClick={() => onTraverse(o.id)}
          >
            {o.name}
          </button>
        ))}
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
