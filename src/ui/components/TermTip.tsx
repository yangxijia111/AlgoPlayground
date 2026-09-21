/**
 * 术语内联引用（TermTip）：点击弹出术语解释浮层，不离开当前页面。
 * Esc / 再次点击 / 点击浮层外关闭；可键盘操作（Enter 触发、Esc 关闭）。
 */
import { useEffect, useId, useRef, useState } from 'react';
import { getTerm } from '../../core/learning/glossary';

export function TermTip({ termId, children }: { termId: string; children?: React.ReactNode }) {
  const term = getTerm(termId);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (!term) return <>{children ?? termId}</>;

  return (
    <span className="term-wrap" ref={wrapRef}>
      <button
        type="button"
        className="term-ref"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={btnId}
        onClick={() => setOpen((v) => !v)}
      >
        {children ?? term.term}
      </button>
      {open ? (
        <span className="term-pop" role="dialog" aria-label={`术语解释：${term.term}`}>
          <strong className="term-pop-title">
            {term.term}
            <span className="term-pop-en">{term.en}</span>
          </strong>
          <span className="term-pop-def">{term.definition}</span>
          {term.example ? <span className="term-pop-example">例：{term.example}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
