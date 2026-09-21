/**
 * 学习路线页（/learn）：13 章初学者路线，显示状态/完成度/推荐下一步；不强制解锁。
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LEARNING_SECTIONS,
  isLessonDone,
  lessonLink,
  lessonTitle,
  overallProgress,
  sectionProgress,
} from '../../core/learning/path';
import { useLearningProfile } from '../hooks/useLearningProfile';

/** 把 profile 的 progress 压缩成 id → viewCount 表 */
export function viewCountsOf(profile: { progress: Record<string, { viewCount: number }> }): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(profile.progress)) out[k] = v.viewCount;
  return out;
}

export function LearnPage() {
  const profile = useLearningProfile();
  const viewCounts = useMemo(() => viewCountsOf(profile), [profile]);
  const overall = useMemo(() => overallProgress(viewCounts), [viewCounts]);

  // 推荐下一步：全局第一个未完成小节
  let recommended: string | null = null;
  for (const section of LEARNING_SECTIONS) {
    const p = sectionProgress(section, viewCounts);
    if (p.nextLesson) {
      recommended = p.nextLesson.id;
      break;
    }
  }

  return (
    <div className="learn-page">
      <header className="learn-head">
        <h1>学习路线</h1>
        <p>
          为初学者编排的 13 章路线。不强制顺序，可自由跳转；
          {overall.total > 0 ? `当前已完成 ${overall.done}/${overall.total} 节。` : ''}
        </p>
      </header>

      {LEARNING_SECTIONS.map((section) => {
        const p = sectionProgress(section, viewCounts);
        const pct = p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
        return (
          <section key={section.id} className="card learn-section" aria-label={section.name}>
            <div className="learn-section-head">
              <div>
                <h2>{section.name}</h2>
                <p className="learn-blurb">{section.blurb}</p>
              </div>
              <div className="learn-section-progress" aria-label={`章节完成度 ${pct}%`}>
                <div
                  className="learn-progress-track"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="learn-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="learn-progress-text">
                  {p.done}/{p.total}
                </span>
              </div>
            </div>
            <ul className="learn-lessons">
              {section.lessons.map((lesson) => {
                const done = isLessonDone(lesson, viewCounts);
                const { title, en } = lessonTitle(lesson);
                const isNext = recommended === lesson.id;
                return (
                  <li key={lesson.id}>
                    <Link to={lessonLink(lesson)} className={`learn-lesson${done ? ' is-done' : ''}`}>
                      <span className={`lesson-dot${done ? ' is-done' : ''}`} aria-hidden="true" />
                      <span className="lesson-title">{title}</span>
                      <span className="lesson-en">{en}</span>
                      {isNext ? <span className="lesson-next">推荐下一步</span> : null}
                      {done ? <span className="lesson-done-mark">已完成</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default LearnPage;
