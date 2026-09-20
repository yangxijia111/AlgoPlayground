/**
 * P5 输入编辑器：递归 n（按类型限幅）、N 皇后 n（4–8）、DP（斐波那契 n / 背包物品与容量）。
 */
import { useState } from 'react';
import type { DPInput, NQueensInput, RecursionInput } from '../../core/registry';

export function RecursionInputEditor({ value, onCommit }: { value: RecursionInput; onCommit: (v: RecursionInput) => void }) {
  const [n, setN] = useState(value.n);
  const limit = value.kind === 'hanoi' ? { min: 1, max: 8 } : { min: 1, max: 12 };
  const name = value.kind === 'factorial' ? '阶乘 n' : value.kind === 'fibonacci' ? '斐波那契 n' : '盘数 n';

  return (
    <div className="input-editor">
      <div className="editor-row">
        <label className="field field--grow">
          <span className="field-label">
            {name}：{n}（{limit.min}–{limit.max}）
          </span>
          <input
            type="range"
            min={limit.min}
            max={limit.max}
            value={n}
            aria-label={name}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onCommit({ type: 'recursion', kind: value.kind, n })}
        >
          运行
        </button>
      </div>
    </div>
  );
}

export function NQueensInputEditor({ value, onCommit }: { value: NQueensInput; onCommit: (v: NQueensInput) => void }) {
  const [n, setN] = useState(value.n);
  return (
    <div className="input-editor">
      <div className="editor-row">
        <label className="field">
          <span className="field-label">棋盘规模 n</span>
          <select value={n} aria-label="棋盘规模" onChange={(e) => setN(Number(e.target.value))}>
            {[4, 5, 6, 7, 8].map((v) => (
              <option key={v} value={v}>
                {v} × {v}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => onCommit({ type: 'nqueens', n })}>
          运行
        </button>
        <span className="field-label">解数参考：4→2，5→10，6→4，7→40，8→92</span>
      </div>
    </div>
  );
}

export function DPInputEditor({ value, onCommit }: { value: DPInput; onCommit: (v: DPInput) => void }) {
  if (value.kind === 'fibonacci') {
    return <FibDPInput value={value} onCommit={onCommit} />;
  }
  return <KnapsackInput value={value} onCommit={onCommit} />;
}

function FibDPInput({ value, onCommit }: { value: Extract<DPInput, { kind: 'fibonacci' }>; onCommit: (v: DPInput) => void }) {
  const [n, setN] = useState(value.n);
  return (
    <div className="input-editor">
      <div className="editor-row">
        <label className="field field--grow">
          <span className="field-label">n：{n}（3–12）</span>
          <input type="range" min={3} max={12} value={n} aria-label="斐波那契 n" onChange={(e) => setN(Number(e.target.value))} />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => onCommit({ type: 'dp', kind: 'fibonacci', n })}>
          运行
        </button>
      </div>
    </div>
  );
}

function KnapsackInput({ value, onCommit }: { value: Extract<DPInput, { kind: 'knapsack' }>; onCommit: (v: DPInput) => void }) {
  const [items, setItems] = useState(value.items);
  const [capacity, setCapacity] = useState(value.capacity);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<(typeof items)[number]>) => {
    setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  };

  const run = () => {
    for (const it of items) {
      const w = Number(it.weight);
      const v = Number(it.value);
      if (!Number.isInteger(w) || w < 1 || w > 99) {
        setError(`${it.name || '物品'} 的重量必须是 1–99 的整数`);
        return;
      }
      if (!Number.isInteger(v) || v < 1 || v > 99) {
        setError(`${it.name || '物品'} 的价值必须是 1–99 的整数`);
        return;
      }
      if (it.name.trim() === '' || it.name.length > 6) {
        setError('物品名称需非空且不超过 6 个字符');
        return;
      }
    }
    setError(null);
    onCommit({
      type: 'dp',
      kind: 'knapsack',
      capacity,
      items: items.map((it) => ({ name: it.name.trim(), weight: Number(it.weight), value: Number(it.value) })),
    });
  };

  return (
    <div className="input-editor">
      <div className="editor-row editor-row--inline">
        <span className="field-label">物品（重量 / 价值）：</span>
      </div>
      {items.map((it, i) => (
        <div key={i} className="editor-row editor-row--inline knapsack-item">
          <input
            type="text"
            value={it.name}
            style={{ width: 90 }}
            aria-label={`物品 ${i + 1} 名称`}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <input
            type="text"
            value={String(it.weight)}
            style={{ width: 64 }}
            aria-label={`物品 ${i + 1} 重量`}
            onChange={(e) => update(i, { weight: Number(e.target.value) })}
          />
          <input
            type="text"
            value={String(it.value)}
            style={{ width: 64 }}
            aria-label={`物品 ${i + 1} 价值`}
            onChange={(e) => update(i, { value: Number(e.target.value) })}
          />
          {items.length > 1 ? (
            <button type="button" className="btn btn-ghost" aria-label={`删除物品 ${i + 1}`} onClick={() => setItems(items.filter((_, k) => k !== i))}>
              ✕
            </button>
          ) : null}
        </div>
      ))}
      <div className="editor-row">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={items.length >= 8}
          onClick={() => setItems([...items, { name: `物品${String.fromCharCode(65 + items.length)}`, weight: 2, value: 3 }])}
        >
          ＋ 添加物品（≤8）
        </button>
        <label className="field field--grow">
          <span className="field-label">背包容量：{capacity}（1–20）</span>
          <input type="range" min={1} max={20} value={capacity} aria-label="背包容量" onChange={(e) => setCapacity(Number(e.target.value))} />
        </label>
        <button type="button" className="btn btn-primary" onClick={run}>
          运行
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
