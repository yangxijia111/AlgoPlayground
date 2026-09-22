/**
 * 树渲染器：SVG 圆形节点 + 边，下方显示遍历输出序列。
 * 坐标来自帧内 [0,1] 相对布局，渲染时缩放到 viewBox。
 */
import type { TreeFrame } from '../../../core/step/frame';

const VIEW_W = 1000;
const VIEW_H = 440;
const PAD = 40;
const R = 22;

export function TreeView({ frame, onSelectNode }: { frame: TreeFrame; onSelectNode?: (id: number) => void }) {
  const px = (x: number) => PAD + x * (VIEW_W - 2 * PAD);
  const py = (y: number) => PAD + y * (VIEW_H - 2 * PAD);
  const posById = new Map(frame.nodes.map((n) => [n.id, { x: px(n.x), y: py(n.y) }]));

  if (frame.nodes.length === 0) {
    return (
      <div className="tree-view">
        <div className="structure-caption">{frame.message}</div>
        <div className="viz-empty">树为空</div>
      </div>
    );
  }

  return (
    <div className="tree-view">
      <div className="structure-caption">{frame.message}</div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="tree-svg"
        role="img"
        aria-label={`树可视化，共 ${frame.nodes.length} 个节点`}
        preserveAspectRatio="xMidYMid meet"
      >
        {frame.edges.map((e) => {
          const a = posById.get(e.from);
          const b = posById.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.from}-${e.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`viz-edge viz-edge--${e.state}`}
            />
          );
        })}
        {frame.nodes.map((n) => {
          const p = posById.get(n.id);
          if (!p) return null;
          return (
            <g
              key={n.id}
              className={onSelectNode ? 'viz-node-clickable' : undefined}
              onClick={onSelectNode ? () => onSelectNode(n.id) : undefined}
            >
              <circle cx={p.x} cy={p.y} r={R} className={`viz-el viz-el--${n.state}`} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" className="tree-node-text">
                {n.value}
              </text>
            </g>
          );
        })}
      </svg>
      {frame.output.length > 0 ? (
        <div className="tree-output">
          <span className="field-label">输出序列：</span>
          {frame.output.map((v, i) => (
            <span key={`${v}-${i}`} className="viz-chip">
              {v}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
