/**
 * 帧渲染分发器：按 frame.kind 选择对应可视化组件。
 * 每个阶段扩展新帧类型的 case。
 */
import type { Frame } from '../../../core/step/frame';
import { ArrayBars } from './ArrayBars';
import { StructureView } from './StructureView';
import { TreeView } from './TreeView';
import { GraphView } from './GraphView';
import { RecursionView } from './RecursionView';
import { NQueensBoard } from './NQueensBoard';
import { DPTable } from './DPTable';

export function FrameView({ frame }: { frame: Frame }) {
  switch (frame.kind) {
    case 'array':
      return <ArrayBars frame={frame} />;
    case 'structure':
      return <StructureView frame={frame} />;
    case 'tree':
      return <TreeView frame={frame} />;
    case 'graph':
      return <GraphView frame={frame} />;
    case 'recursion':
      return <RecursionView frame={frame} />;
    case 'nqueens':
      return <NQueensBoard frame={frame} />;
    case 'dp':
      return <DPTable frame={frame} />;
    default:
      return <div className="viz-empty">暂不支持的可视化类型</div>;
  }
}
