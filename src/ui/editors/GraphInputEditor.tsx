/**
 * 图交互编辑器：拖动节点 / 增删节点 / 增删边 / 设权重 / 选起终点，全部输入带校验。
 * 编辑作用于本地模型；点击"运行"提交并重新生成算法动画。
 */
import { useRef, useState } from 'react';
import type { GraphInput, GraphModel } from '../../core/registry';
import { validateGraphInput } from '../../core/algorithms/graph/common';
import { nextNodeId } from '../../core/algorithms/graph/presets';
import { getLearningStore } from '../../core/storage/store';
import { useLearningProfile } from '../hooks/useLearningProfile';

type Mode = 'move' | 'addNode' | 'addEdge' | 'delete';

const VIEW_W = 1000;
const VIEW_H = 460;
const PAD = 46;
const R = 22;

const MODE_LABELS: { id: Mode; name: string; hint: string }[] = [
  { id: 'move', name: '移动 / 选择', hint: '拖动节点改变位置；点击边可修改权重或删除' },
  { id: 'addNode', name: '添加节点', hint: '在画布空白处点击放置新节点' },
  { id: 'addEdge', name: '添加边', hint: '依次点击两个节点连边' },
  { id: 'delete', name: '删除', hint: '点击节点删除（级联删边）；点击边删除' },
];

