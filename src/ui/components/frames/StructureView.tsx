/**
 * 线性结构渲染器：栈（垂直）/ 队列（水平）/ 链表（水平+箭头）。
 * 使用 HTML 盒子 + 指针标签；颜色仍由 ElementState 语义类驱动。
 */
import type { StructureFrame } from '../../../core/step/frame';

function PointerChips({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <span className="struct-ptr-row">
      {names.map((n) => (
        <span key={n} className="struct-ptr">
          {n}
        </span>
      ))}
    </span>
  );
}

export function StructureView({ frame }: { frame: StructureFrame }) {
  const pointersByIndex = new Map<number, string[]>();
  for (const [name, idx] of Object.entries(frame.pointers)) {
    if (idx === null) continue;
    const list = pointersByIndex.get(idx) ?? [];
    list.push(name);
    pointersByIndex.set(idx, list);
  }

  const box = (value: string, state: string, key: string, ptrNames: string[], sub?: string) => (
    <div className="struct-cell" key={key}>
      <div className={`struct-box viz-el--${state}`}>{value}</div>
      <PointerChips names={ptrNames} />
      {sub ? <div className="struct-sub">{sub}</div> : null}
    </div>
  );

  if (frame.layout === 'stack') {
    const items = frame.nodes.map((n, i) => box(n.value, `viz-el--${n.state}`, n.id, pointersByIndex.get(i) ?? [], `#${i}`));
    return (
      <div className="structure-view">
        <div className="structure-caption">{frame.message}</div>
        {frame.nodes.length === 0 ? (
          <div className="viz-empty">栈为空</div>
        ) : (
          <div className="stack-wrap">
            <div className="stack-boxes">{items.reverse()}</div>
            <div className="stack-base">栈底</div>
          </div>
        )}
      </div>
    );
  }

  if (frame.layout === 'queue') {
    return (
      <div className="structure-view">
        <div className="structure-caption">{frame.message}</div>
        {frame.nodes.length === 0 ? (
          <div className="viz-empty">队列为空</div>
        ) : (
          <div className="h-boxes">
            {frame.nodes.map((n, i) => box(n.value, `viz-el--${n.state}`, n.id, pointersByIndex.get(i) ?? [], `#${i}`))}
          </div>
        )}
      </div>
    );
  }

  // list（单链表）
  const cells: React.ReactNode[] = [];
  frame.nodes.forEach((n, i) => {
    cells.push(box(n.value, `viz-el--${n.state}`, n.id, pointersByIndex.get(i) ?? [], `#${i}`));
    cells.push(
      <div className="struct-arrow" key={`arrow-${n.id}`} aria-hidden="true">
        →
      </div>,
    );
  });
  cells.push(
    <div className="struct-null" key="null">
      NULL
    </div>,
  );
  return (
    <div className="structure-view">
      <div className="structure-caption">{frame.message}</div>
      <div className="h-boxes h-boxes--list">{cells}</div>
    </div>
  );
}
