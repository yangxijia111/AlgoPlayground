/**
 * Complexity Explorer（/complexity）：六类复杂度增长曲线（SVG 折线）+ n 调节 +
 * 操作数表 + 关联算法（区分最好/平均/最坏，避免把复杂度说绝对）。
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { COMPLEXITY_KINDS, ALGO_COMPLEXITY, sampleCurves, opTable } from '../../core/learning/complexity';
import { getAlgorithm } from '../../core/registry';

const COLORS: Record<string, string> = {
  const: '#3ecf8e',
  log: '#2fa8c9',
  linear: '#4f8cff',
  nlogn: '#b57bee',
  quad: '#f2c744',
  exp: '#ef5b5b',
};

export default function ComplexityPage() {
  const [maxN, setMaxN] = useState(64);
  const curves = useMemo(() => sampleCurves(maxN, 60), [maxN]);
  const table = useMemo(() => opTable(maxN), [maxN]);

  // log-y 归一化（指数曲线在对数轴上是直线，其余曲线也能同屏比较）
  const yOf = (v: number) => Math.log2(Math.max(1, v));
  const maxY = yOf(Math.max(2, COMPLEXITY_KINDS.find((k) => k.id === 'exp')!.fn(maxN)));
  const W = 900;
  const H = 380;
  const PADL = 46;
  const PADB = 30;

  return (
    <div className="complexity-page">
      <header className="learn-head">
        <h1>复杂度探索器</h1>
        <p>六类常见增长趋势。纵轴为对数刻度——同屏比较「步数随 n 的增长速度」。注意区分最好 / 平均 / 最坏情况。</p>
      </header>

      <section className="card complexity-chart-card" aria-label="增长曲线">
        <div className="complexity-controls">
          <label className="field">
            <span className="field-label">最大规模 n = {maxN}</span>
            <input
              type="range"
              min={8}
              max={256}
              step={8}
              value={maxN}
              aria-label="调整最大规模 n"
              onChange={(e) => setMaxN(Number(e.target.value))}
            />
          </label>
          <div className="complexity-legend">
            {COMPLEXITY_KINDS.map((k) => (
              <span key={k.id} className="complexity-legend-item">
                <span className="complexity-swatch" style={{ background: COLORS[k.id] }} />
                {k.label} — {k.blurb}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="complexity-svg" role="img" aria-label="六类复杂度增长曲线（对数纵轴）">
          {/* 横网格线（2 的幂） */}
          {[0, 2, 4, 6, 8, 10, 12].map((e) => {
            const y = H - PADB - (e / maxY) * (H - PADB - 16);
            if (y < 10) return null;
            return (
              <g key={e}>
                <line x1={PADL} y1={y} x2={W - 10} y2={y} className="complexity-grid" />
                <text x={PADL - 6} y={y + 4} textAnchor="end" className="complexity-axis-text">
                  2^{e}
                </text>
              </g>
            );
          })}
          {COMPLEXITY_KINDS.map((k) => (
            <polyline
              key={k.id}
              fill="none"
              stroke={COLORS[k.id]}
              strokeWidth={2.5}
              points={curves
                .map((c) => {
                  const x = PADL + (c.n / maxN) * (W - PADL - 16);
                  const y = H - PADB - (yOf(c.values[k.id]!) / maxY) * (H - PADB - 16);
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          ))}
          <text x={W - 10} y={H - 8} textAnchor="end" className="complexity-axis-text">
            n →（0 到 {maxN}）
          </text>
        </svg>
      </section>

      <section className="card progress-section" aria-label="操作数对照表">
        <h2>不同 n 下的近似操作数</h2>
        <div className="progress-table-wrap">
          <table className="progress-table">
            <thead>
              <tr>
                <th>n</th>
                {COMPLEXITY_KINDS.map((k) => (
                  <th key={k.id}>{k.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.n}>
                  <td>{row.n}</td>
                  {COMPLEXITY_KINDS.map((k) => (
                    <td key={k.id}>{row.ops[k.id]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card progress-section" aria-label="关联算法复杂度">
        <h2>平台中的算法复杂度（最好 / 平均 / 最坏）</h2>
        <div className="progress-table-wrap">
          <table className="progress-table">
            <thead>
              <tr>
                <th>算法</th>
                <th>最好</th>
                <th>平均</th>
                <th>最坏</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {ALGO_COMPLEXITY.map((ref) => {
                const entry = getAlgorithm(ref.algorithmId);
                return (
                  <tr key={ref.algorithmId}>
                    <td>{entry ? <Link to={`/${entry.meta.category}/${entry.meta.id}`}>{entry.meta.name}</Link> : ref.algorithmId}</td>
                    <td>{ref.best}</td>
                    <td>{ref.average}</td>
                    <td>{ref.worst}</td>
                    <td className="complexity-note">{ref.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
