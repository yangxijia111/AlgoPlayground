/**
 * 搜索输入编辑器：数组 + 目标值；二分模式提供"一键排序"。
 */
import { useState } from 'react';
import { parseIntArray, isSortedAsc } from '../../core/validation';
import type { SearchInput } from '../../core/registry';

export function SearchInputEditor({ value, onCommit }: { value: SearchInput; onCommit: (v: SearchInput) => void }) {
  const [text, setText] = useState(value.array.join(', '));
  const [targetText, setTargetText] = useState(String(value.target));
  const [error, setError] = useState<string | null>(null);

  const parseArray = () => {
    const r = parseIntArray(text, { minLen: 1, maxLen: 60, minVal: -99, maxVal: 999 });
    if (!r.ok) {
      setError(r.error);
      return null;
    }
    return r.values;
  };

  const apply = (values: number[], target: number) => {
    const next: SearchInput = { type: 'search', variant: value.variant, array: values, target };
    // 借用注册表校验输出二分无序等错误
    const err = validateSearch(next);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onCommit(next);
  };

  const validateSearch = (input: SearchInput): string | null => {
    if (!Number.isInteger(input.target)) return '目标值必须是整数';
    if (input.target < -999 || input.target > 999) return '目标值超出取值范围 -999–999';
    if (input.variant === 'binary' && !isSortedAsc(input.array)) {
      return '二分查找要求数组已按升序排列';
    }
    return null;
  };

  const onApply = () => {
    const values = parseArray();
    if (values === null) return;
    const target = Number(targetText.trim());
    apply(values, target);
  };

  const onSortAndApply = () => {
    const values = parseArray();
    if (values === null) return;
    const sorted = [...values].sort((a, b) => a - b);
    setText(sorted.join(', '));
    const target = Number(targetText.trim());
    apply(sorted, target);
  };

  const unsorted = value.variant === 'binary' && (() => {
    const r = parseIntArray(text, { minLen: 1, maxLen: 60, minVal: -99, maxVal: 999 });
    return r.ok && !isSortedAsc(r.values);
  })();

  return (
    <div className="input-editor">
      <div className="editor-row">
        <label className="field field--grow">
          <span className="field-label">查找数组（逗号分隔，-99–999，最多 60 个）</span>
          <input
            type="text"
            value={text}
            aria-label="查找数组"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApply();
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">目标值</span>
          <input
            type="text"
            value={targetText}
            aria-label="目标值"
            style={{ width: 90 }}
            onChange={(e) => setTargetText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApply();
            }}
          />
        </label>
        <button type="button" className="btn" onClick={onApply}>
          开始查找
        </button>
        {unsorted ? (
          <button type="button" className="btn" onClick={onSortAndApply} title="先按升序排序再查找">
            一键排序
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
