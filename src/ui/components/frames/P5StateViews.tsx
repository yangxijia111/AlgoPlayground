/**
 * P5 帧的"变量与状态"视图：递归调用栈摘要、N 皇后进度、DP 填表进度。
 */
import type { DPFrame, NQueensFrame, RecursionFrame } from '../../../core/step/frame';

export function RecursionStateView({ frame }: { frame: RecursionFrame }) {
  const top = frame.callStack[frame.callStack.length - 1];
  return (
    <ul className="state-list">
      <li>
        <span className="state-key">栈深度</span>
        <code className="state-val">{frame.callStack.length}</code>
      </li>
      {top ? (
        <li>
          <span className="state-key">栈顶帧</span>
          <code className="state-val">
            {top.label}（{top.state === 'returned' ? `已返回 ${top.returnValue}` : top.state === 'active' ? '执行中' : '等待中'}）
          </code>
        </li>
      ) : null}
      {frame.lastMove ? (
        <li>
          <span className="state-key">最近移动</span>
          <code className="state-val">{frame.lastMove}</code>
        </li>
      ) : null}
    </ul>
  );
}

export function NQueensStateView({ frame }: { frame: NQueensFrame }) {
  const placed = frame.queens.filter((c) => c >= 0).length;
  return (
    <ul className="state-list">
      <li>
        <span className="state-key">已放置皇后</span>
        <code className="state-val">{placed} / {frame.n}</code>
      </li>
      {frame.tryingRow >= 0 ? (
        <li>
          <span className="state-key">当前尝试</span>
          <code className="state-val">
            (行 {frame.tryingRow + 1}, 列 {frame.tryingCol + 1}){frame.attacking ? ' → 冲突' : ' → 安全'}
          </code>
        </li>
      ) : null}
      <li>
        <span className="state-key">已找到解</span>
        <code className="state-val">{frame.solutions.length}</code>
      </li>
    </ul>
  );
}

export function DPStateView({ frame }: { frame: DPFrame }) {
  const filled = frame.cells.filter((c) => c !== null).length;
  const currentIdx = frame.current;
  const cols = frame.colHeaders.length;
  const currentLabel =
    currentIdx === null
      ? '—'
      : `dp[${frame.rowHeaders[Math.floor(currentIdx / cols)] ?? ''}][${frame.colHeaders[currentIdx % cols]}] = ${
          frame.cells[currentIdx] === null ? '·' : frame.cells[currentIdx]
        }`;
  return (
    <ul className="state-list">
      <li>
        <span className="state-key">填表进度</span>
        <code className="state-val">
          {filled} / {frame.cells.length}
        </code>
      </li>
      <li>
        <span className="state-key">当前格</span>
        <code className="state-val">{currentLabel}</code>
      </li>
      {frame.dependencies.length > 0 ? (
        <li>
          <span className="state-key">依赖格</span>
          <code className="state-val">
            {frame.dependencies
              .map((d) => `${frame.rowHeaders[Math.floor(d / cols)] ?? ''}[${frame.colHeaders[d % cols]}]=${frame.cells[d]}`)
              .join('，')}
          </code>
        </li>
      ) : null}
      {frame.transition ? (
        <>
          <li>
            <span className="state-key">转移公式</span>
            <code className="state-val">{frame.transition.formula}</code>
          </li>
          <li>
            <span className="state-key">候选对比</span>
            <code className="state-val">
              {frame.transition.candidates.map((c) => `${c.label}=${c.value}`).join('，')}
            </code>
          </li>
          <li>
            <span className="state-key">选择</span>
            <code className="state-val">{frame.transition.chosen}</code>
          </li>
        </>
      ) : null}
    </ul>
  );
}
