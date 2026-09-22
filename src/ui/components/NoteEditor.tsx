/**
 * 学习笔记：普通 textarea，防抖自动保存（800ms），卸载/页面隐藏时立即保存。
 * 简单稳定，不做富文本。
 */
import { useEffect, useRef, useState } from 'react';
import { getLearningStore } from '../../core/storage/store';
import { useLearningProfile } from '../hooks/useLearningProfile';

const DEBOUNCE_MS = 800;

export function NoteEditor({ algorithmId }: { algorithmId: string }) {
  const store = getLearningStore();
  const profile = useLearningProfile();
  const saved = profile.notes[algorithmId]?.content ?? '';
  const [text, setText] = useState(saved);
  const [status, setStatus] = useState<'idle' | 'dirty' | 'saved'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  textRef.current = text;

  // 切换算法时同步内容
  useEffect(() => {
    setText(profile.notes[algorithmId]?.content ?? '');
    setStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmId]);

  const flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (textRef.current !== (profile.notes[algorithmId]?.content ?? '')) {
      store.saveNote(algorithmId, textRef.current);
    }
    if (textRef.current !== saved) setStatus('saved');
  };

  useEffect(() => {
    const onHide = () => flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      flush(); // 卸载时立即保存
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmId]);

  const onChange = (v: string) => {
    setText(v);
    setStatus('dirty');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      store.saveNote(algorithmId, v);
      setStatus('saved');
    }, DEBOUNCE_MS);
  };

  return (
    <section className="panel-card note-card" aria-label="学习笔记">
      <div className="note-head">
        <h3 className="panel-subtitle">✏️ 学习笔记</h3>
        <span className="note-status" role="status">
          {status === 'dirty' ? '编辑中…' : status === 'saved' ? '已保存 ✓' : ''}
        </span>
      </div>
      <textarea
        className="note-textarea"
        aria-label="学习笔记内容"
        placeholder="记下你的理解，例如：快排 pivot 放到最后、BFS 用队列…"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    </section>
  );
}
