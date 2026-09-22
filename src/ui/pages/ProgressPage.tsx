/**
 * Progress 页（/progress）：学习统计、分类掌握、算法明细、最近学习、收藏区、数据管理。
 * 聚合计算在 core/progress（纯函数），渲染用 useMemo 派生，不逐帧重算。
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLearningProfile } from '../hooks/useLearningProfile';
import { MASTERY_LABELS } from '../../core/progress/mastery';
import type { MasteryLevel } from '../../core/progress/mastery';
import {
  bookmarkLabel,
  categoryRows,
  progressRows,
  progressSummary,
  recentlyViewed,
} from '../../core/progress/summary';
import { getAlgorithm } from '../../core/registry';
import { DataCard } from '../components/DataCard';

const LEVEL_CLASS: Record<MasteryLevel, string> = {
  'not-started': 'lvl-not-started',
  learning: 'lvl-learning',
  practicing: 'lvl-practicing',
  almost: 'lvl-almost',
  mastered: 'lvl-mastered',
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function ProgressPage() {
  const profile = useLearningProfile();
  const summary = useMemo(() => progressSummary(profile), [profile]);
  const rows = useMemo(() => progressRows(profile), [profile]);
  const cats = useMemo(() => categoryRows(profile), [profile]);
  const recent = useMemo(() => recentlyViewed(profile), [profile]);
  const bookmarks = profile.bookmarks;

  const studiedRows = useMemo(
    () =>
      rows
        .filter((r) => r.mastery.level !== 'not-started')
        .sort((a, b) => ((a.lastViewedAt ?? '') < (b.lastViewedAt ?? '') ? 1 : -1)),
    [rows],
  );

  return (
    <div className="progress-page">
      <header className="learn-head">
        <h1>学习进度</h1>
        <p>全部数据保存在本地浏览器，不上传任何内容。</p>
      </header>

      <section className="progress-stats" aria-label="学习统计">
        <div className="card stat-card">
          <span className="stat-num">{summary.learningDays}</span>
          <span className="stat-label">学习天数</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num">{summary.totalPractice}</span>
          <span className="stat-label">总练习次数</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num">{summary.studiedCount}</span>
          <span className="stat-label">已学算法</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num">{summary.masteredCount}</span>
          <span className="stat-label">已掌握</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num">{summary.bookmarks}</span>
          <span className="stat-label">收藏</span>
        </div>
      </section>

      <section className="card progress-section" aria-label="分类掌握">
        <h2>分类掌握</h2>
        <ul className="category-bars">
          {cats.map((c) => (
            <li key={c.id}>
              <span className="category-bar-name">{c.name}</span>
              <div
                className="learn-progress-track"
                role="progressbar"
                aria-label={`${c.name} 平均掌握度 ${c.avgScore}%`}
                aria-valuenow={c.avgScore}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="learn-progress-fill" style={{ width: `${c.avgScore}%` }} />
              </div>
              <span className="category-bar-meta">
                {c.avgScore} 分 · 掌握 {c.mastered}/{c.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card progress-section" aria-label="最近学习">
        <h2>最近学习</h2>
        {recent.length === 0 ? (
          <p className="progress-empty">还没有学习记录——从 <Link to="/learn">学习路线</Link> 开始吧。</p>
        ) : (
          <ul className="recent-list">
            {recent.map((r) => (
              <li key={r.id}>
                {r.id.startsWith('concept:') ? (
                  <Link to={`/learn/concept/${r.id.slice('concept:'.length)}`}>{r.name}</Link>
                ) : (
                  <AlgorithmLink id={r.id} fallback={r.name} />
                )}
                <span className="recent-time">{new Date(r.at).toLocaleString('zh-CN')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card progress-section" aria-label="算法明细">
        <h2>算法明细</h2>
        {studiedRows.length === 0 ? (
          <p className="progress-empty">尚无算法学习记录。</p>
        ) : (
          <div className="progress-table-wrap">
            <table className="progress-table">
              <thead>
                <tr>
                  <th>算法</th>
                  <th>掌握度</th>
                  <th>Quiz 正确率</th>
                  <th>Predict 正确率</th>
                  <th>挑战</th>
                </tr>
              </thead>
              <tbody>
                {studiedRows.map((r) => (
                  <tr key={r.algorithmId}>
                    <td>
                      <AlgorithmLink id={r.algorithmId} fallback={r.name} />
                    </td>
                    <td>
                      <span className={`mastery-badge ${LEVEL_CLASS[r.mastery.level]}`}>
                        {MASTERY_LABELS[r.mastery.level]} {r.mastery.score}
                      </span>
                    </td>
                    <td>{r.mastery.signals.quizAccuracy === null ? '—' : pct(r.mastery.signals.quizAccuracy)}</td>
                    <td>{r.mastery.signals.predictAccuracy === null ? '—' : pct(r.mastery.signals.predictAccuracy)}</td>
                    <td>{r.mastery.signals.challengeCompleted ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DataCard />

      <section className="card progress-section" aria-label="我的收藏">
        <h2>我的收藏</h2>
        {bookmarks.length === 0 ? (
          <p className="progress-empty">还没有收藏。在算法页点击 ☆ 即可收藏。</p>
        ) : (
          <ul className="bookmark-list">
            {bookmarks.map((b) => (
              <li key={b.targetId}>
                {b.targetId.startsWith('concept:') ? (
                  <Link to={`/learn/concept/${b.targetId.slice('concept:'.length)}`}>{bookmarkLabel(b.targetId)}</Link>
                ) : (
                  <AlgorithmLink id={b.targetId} fallback={bookmarkLabel(b.targetId)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AlgorithmLink({ id, fallback }: { id: string; fallback: string }) {
  const entry = getAlgorithm(id);
  if (!entry) return <span>{fallback}</span>;
  return <Link to={`/${entry.meta.category}/${entry.meta.id}`}>{entry.meta.name}</Link>;
}
