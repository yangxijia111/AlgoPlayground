/**
 * 递归渲染器：调用栈视图（栈顶在上）＋ 汉诺塔三柱（若有）＋ 递归树视图（tree 字段存在时可切换）。
 * 递归树布局：叶子等分横向宽度，父节点居中于孩子区间上方；深度决定行高。
 */
import { useMemo, useState } from 'react';
import type { RecursionFrame, RecursionTreeNodeView } from '../../../core/step/frame';

const DISK_COLORS = ['disk-1', 'disk-2', 'disk-3', 'disk-4', 'disk-5', 'disk-6', 'disk-7', 'disk-8'];

const TREE_W = 1000;
const TREE_H = 560;
const TREE_PAD = 34;
const NODE_R = 16;

/** 从 parent 关系重建树形布局：返回 id → (x, y)（[0,1] 相对坐标） */
export function layoutRecursionTree(nodes: RecursionTreeNodeView[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return pos;
  const children = new Map<string, string[]>();
  let root: RecursionTreeNodeView | null = null;
  for (const n of nodes) {
    if (n.parent === null) {
      root = n;
    } else {
      const list = children.get(n.parent) ?? [];
      list.push(n.id);
      children.set(n.parent, list);
    }
  }
  if (!root) return pos;
  // 每个节点的「叶宽」：叶子占 1，父 = 孩子之和；同时记录进入顺序用于分配 x
  const leafWidth = new Map<string, number>();
  const walk1 = (id: string): number => {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) {
      leafWidth.set(id, 1);
      return 1;
    }
    let sum = 0;
    for (const k of kids) sum += walk1(k);
    leafWidth.set(id, sum);
    return sum;
  };
  walk1(root.id);
  const depth = new Map<string, number>();
  const walk2 = (id: string, d: number) => {
    depth.set(id, d);
    for (const k of children.get(id) ?? []) walk2(k, d + 1);
  };
  walk2(root.id, 0);
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  const totalWidth = leafWidth.get(root.id) ?? 1;
  let cursor = 0;
  const assign = (id: string): { x: number } => {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) {
      const x = (cursor + 0.5) / totalWidth;
      cursor += 1;
      pos.set(id, { x, y: (depth.get(id) ?? 0) / Math.max(1, maxDepth) });
      return { x };
    }
    let startX: number | null = null;
    let endX: number | null = null;
    for (const k of kids) {
      const r = assign(k);
      if (startX === null) startX = r.x;
      endX = r.x;
    }
    const x = ((startX ?? 0) + (endX ?? 0)) / 2;
    pos.set(id, { x, y: (depth.get(id) ?? 0) / Math.max(1, maxDepth) });
    return { x };
  };
  assign(root.id);
  return pos;
}

