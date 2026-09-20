/**
 * 全局键盘快捷键：空格=播放/暂停，←/→=上一步/下一步，R=重播。
 * 焦点在输入控件上时不拦截。
 */
import { useEffect } from 'react';
import type { PlaybackEngine } from '../../core/player/engine';

export function useKeyboardShortcuts(engine: PlaybackEngine): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          engine.toggle();
          break;
        case 'ArrowRight':
          e.preventDefault();
          engine.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          engine.prev();
          break;
        case 'r':
        case 'R':
          engine.restart();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);
}
