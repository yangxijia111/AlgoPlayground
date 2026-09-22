/**
 * 单链表操作编辑器：建表 / 遍历 / 插入 / 删除 / 搜索，支持连续操作（链式）。
 * 状态转移统一走 applyLinkedListOperation（STATE_CONSISTENCY_SPEC）。
 */
import { useState } from 'react';
import type { LinkedListInput } from '../../core/registry';
import { LINEAR_CAPACITY } from '../../core/algorithms/linear/stackQueue';
import { applyLinkedListOperation } from '../../core/editors/structureState';

function parseItems(text: string): { ok: true; values: string[] } | { ok: false; error: string } {
  const parts = text.split(/[,，\s]+/).filter((p) => p !== '');
  if (parts.length > LINEAR_CAPACITY) return { ok: false, error: `元素个数不能超过 ${LINEAR_CAPACITY}` };
  for (const p of parts) {
    if (p.length > 6) return { ok: false, error: '每个元素的值不能超过 6 个字符' };
  }
  return { ok: true, values: parts };
}

export function LinkedListInputEditor({ value, onCommit }: { value: LinkedListInput; onCommit: (v: LinkedListInput) => void }) {
  const [list, setList] = useState<string[]>(value.initial);
  const [text, setText] = useState(value.initial.join(', '));
  const [posText, setPosText] = useState('1');
  const [valText, setValText] = useState('X');
  const [error, setError] = useState<string | null>(null);

  // 三段式契约：before（闭包捕获）+ operation → after（reducer 计算，拒绝时不变）
  const commit = (operation: LinkedListInput['operation']) => {
    const { next } = applyLinkedListOperation(list, operation);
    setList(next);
    onCommit({ type: 'linkedlist', initial: list, operation });
  };

  const onTraverse = () => {
    setError(null);
    commit({ op: 'traverse' });
  };

  const onInsert = () => {
    const pos = Number(posText);
    if (!Number.isInteger(pos) || pos < 0 || pos > list.length) {
      setError(`插入位置必须在 0–${list.length} 之间`);
      return;
    }
    const v = valText.trim();
    if (v === '' || v.length > 6) {
      setError('请输入不超过 6 个字符的插入值');
      return;
    }
    if (list.length >= LINEAR_CAPACITY) {
      setError(`元素个数不能超过 ${LINEAR_CAPACITY}`);
      return;
    }
    setError(null);
    commit({ op: 'insert', position: pos, value: v });
  };

  const onDelete = () => {
    if (list.length === 0) {
      setError('链表为空，无法删除');
      return;
    }
    const pos = Number(posText);
    if (!Number.isInteger(pos) || pos < 0 || pos >= list.length) {
      setError(`删除位置必须在 0–${list.length - 1} 之间`);
      return;
    }
    setError(null);
    commit({ op: 'delete', position: pos });
  };

  const onSearch = () => {
    const v = valText.trim();
    if (v === '' || v.length > 6) {
      setError('请输入不超过 6 个字符的查找值');
      return;
    }
    setError(null);
    commit({ op: 'search', value: v });
  };

  const onRebuild = () => {
    const r = parseItems(text);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setList(r.values);
    onCommit({ type: 'linkedlist', initial: r.values, operation: { op: 'create' } });
  };

  return (
    <div className="input-editor">
      <div className="editor-row editor-row--inline">
        <span className="field-label">当前链表：</span>
        {list.length === 0 ? (
          <span className="viz-chip viz-chip--note">（空）</span>
        ) : (
          list.map((v, i) => (
            <span key={`${v}-${i}`} className="viz-chip">
              {i}·{v}
            </span>
          ))
        )}
      </div>
      <div className="editor-row">
        <label className="field field--grow">
          <span className="field-label">初始值（逗号/空格分隔，≤12 个，各 ≤6 字符）</span>
          <input type="text" value={text} aria-label="链表初始值" onChange={(e) => setText(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={onRebuild}>
          重建链表
        </button>
      </div>
      <div className="editor-row">
        <label className="field">
          <span className="field-label">位置</span>
          <input type="text" value={posText} style={{ width: 70 }} aria-label="操作位置" onChange={(e) => setPosText(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">值（插入/搜索用）</span>
          <input type="text" value={valText} style={{ width: 90 }} aria-label="操作值" onChange={(e) => setValText(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={onInsert}>
          插入
        </button>
        <button type="button" className="btn" onClick={onDelete}>
          删除
        </button>
        <button type="button" className="btn" onClick={onSearch}>
          搜索
        </button>
        <button type="button" className="btn btn-ghost" onClick={onTraverse}>
          遍历
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
