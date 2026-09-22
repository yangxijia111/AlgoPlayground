/**
 * 学习笔记：普通 textarea，防抖自动保存（800ms），卸载/页面隐藏时立即保存。
 * P11：「已保存 ✓」仅在真正持久化到 localStorage 时显示；
 * 写失败/内存模式显示真实状态（不再因 store.saveNote 返回就假装已保存）。
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getLearningStore } from '../../core/storage/store';
import { useLearningProfile } from '../hooks/useLearningProfile';

const DEBOUNCE_MS = 800;

export function NoteEditor({ algorithmId }: { algorithmId: string }) {
  const store = getLearningStore();
  const profile = useLearningProfile();
  const persistence = useSyncExternalStore(store.subscribeStatus, store.getPersistenceStatus);
  const saved = profile.notes[algorithmId]?.content ?? '';
  const [text, setText] = useState(saved);
  const [status, setStatus] = useState<'idle' | 'dirty' | 'saved' | 'failed' | 'memory'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  textRef.current = text;

  // 切换算法时同步内容
  useEffect(() => {
    setText(profile.notes[algorithmId]?.content ?? '');
    setStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmId]);

  /** 由 store 的持久化健康状态推导展示状态（读实时值，防抖回调不依赖渲染闭包） */
  const applyPersistence = () => {
    const s = store.getPersistenceStatus();
    if (s === 'persistent') setStatus('saved');
    else if (s === 'memory-only') setStatus('memory');
    else setStatus('failed');
  };

  const flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (textRef.current !== (profile.notes[algorithmId]?.content ?? '')) {
      store.saveNote(algorithmId, textRef.current);
    }
    if (textRef.current !== saved) applyPersistence();
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
      applyPersistence();
    }, DEBOUNCE_MS);
  };

  const statusText =
    status === 'dirty'
      ? '编辑中…'
      : status === 'saved'
        ? '已保存 ✓'
        : status === 'failed'
          ? '保存失败：浏览器存储写入未成功'
          : status === 'memory'
            ? '仅内存保存（浏览器存储不可用）'
            : persistence === 'memory-only'
              ? '浏览器存储不可用，学习记录仅保存在内存中'
              : '';

  return (
    <section className="panel-card note-card" aria-label="学习笔记">
      <div className="note-head">
        <h3 className="panel-subtitle">✏️ 学习笔记</h3>
        <span className="note-status" role="status">
          {statusText}
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
