/**
 * 教学面板（右栏）：算法信息、伪代码（当前行高亮）、当前步骤解释、统计与变量状态。
 */
import type { ReactNode } from 'react';
import type { AlgorithmMeta } from '../../core/registry';
import type { VizStep } from '../../core/step/step';

/** 计数器键的中文显示名 */
export const COUNTER_LABELS: Record<string, string> = {
  comparisons: '比较次数',
  swaps: '交换次数',
  writes: '写入次数',
  visits: '访问次数',
  recursions: '递归调用',
  backtracks: '回退次数',
  solutions: '已找到解',
  inserts: '插入次数',
  removes: '删除次数',
  fills: '填充格数',
};

export function TeachingPanel({
  meta,
  step,
  stateSlot,
}: {
  meta: AlgorithmMeta;
  step?: VizStep;
  stateSlot?: ReactNode;
}) {
  const highlight = new Set(step?.pseudocodeLines ?? []);

  return (
    <div className="teaching-panel">
      <section className="panel-card">
        <h2 className="panel-title">
          {meta.name}
          <span className="panel-sub">{meta.enName}</span>
        </h2>
        <dl className="meta-list">
          <div>
            <dt>用途</dt>
            <dd>{meta.purpose}</dd>
          </div>
          <div>
            <dt>核心思想</dt>
            <dd>{meta.coreIdea}</dd>
          </div>
          <div className="meta-row">
            <div>
              <dt>时间复杂度</dt>
              <dd>
                <code>{meta.timeComplexity}</code>
              </dd>
            </div>
            <div>
              <dt>空间复杂度</dt>
              <dd>
                <code>{meta.spaceComplexity}</code>
              </dd>
            </div>
          </div>
          {meta.stability ? (
            <div>
              <dt>稳定性</dt>
              <dd>{meta.stability}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="panel-card">
        <h3 className="panel-subtitle">伪代码</h3>
        <ol className="pseudocode" aria-label="伪代码（当前执行行高亮）">
          {meta.pseudocode.map((line, i) => (
            <li key={i} className={highlight.has(i) ? 'is-active' : ''}>
              <code>{line}</code>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel-card step-card" aria-live="polite">
        <h3 className="panel-subtitle">当前步骤</h3>
        <p className="step-description">{step ? step.description : '暂无步骤'}</p>
      </section>

      {stateSlot ? (
        <section className="panel-card">
          <h3 className="panel-subtitle">变量与状态</h3>
          {stateSlot}
        </section>
      ) : null}

      {step && Object.keys(step.counters).length > 0 ? (
        <section className="panel-card">
          <h3 className="panel-subtitle">统计</h3>
          <ul className="counter-list">
            {Object.entries(step.counters).map(([k, v]) => (
              <li key={k}>
                <span>{COUNTER_LABELS[k] ?? k}</span>
                <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