export function GraphInputEditor({ value, onCommit }: { value: GraphInput; onCommit: (v: GraphInput) => void }) {
  const [graph, setGraph] = useState<GraphModel>(value.graph);
  const [start, setStart] = useState<string | null>(value.start);
  const [end, setEnd] = useState<string | null>(value.end);
  const [mode, setMode] = useState<Mode>('move');
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [newWeight, setNewWeight] = useState('3');
  const [directed, setDirected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState('编辑完成后点击"运行算法"。');
  const store = getLearningStore();
  const profile = useLearningProfile();
  const [presetName, setPresetName] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingId = useRef<string | null>(null);

  const px = (x: number) => PAD + x * (VIEW_W - 2 * PAD);
  const py = (y: number) => PAD + y * (VIEW_H - 2 * PAD);

  const eventPos = (e: React.PointerEvent | React.MouseEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = Math.min(0.97, Math.max(0.03, (e.clientX - rect.left) / rect.width));
    const y = Math.min(0.95, Math.max(0.05, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const commit = (g: GraphModel, s: string | null, en: string | null) => {
    const next: GraphInput = { type: 'graph', algorithm: value.algorithm, graph: g, start: s, end: en };
    const err = validateGraphInput(next);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onCommit(next);
  };

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (mode === 'move') {
      draggingId.current = id;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } else if (mode === 'addEdge') {
      if (pendingFrom === null) {
        setPendingFrom(id);
        setHint(`已选起点 ${id}，请点击第二个节点完成连边`);
      } else if (pendingFrom === id) {
        setPendingFrom(null);
        setHint('已取消选择');
      } else {
        addEdge(pendingFrom, id);
        setPendingFrom(null);
      }
    } else if (mode === 'delete') {
      const g: GraphModel = {
        nodes: graph.nodes.filter((n) => n.id !== id),
        edges: graph.edges.filter((x) => x.from !== id && x.to !== id),
      };
      let s = start;
      let en = end;
      if (s === id) s = g.nodes[0]?.id ?? null;
      if (en === id) en = null;
      setGraph(g);
      setStart(s);
      setEnd(en);
      setHint(`节点 ${id} 及其关联边已删除`);
      commit(g, s, en);
    }
  };

  const addEdge = (from: string, to: string) => {
    const w = Number(newWeight);
    if (!Number.isInteger(w) || w < 1 || w > 99) {
      setError('新边权重必须是 1–99 的整数');
      return;
    }
    if (from === to) {
      setError('不允许自环边');
      return;
    }
    const keyOf = (f: string, t: string, dir: boolean) => (dir ? `${f}>${t}` : `${[f, t].sort().join('-')}`);
    const newKey = keyOf(from, to, directed);
    if (graph.edges.some((x) => keyOf(x.from, x.to, x.directed) === newKey)) {
      setError(`边 ${from}-${to} 已存在`);
      return;
    }
    if (graph.edges.length >= 24) {
      setError('边数不能超过 24');
      return;
    }
    setError(null);
    const g: GraphModel = {
      ...graph,
      edges: [...graph.edges, { id: `e${Date.now()}-${graph.edges.length}`, from, to, directed, weight: w }],
    };
    setGraph(g);
    setHint(`边 ${from}→${to}（w=${w}${directed ? '，有向' : '，无向'}）已添加`);
    commit(g, start, end);
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (mode !== 'addNode') return;
    const pos = eventPos(e);
    if (!pos) return;
    const id = nextNodeId(graph);
    if (!id) {
      setError('节点数不能超过 12');
      return;
    }
    setError(null);
    const g: GraphModel = { nodes: [...graph.nodes, { id, x: pos.x, y: pos.y }], edges: graph.edges };
    setGraph(g);
    setHint(`节点 ${id} 已添加`);
    commit(g, start, end);
  };

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (mode !== 'move' || !draggingId.current) return;
    const pos = eventPos(e);
    if (!pos) return;
    const id = draggingId.current;
    const g: GraphModel = {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? { ...n, x: pos.x, y: pos.y } : n)),
    };
    setGraph(g);
  };

  const onCanvasPointerUp = () => {
    if (draggingId.current) {
      draggingId.current = null;
      setHint('节点位置已更新，点击"运行算法"使新坐标生效');
    }
  };

  const onEdgeClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    if (mode === 'delete') {
      const g: GraphModel = { ...graph, edges: graph.edges.filter((x) => x.id !== edgeId) };
      setGraph(g);
      setHint('边已删除，点击"运行算法"生效');
      commit(g, start, end);
    } else if (mode === 'move') {
      setSelectedEdge(edgeId === selectedEdge ? null : edgeId);
    }
  };

  const applyEdgeWeight = () => {
    if (!selectedEdge) return;
    const w = Number(newWeight);
    if (!Number.isInteger(w) || w < 1 || w > 99) {
      setError('权重必须是 1–99 的整数');
      return;
    }
    setError(null);
    const g: GraphModel = {
      ...graph,
      edges: graph.edges.map((x) => (x.id === selectedEdge ? { ...x, weight: w } : x)),
    };
    setGraph(g);
    commit(g, start, end);
  };

  const deleteEdge = () => {
    if (!selectedEdge) return;
    const g: GraphModel = { ...graph, edges: graph.edges.filter((x) => x.id !== selectedEdge) };
    setGraph(g);
    setSelectedEdge(null);
    commit(g, start, end);
  };

  const selectedEdgeObj = graph.edges.find((x) => x.id === selectedEdge) ?? null;
  const modeHint = MODE_LABELS.find((m) => m.id === mode)?.hint ?? '';

  return (
    <div className="input-editor graph-editor">
      <div className="editor-row" role="group" aria-label="编辑模式">
        {MODE_LABELS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`btn btn-speed${mode === m.id ? ' is-active' : ''}`}
            aria-pressed={mode === m.id}
            onClick={() => {
              setMode(m.id);
              setPendingFrom(null);
              setSelectedEdge(null);
              setHint(m.hint);
            }}
          >
            {m.name}
          </button>
        ))}
        <span className="field-label">{modeHint}</span>
      </div>

      <div className="editor-row">
        <label className="field">
          <span className="field-label">起点（必选）</span>
          <select
            value={start ?? ''}
            onChange={(e) => {
              const s = e.target.value || null;
              setStart(s);
              commit(graph, s, end);
            }}
          >
            <option value="">（未选择）</option>
            {graph.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id}
              </option>
            ))}
          </select>
        </label>
        {value.algorithm === 'dijkstra' ? (
          <label className="field">
            <span className="field-label">终点（可选，提前结束）</span>
            <select
              value={end ?? ''}
              onChange={(e) => {
                const en = e.target.value || null;
                setEnd(en);
                commit(graph, start, en);
              }}
            >
              <option value="">（不指定）</option>
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span className="field-label">权重（新边 / 所选边）</span>
          <input type="text" value={newWeight} style={{ width: 70 }} aria-label="边权重" onChange={(e) => setNewWeight(e.target.value)} />
        </label>
        <label className="field field--checkbox">
          <input type="checkbox" checked={directed} onChange={(e) => setDirected(e.target.checked)} aria-label="新边为有向边" />
          <span>新边为有向</span>
        </label>
        {selectedEdgeObj ? (
          <>
            <span className="viz-chip">
              所选边 {selectedEdgeObj.from}-{selectedEdgeObj.to}（w={selectedEdgeObj.weight}）
            </span>
            <button type="button" className="btn" onClick={applyEdgeWeight}>
              应用权重
            </button>
            <button type="button" className="btn" onClick={deleteEdge}>
              删除所选边
            </button>
          </>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={() => commit(graph, start, end)}>
          运行算法
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="graph-svg graph-editor-canvas"
        role="application"
        aria-label="图编辑画布"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerLeave={onCanvasPointerUp}
      >
        {graph.edges.map((e) => {
          const a = graph.nodes.find((n) => n.id === e.from);
          const b = graph.nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          const ax = px(a.x);
          const ay = py(a.y);
          const bx = px(b.x);
          const by = py(b.y);
          const dx = bx - ax;
          const dy = by - ay;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const ex = bx - ux * (R + 3);
          const ey = by - uy * (R + 3);
          const midX = (ax + bx) / 2;
          const midY = (ay + by) / 2;
          return (
            <g key={e.id} onPointerDown={(ev) => onEdgeClick(ev, e.id)}>
              <line x1={ax} y1={ay} x2={bx} y2={by} className="viz-edge" />
              {e.directed ? (
                <polygon
                  points={`${ex},${ey} ${ex - ux * 12 - uy * 5},${ey - uy * 12 + ux * 5} ${ex - ux * 12 + uy * 5},${ey - uy * 12 - ux * 5}`}
                  className="viz-edge"
                />
              ) : null}
              {/* 宽透明线提高可点击面积 */}
              <line x1={ax} y1={ay} x2={bx} y2={by} stroke="transparent" strokeWidth={16} />
              <circle cx={midX} cy={midY} r={12} className="graph-weight-bg" />
              <text x={midX} y={midY + 4} textAnchor="middle" className="graph-weight-text">
                {e.weight}
              </text>
            </g>
          );
        })}
        {graph.nodes.map((n) => {
          const cx = px(n.x);
          const cy = py(n.y);
          const isStart = n.id === start;
          const isEnd = n.id === end;
          return (
            <g key={n.id} onPointerDown={(ev) => onNodePointerDown(ev, n.id)} style={{ cursor: mode === 'move' ? 'grab' : 'pointer' }}>
              {isStart ? <circle cx={cx} cy={cy} r={R + 6} className="graph-start-ring" /> : null}
              {isEnd ? <circle cx={cx} cy={cy} r={R + 11} className="graph-end-ring" /> : null}
              {n.id === pendingFrom ? <circle cx={cx} cy={cy} r={R + 6} className="graph-halo" /> : null}
              <circle cx={cx} cy={cy} r={R} className="viz-el viz-el--normal" />
              <text x={cx} y={cy + 5} textAnchor="middle" className="tree-node-text">
                {n.id}
              </text>
              {isStart ? (
                <text x={cx} y={cy - R - 12} textAnchor="middle" className="graph-flag-text">
                  起点
                </text>
              ) : null}
              {isEnd ? (
                <text x={cx} y={cy - R - 24} textAnchor="middle" className="graph-flag-text">
                  终点
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="editor-row" role="group" aria-label="图预设">
        <input
          type="text"
          className="preset-name-input"
          aria-label="预设名称"
          placeholder="预设名称"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          style={{ width: 110 }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => {
            const name = presetName.trim();
            if (name === '') {
              setError('请先输入预设名称');
              return;
            }
            const err = validateGraphInput({ type: 'graph', algorithm: value.algorithm, graph, start, end });
            if (err) {
              setError(`预设未保存：${err}`);
              return;
            }
            setError(null);
            store.saveGraphPreset(name, graph);
            setPresetName('');
            setHint(`预设「${name}」已保存`);
          }}
        >
          保存当前图
        </button>
        {profile.savedGraphs.length > 0 ? (
          <select
            aria-label="加载已保存的图预设"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              const preset = profile.savedGraphs.find((g) => g.id === id);
              if (!preset) return;
              const g = JSON.parse(JSON.stringify(preset.graph)) as GraphModel;
              setGraph(g);
              const firstNode = g.nodes[0]?.id ?? null;
              setStart(firstNode);
              setEnd(null);
              setHint(`预设「${preset.name}」已加载，点击"运行算法"生效`);
              e.target.value = '';
            }}
          >
            <option value="">加载预设…</option>
            {profile.savedGraphs.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : null}
        {profile.savedGraphs.length > 0 ? (
          <button
            type="button"
            className="btn"
            aria-label="删除最近保存的图预设"
            onClick={() => {
              const last = profile.savedGraphs[profile.savedGraphs.length - 1];
              if (last) store.deleteGraphPreset(last.id);
            }}
          >
            删除预设
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="editor-hint">{hint}</p>
      )}
    </div>
  );
}
