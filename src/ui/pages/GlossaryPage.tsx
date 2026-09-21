/**
 * 术语表页（/glossary）：全部术语索引，卡片式展示。
 */
import { GLOSSARY_TERMS } from '../../core/learning/glossary';
import { getAlgorithm } from '../../core/registry';
import { Link } from 'react-router-dom';

export default function GlossaryPage() {
  return (
    <div className="glossary-page">
      <header className="learn-head">
        <h1>术语表</h1>
        <p>{GLOSSARY_TERMS.length} 个核心术语。概念课中的虚线词可直接点击查看解释。</p>
      </header>
      <div className="glossary-grid">
        {GLOSSARY_TERMS.map((t) => (
          <section key={t.id} className="card glossary-card" aria-label={t.term}>
            <h2>
              {t.term}
              <span className="term-pop-en">{t.en}</span>
            </h2>
            <p>{t.definition}</p>
            {t.example ? <p className="glossary-example">例：{t.example}</p> : null}
            {t.related && t.related.length > 0 ? (
              <p className="glossary-related">
                相关算法：
                {t.related.map((algoId) => {
                  const entry = getAlgorithm(algoId);
                  return entry ? (
                    <Link key={algoId} to={`/${entry.meta.category}/${entry.meta.id}`}>
                      {entry.meta.name}
                    </Link>
                  ) : null;
                })}
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
