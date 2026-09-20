/**
 * 帧渲染分发器：按 frame.kind 选择对应可视化组件。
 * 每个阶段扩展新帧类型的 case。
 */
import type { Frame } from '../../../core/step/frame';
import { ArrayBars } from './ArrayBars';

export function FrameView({ frame }: { frame: Frame }) {
  switch (frame.kind) {
    case 'array':
      return <ArrayBars frame={frame} />;
    default:
      return <div className="viz-empty">该类型渲染器将在后续阶段提供（{frame.kind}）</div>;
  }
}
