/**
 * 栈/队列操作编辑器：显示当前元素，提供入/出/查看操作按钮，支持连续操作（链式）。
 * 状态转移统一走 applyLinearOperation（STATE_CONSISTENCY_SPEC：UI ⇄ Generator ⇄ Reference 三方一致）。
 */
import { useState } from 'react';
import type { LinearInput, LinearOperation } from '../../core/registry';
import { LINEAR_CAPACITY } from '../../core/algorithms/linear/stackQueue';
import { applyLinearOperation } from '../../core/editors/structureState';

function parseItems(text: string): { ok: true; values: string[] } | { ok: false; error: string } {
  const parts = text.split(/[,，\s]+/).filter((p) => p !== '');
  if (parts.length > LINEAR_CAPACITY) return { ok: false, error: `元素个数不能超过 ${LINEAR_CAPACITY}` };
  for (const p of parts) {
    if (p.length > 6) return { ok: false, error: '每个元素的值不能超过 6 个字符' };
  }
  return { ok: true, values: parts };
}

export function LinearInputEditor({ value, onCommit }: { value: LinearInput; onCommit: (v: LinearInput) => void }) {
  const [list, setList] = useState<string[]>(value.initial);
  const [opText, setOpText] = useState('E');
  const [error, setError] = useState<string | null>(null);

  const isStack = value.structure === 'stack';
  const label = isStack ? '栈' : '队列';

  // 三段式契约：before（闭包捕获）+ operation → after（reducer 计算，拒绝时不变）
  const runOp = (operation: LinearOperation) => {
    const { next } = applyLinearOperation(list, value.structure, operation);
    setList(next);
    onCommit({ type: 'linear', structure: value.structure, initial: list, operation });
  };

  const onPush = () => {
    const v = opText.trim();
    if (v === '') {
      setError(`请输入要${isStack ? '入栈' : '入队'}的值`);
      return;
    }
    if (v.length > 6) {
      setError('插入的值不能超过 6 个字符');
      return;
    }
    setError(null);
    runOp(isStack ? { op: 'push', value: v } : { op: 'enqueue', value: v });
  };

  const onPop = () => {
    setError(null);
    runOp(isStack ? { op: 'pop' } : { op: 'dequeue' });
  };

  const onPeek = () => {
    setError(null);
    runOp(isStack ? { op: 'peek' } : { op: 'front' });
  };

  const onReset = () => {
    const r = parseItems(opText);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setList(r.values);
    onCommit({ type: 'linear', structure: value.structure, initial: r.values, operation: isStack ? { op: 'peek' } : { op: 'front' } });
  };

  return (
    <div className="input-editor">
      <div className="editor-row editor-row--inline">
        <span className="field-label">
          当前{label}（{list.length}/{LINEAR_CAPACITY}）：
        </span>
        {list.length === 0 ? (
          <span className="viz-chip viz-chip--note">（空）</span>
        ) : (
          list.map((v, i) => (
            <span key={`${v}-${i}`} className="viz-chip">
              {v}
            </span>
          ))
        )}
      </div>
      <div className="editor-row">
        <label className="field">
          <span className="field-label">{isStack ? '入栈值 / 重置内容' : '入队值 / 重置内容'}</span>
          <input
            type="text"
            value={opText}
            style={{ width: 140 }}
            aria-label="操作值"
            onChange={(e) => setOpText(e.target.value)}
          />
        </label>
        <button type="button" className="btn" onClick={onPush}>
          {isStack ? '入栈 Push' : '入队 Enqueue'}
        </button>
        <button type="button" className="btn" onClick={onPop}>
          {isStack ? '出栈 Pop' : '出队 Dequeue'}
        </button>
        <button type="button" className="btn" onClick={onPeek}>
          {isStack ? '查看栈顶 Peek' : '查看队首 Front'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReset} title="用上方输入框的内容重置结构（逗号/空格分隔）">
          重置
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
