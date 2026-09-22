/**
 * 图渲染器：SVG 节点 + 边（支持有向箭头与权重标签）、距离徽标、前驱标注、frontier 面板。
 */
import type { GraphFrame } from '../../../core/step/frame';
import { formatDistance } from '../../../core/validation';

const VIEW_W = 1000;
const VIEW_H = 460;
const PAD = 46;
const R = 22;

const FRONTIER_LABELS: Record<string, string> = {
  queue: '队列',
  stack: '栈（右端为栈顶）',
  set: '未确定集（按距离升序）',
  none: '',
};

export function GraphView({ frame, onSelectNode }: { frame: GraphFrame; onSelectNode?: (id: string) => void }) {
  const px = (x: number) => PAD + x * (VIEW_W - 2 * PAD);
  const py = (y: number) => PAD + y * (VIEW_H - 2 * PAD);
  const posById = new Map(frame.nodes.map((n) => [n.id, { x: px(n.x), y: py(n.y) }]));

  const frontierText =
    frame.frontierKind === 'none' || frame.frontier.length === 0
      ? null
      : `${FRONTIER_LABELS[frame.frontierKind]}：${frame.frontier.map((f) => f.id).join(' · ')}`;

  return (
    <div className="graph-view">
      <div className="structure-caption">{frame.message}</div>
      {frontierText ? <div className="graph-frontier">{frontierText}</div> : null}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="graph-svg"
        role="img"
        aria-label={`图可视化，${frame.nodes.length} 个节点 ${frame.edges.length} 条边`}
        preserveAspectRatio="xMidYMid meet"
      >
        {frame.edges.map((e) => {
          const a = posById.get(e.from);
          const b = posById.get(e.to);
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          // 终点缩到节点圆边缘
          const ex = b.x - ux * (R + 3);
          const ey = b.y - uy * (R + 3);
          const midX = (a.x + ex) / 2;
          const midY = (a.y + ey) / 2;
          return (
            <g key={e.id}>
              <line x1={a.x} y1={a.y} x2={ex} y2={ey} className={`viz-edge viz-edge--${e.state}`} />
              {e.directed ? (
                <polygon
                  points={`${ex},${ey} ${ex - ux * 12 - uy * 5},${ey - uy * 12 + ux * 5} ${ex - ux * 12 + uy * 5},${ey - uy * 12 - ux * 5}`}
                  className={`viz-edge viz-edge--${e.state}`}
                />
              ) : null}
              {e.weight !== null ? (
                <>
                  <circle cx={midX} cy={midY} r={12} className="graph-weight-bg" />
                  <text x={midX} y={midY + 4} textAnchor="middle" className="graph-weight-text">
                    {e.weight}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
        {frame.nodes.map((n) => {
          const p = posById.get(n.id);
          if (!p) return null;
          const isCurrent = frame.current === n.id;
          return (
            <g
              key={n.id}
              className={onSelectNode ? 'viz-node-clickable' : undefined}
              onClick={onSelectNode ? () => onSelectNode(n.id) : undefined}
            >
              {isCurrent ? <circle cx={p.x} cy={p.y} r={R + 7} className="graph-halo" /> : null}
              <circle cx={p.x} cy={p.y} r={R} className={`viz-el viz-el--${n.state}`} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" className="tree-node-text">
                {n.id}
              </text>
              {/* 距离徽标 */}
              <g>
                <circle cx={p.x + R - 2} cy={p.y - R + 2} r={12} className="graph-dist-bg" />
                <text x={p.x + R - 2} y={p.y - R + 6} textAnchor="middle" className="graph-dist-text">
                  {formatDistance(n.distance)}
                </text>
              </g>
              {n.predecessor ? (
                <text x={p.x} y={p.y + R + 16} textAnchor="middle" className="graph-pred-text">
                  ← {n.predecessor}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
