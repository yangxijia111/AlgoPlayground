/**
 * BST 操作编辑器：重建（建树动画）/ 插入 / 搜索 / 删除，支持连续操作（链式）。
 * 状态转移统一走 applyBSTOperation（STATE_CONSISTENCY_SPEC）：
 * 删除必须用「删除产物树的先序序列」表示——双子节点删除时
 * 「原序列去掉该值」重建的树与真实 BST 删除产物不同构。
 */
import { useState } from 'react';
import { parseIntArray } from '../../core/validation';
import type { BSTInput } from '../../core/registry';
import { applyBSTOperation } from '../../core/editors/structureState';

const MAX_NODES = 31;

export function BSTInputEditor({ value, onCommit }: { value: BSTInput; onCommit: (v: BSTInput) => void }) {
  const [tree, setTree] = useState<number[]>(value.startTree);
  const [text, setText] = useState(value.startTree.join(', '));
  const [valText, setValText] = useState('55');
  const [error, setError] = useState<string | null>(null);

  const parseValue = (): number | null => {
    const v = Number(valText.trim());
    if (!Number.isInteger(v)) {
      setError('值必须是整数');
      return null;
    }
    if (v < -99 || v > 999) {
      setError('值超出取值范围 -99–999');
      return null;
    }
    return v;
  };

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

  const onInsert = () => {
    const v = parseValue();
    if (v === null) return;
    if (tree.includes(v)) {
      setError(`值 ${v} 已存在于树中`);
      return;
    }
    if (tree.length >= MAX_NODES) {
      setError(`树的节点数不能超过 ${MAX_NODES}`);
      return;
    }
    setError(null);
    setTree([...tree, v]);
    onCommit({ type: 'bst', startTree: tree, operation: { op: 'insert', value: v } });
  };

  const onSearch = () => {
    const v = parseValue();
    if (v === null) return;
    setError(null);
    onCommit({ type: 'bst', startTree: tree, operation: { op: 'search', value: v } });
  };

  const onDelete = () => {
    const v = parseValue();
    if (v === null) return;
    setError(null);
    // reducer 内部处理「值不存在 → 拒绝」；成功时返回删除产物树的先序序列
    const result = applyBSTOperation(tree, { op: 'delete', value: v });
    if (result.rejected) {
      setError(`树中不存在 ${v}，无法删除`);
      return;
    }
    setTree(result.next);
    onCommit({ type: 'bst', startTree: tree, operation: { op: 'delete', value: v } });
  };

  return (
    <div className="input-editor">
      <div className="editor-row editor-row--inline">
        <span className="field-label">当前树节点（插入序）：</span>
        {tree.map((v, i) => (
          <span key={`${v}-${i}`} className="viz-chip">
            {v}
          </span>
        ))}
      </div>
      <div className="editor-row">
        <label className="field field--grow">
          <span className="field-label">初始值（逗号分隔，≤31 个，各 -99–999）</span>
          <input type="text" value={text} aria-label="树的初始值" onChange={(e) => setText(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={onRebuild}>
          重建树
        </button>
      </div>
      <div className="editor-row">
        <label className="field">
          <span className="field-label">值</span>
          <input
            type="text"
            value={valText}
            style={{ width: 90 }}
            aria-label="操作值"
            onChange={(e) => setValText(e.target.value)}
          />
        </label>
        <button type="button" className="btn" onClick={onInsert}>
          插入
        </button>
        <button type="button" className="btn" onClick={onSearch}>
          搜索
        </button>
        <button type="button" className="btn" onClick={onDelete}>
          删除
        </button>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
