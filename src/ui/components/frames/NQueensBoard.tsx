/**
 * N 皇后渲染器：棋盘 + 当前尝试高亮 + 已找到解的缩略图。
 */
import type { NQueensFrame } from '../../../core/step/frame';

export function NQueensBoard({ frame }: { frame: NQueensFrame }) {
  const { n, queens, tryingRow, tryingCol, attacking, solutions } = frame;

  return (
    <div className="nqueens-view">
      <div className="structure-caption">{frame.message}</div>
      <div className="nqueens-layout">
        <div
          className="queens-board"
          style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, maxWidth: Math.min(420, n * 56) }}
          role="img"
          aria-label={`${n} 皇后棋盘`}
        >
          {Array.from({ length: n * n }, (_, i) => {
            const row = Math.floor(i / n);
            const col = i % n;
            const dark = (row + col) % 2 === 1;
            const hasQueen = queens[row] === col;
            const isTrying = row === tryingRow && col === tryingCol && tryingRow >= 0;
            const classes = ['queens-cell', dark ? 'is-dark' : 'is-light'];
            if (isTrying && attacking) classes.push('is-attacking');
            else if (isTrying) classes.push('is-trying');
            return (
              <div key={i} className={classes.join(' ')}>
                {hasQueen ? <span className="queens-mark">♛</span> : null}
              </div>
            );
          })}
        </div>
        {solutions.length > 0 ? (
          <div className="queens-solutions" aria-label={`已找到 ${solutions.length} 个解`}>
            <div className="panel-subtitle">已找到的解（{solutions.length}）</div>
            <div className="queens-solutions-grid">
              {solutions.map((sol, si) => (
                <div
                  key={si}
                  className="queens-board queens-board--mini"
                  style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
                  title={`解 ${si + 1}`}
                >
                  {Array.from({ length: n * n }, (_, i) => {
                    const row = Math.floor(i / n);
                    const col = i % n;
                    const dark = (row + col) % 2 === 1;
                    return (
                      <div key={i} className={`queens-cell ${dark ? 'is-dark' : 'is-light'}`}>
                        {sol[row] === col ? <span className="queens-mark">♛</span> : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