function RecursionTree({ frame }: { frame: RecursionFrame }) {
  const tree = frame.tree;
  const layout = useMemo(() => (tree ? layoutRecursionTree(tree.nodes) : new Map<string, { x: number; y: number }>()), [tree]);
  if (!tree || tree.nodes.length === 0) return null;
  const px = (x: number) => TREE_PAD + x * (TREE_W - 2 * TREE_PAD);
  const py = (y: number) => TREE_PAD + y * (TREE_H - 2 * TREE_PAD);
  return (
    <div className="recursion-tree" aria-label="递归树">
      <svg viewBox={`0 0 ${TREE_W} ${TREE_H}`} role="img" aria-label={`递归树，共 ${tree.nodes.length} 个节点`} className="tree-svg" preserveAspectRatio="xMidYMid meet">
        {tree.nodes.map((n) => {
          if (n.parent === null) return null;
          const a = layout.get(n.parent);
          const b = layout.get(n.id);
          if (!a || !b) return null;
          return (
            <line
              key={`e-${n.id}`}
              x1={px(a.x)}
              y1={py(a.y)}
              x2={px(b.x)}
              y2={py(b.y)}
              className={`viz-edge viz-edge--${n.state === 'returned' ? 'success' : n.state === 'active' ? 'active' : 'normal'}`}
            />
          );
        })}
        {tree.nodes.map((n) => {
          const p = layout.get(n.id);
          if (!p) return null;
          const isCurrent = tree.currentId === n.id;
          return (
            <g key={n.id}>
              {isCurrent ? <circle cx={px(p.x)} cy={py(p.y)} r={NODE_R + 5} className="graph-halo" /> : null}
              <circle
                cx={px(p.x)}
                cy={py(p.y)}
                r={NODE_R}
                className={`viz-el viz-el--${n.state === 'waiting' ? 'muted' : n.state === 'returned' ? 'success' : n.state === 'active' ? 'active' : 'normal'}`}
              />
              <text x={px(p.x)} y={py(p.y) + 4} textAnchor="middle" className="rtree-label">
                {n.label.replace('fib(', '').replace(')', '')}
              </text>
              {n.returnValue !== null ? (
                <text x={px(p.x)} y={py(p.y) - NODE_R - 5} textAnchor="middle" className="rtree-ret">
                  ={n.returnValue}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="rtree-legend">
        <span className="rtree-legend-item"><span className="rtree-dot rtree-dot--active" /> 当前</span>
        <span className="rtree-legend-item"><span className="rtree-dot rtree-dot--waiting" /> 挂起</span>
        <span className="rtree-legend-item"><span className="rtree-dot rtree-dot--returned" /> 已返回</span>
      </div>
    </div>
  );
}

export function RecursionView({ frame }: { frame: RecursionFrame }) {
  const stackTopToBottom = [...frame.callStack].reverse();
  const hasTree = !!frame.tree && frame.tree.nodes.length > 0;
  const [view, setView] = useState<'stack' | 'tree'>('stack');

  return (
    <div className="recursion-view">
      <div className="structure-caption">{frame.message}</div>
      {hasTree ? (
        <div className="recursion-view-toggle" role="tablist" aria-label="递归视图切换">
          <button type="button" role="tab" aria-selected={view === 'stack'} className={`btn btn-speed${view === 'stack' ? ' is-active' : ''}`} onClick={() => setView('stack')}>
            调用栈
          </button>
          <button type="button" role="tab" aria-selected={view === 'tree'} className={`btn btn-speed${view === 'tree' ? ' is-active' : ''}`} onClick={() => setView('tree')}>
            递归树
          </button>
        </div>
      ) : null}
      {hasTree && view === 'tree' ? (
        <RecursionTree frame={frame} />
      ) : (
        <div className="recursion-layout">
          <div className="callstack" aria-label="调用栈">
            <div className="panel-subtitle">调用栈（上=栈顶）</div>
            {stackTopToBottom.length === 0 ? (
              <div className="viz-empty viz-empty--small">（栈为空）</div>
            ) : (
              stackTopToBottom.map((f) => (
                <div key={f.id} className={`callframe callframe--${f.state}`}>
                  <span className="callframe-label">{f.label}</span>
                  {f.returnValue !== null ? <span className="callframe-ret">= {f.returnValue}</span> : null}
                </div>
              ))
            )}
          </div>

        {frame.pegs ? (
          <div className="hanoi" aria-label="汉诺塔">
            {frame.lastMove ? <div className="hanoi-lastmove">{frame.lastMove}</div> : null}
            <div className="hanoi-pegs">
              {frame.pegs.map((peg) => (
                <div key={peg.name} className="hanoi-peg">
                  <div className="hanoi-disks">
                    {[...peg.disks].reverse().map((d) => (
                      <div key={d} className={`hanoi-disk ${DISK_COLORS[(d - 1) % DISK_COLORS.length]}`} style={{ width: `${28 + d * 9}%` }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="hanoi-rod" />
                  <div className="hanoi-pegname">{peg.name}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        </div>
      )}

      {frame.memo && frame.memo.length > 0 ? (
        <div className="tree-output">
          <span className="field-label">结果：</span>
          {frame.memo.map((m) => (
            <span key={m.key} className="viz-chip">
              {m.key} = {m.value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
