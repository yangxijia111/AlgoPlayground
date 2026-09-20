/**
 * 排序比较模式：同一组数据上最多 3 种排序算法同步播放，
 * 单一时间轴驱动（engine 的 total = 各算法步数最大值，短者在末尾保持终态）。
 */
import { useCallback, useMemo, useState } from 'react';
import { allAlgorithms } from '../../core/registry';
import type { AlgorithmEntry, SortInput } from '../../core/registry';
import { collectSteps } from '../../core/step/step';
import type { VizStep } from '../../core/step/step';
import { PlayerBar } from '../components/PlayerBar';
import { ArrayBars } from '../components/frames/ArrayBars';
import { SortInputEditor } from '../editors/SortInputEditor';
import { usePlayback } from '../hooks/usePlayback';

interface Run {
  entry: AlgorithmEntry;
  steps: VizStep[];
}

/** 取第 i 步的帧；越界时保持最后一帧（短算法终态） */
function frameAt(steps: VizStep[], i: number) {
  return steps[Math.min(i, steps.length - 1)];
}

export default function ComparePage() {
  const sortEntries = useMemo(() => allAlgorithms().filter((e) => e.compareGroup === 'sorting'), []);
  const [array, setArray] = useState<number[]>([10, 3, 7, 1, 8, 2, 9, 4, 6, 5]);
  const [selected, setSelected] = useState<string[]>(['bubble-sort', 'selection-sort', 'quick-sort']);

  const runs: Run[] = useMemo(
    () =>
      selected
        .map((id) => sortEntries.find((e) => e.meta.id === id))
        .filter((e): e is AlgorithmEntry => Boolean(e))
        .map((entry) => ({ entry, steps: collectSteps(entry.run({ type: 'sort', array })) })),
    [array, selected, sortEntries],
  );

  const maxSteps = runs.reduce((m, r) => Math.max(m, r.steps.length), 0);
  const { engine, snapshot } = usePlayback(maxSteps);

  const commitArray = useCallback((input: SortInput) => {
    setArray(input.array);
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // 最多 3 个
      return [...prev, id];
    });
  };

  const step = frameAt(runs[0]?.steps ?? [], snapshot.index);

  return (
    <div className="algo-page">
      <div className="algo-center">
        <section className="card editor-card" aria-label="比较模式设置">
          <div className="card-head">
            <h1 className="card-title">排序比较模式</h1>
            <span className="card-sub">Compare Mode</span>
          </div>
          <SortInputEditor value={{ type: 'sort', array }} onCommit={commitArray} />
          <div className="editor-row" role="group" aria-label="选择比较的算法（最多 3 个）">
            <span className="field-label">算法（最多 3 个）：</span>
            {sortEntries.map((e) => (
              <button
                key={e.meta.id}
                type="button"
                className={`btn btn-speed${selected.includes(e.meta.id) ? ' is-active' : ''}`}
                aria-pressed={selected.includes(e.meta.id)}
                onClick={() => toggleSelect(e.meta.id)}
              >
                {e.meta.name}
              </button>
            ))}
          </div>
        </section>

        <section className="card viz-card" aria-label="同步可视化">
          {runs.length === 0 ? (
            <div className="viz-empty">请至少选择一个算法</div>
          ) : (
            runs.map((r, idx) => {
              const f = frameAt(r.steps, snapshot.index).frame;
              const desc = frameAt(r.steps, snapshot.index).description;
              return (
                <div key={r.entry.meta.id} className="compare-run">
                  <div className="compare-run-head">
                    <span className="compare-run-name">
                      {String.fromCharCode(65 + idx)} · {r.entry.meta.name}
                    </span>
                    <span className="compare-run-desc">{desc}</span>
                  </div>
                  {f.kind === 'array' ? <ArrayBars frame={f} /> : null}
                </div>
              );
            })
          )}
        </section>

        {runs.length > 0 && step ? <PlayerBar snapshot={snapshot} engine={engine} /> : null}
      </div>

      <aside className="algo-right" aria-label="统计对比">
        <section className="panel-card">
          <h3 className="panel-subtitle">统计对比</h3>
          <table className="compare-table" aria-label="算法统计对比">
            <thead>
              <tr>
                <th>算法</th>
                <th>Steps</th>
                <th>比较</th>
                <th>交换</th>
                <th>时间复杂度</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const last = r.steps[r.steps.length - 1].counters;
                return (
                  <tr key={r.entry.meta.id}>
                    <td>{r.entry.meta.name}</td>
                    <td>{r.steps.length}</td>
                    <td>{last.comparisons ?? '—'}</td>
                    <td>{last.swaps ?? '—'}</td>
                    <td>
                      <code>{r.entry.meta.timeComplexity}</code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="editor-hint">
            三视图共用同一条时间轴；步数较少的算法在结束时保持最终有序状态。数组共 {array.length} 个元素。
          </p>
        </section>

        <section className="panel-card">
          <h3 className="panel-subtitle">稳定性对照</h3>
          <ul className="state-list">
            {runs.map((r) => (
              <li key={r.entry.meta.id}>
                <span className="state-key">{r.entry.meta.name}</span>
                <code className="state-val">{r.entry.meta.stability ?? '—'}</code>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
