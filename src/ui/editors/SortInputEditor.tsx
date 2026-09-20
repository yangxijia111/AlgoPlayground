/**
 * 排序输入编辑器：随机/几乎有序/逆序/重复值生成（带种子）+ 自定义数组（带校验）+ 大小调节。
 */
import { useState } from 'react';
import { DATA_PATTERNS, generateArray } from '../../core/algorithms/data';
import type { DataPattern } from '../../core/algorithms/data';
import { parseIntArray } from '../../core/validation';
import type { SortInput } from '../../core/registry';

export function SortInputEditor({ value, onCommit }: { value: SortInput; onCommit: (v: SortInput) => void }) {
  const [pattern, setPattern] = useState<DataPattern>('random');
  const [size, setSize] = useState(16);
  const [seed, setSeed] = useState(42);
  const [text, setText] = useState(value.array.join(', '));
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    const arr = generateArray(pattern, size, seed);
    setText(arr.join(', '));
    setError(null);
    onCommit({ type: 'sort', array: arr });
  };

  const applyCustom = () => {
    const r = parseIntArray(text, { minLen: 1, maxLen: 60, minVal: -99, maxVal: 999 });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    onCommit({ type: 'sort', array: r.values });
  };

  return (
    <div className="input-editor">
      <div className="editor-row">
        <label className="field">
          <span className="field-label">数据模式</span>
          <select value={pattern} onChange={(e) => setPattern(e.target.value as DataPattern)}>
            {DATA_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--grow">
          <span className="field-label">数组大小：{size}</span>
          <input
            type="range"
            min={4}
            max={60}
            value={size}
            aria-label="数组大小"
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
        <button type="button" className="btn" onClick={generate}>
          生成数据
        </button>
      </div>

      <div className="editor-row">
        <label className="field field--grow">
          <span className="field-label">自定义数组（逗号分隔，-99–999，最多 60 个）</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCustom();
            }}
            aria-label="自定义数组"
            placeholder="例如：5, 3, 8, 1"
          />
        </label>
        <button type="button" className="btn" onClick={applyCustom}>
          应用
        </button>
      </div>

      <div className="editor-row editor-row--inline">
        <button type="button" className="btn btn-ghost" onClick={() => setSeed((s) => s + 1)}>
          换一批（种子 {seed}）
        </button>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
