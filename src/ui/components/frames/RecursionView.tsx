/**
 * 递归渲染器：左侧调用栈（栈顶在上），右侧汉诺塔三柱（若有）。
 */
import type { RecursionFrame } from '../../../core/step/frame';

const DISK_COLORS = ['disk-1', 'disk-2', 'disk-3', 'disk-4', 'disk-5', 'disk-6', 'disk-7', 'disk-8'];

export function RecursionView({ frame }: { frame: RecursionFrame }) {
  const stackTopToBottom = [...frame.callStack].reverse();

  return (
    <div className="recursion-view">
      <div className="structure-caption">{frame.message}</div>
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
