/**
 * 概念课页（/learn/concept/:id）：渲染结构化课程内容 + 关联算法入口。
 * 访问即记录进度（concept:<id> 键，viewCount ≥ 1 视为完成）。
 */
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getConcept } from '../../core/learning/concepts';
import { conceptProgressKey } from '../../core/learning/path';
import { getAlgorithm } from '../../core/registry';
import { getLearningStore } from '../../core/storage/store';

export default function ConceptPage() {
  const { conceptId } = useParams();
  const concept = conceptId ? getConcept(conceptId) : undefined;

  const store = getLearningStore();
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!concept) return;
    const key = conceptProgressKey(concept.id);
    if (viewedRef.current === key) return;
    viewedRef.current = key;
    store.recordAlgorithmView(key);
  }, [concept, store]);

  if (!concept) {
    return (
      <div className="page-missing">
        <h2>未找到该课程</h2>
        <p>
          请从 <Link to="/learn">学习路线</Link> 选择一节课程。
        </p>
      </div>
    );
  }

  return (
    <article className="concept-page" aria-label={concept.title}>
      <header className="concept-head">
        <p className="concept-crumb">
          <Link to="/learn">学习路线</Link>
          <span aria-hidden="true"> / </span>
          <span>{concept.title}</span>
        </p>
        <h1>
          {concept.title}
          <span className="concept-en">{concept.enTitle}</span>
        </h1>
        <p className="concept-summary">{concept.summary}</p>
      </header>

      {concept.sections.map((s, i) => (
        <section key={i} className="card concept-section-card">
          <h2>{s.heading}</h2>
          {s.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
          {s.bullets ? (
            <ul>
              {s.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <section className="card concept-related">
        <h2>动手试试</h2>
        <ul className="concept-related-list">
          {concept.relatedAlgorithms.map((algoId) => {
            const entry = getAlgorithm(algoId);
            if (!entry) return null;
            return (
              <li key={algoId}>
                <Link to={`/${entry.meta.category}/${entry.meta.id}`}>
                  {entry.meta.name}
                  <span className="lesson-en">{entry.meta.enName}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}
