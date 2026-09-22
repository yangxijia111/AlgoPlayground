/**
 * 挑战列表页（/challenges）与挑战玩法页（/challenges/:id）。
 * 玩法页交互按 def.ui 分派：排序点两格、二分点中点、结构按钮、树/图点节点。
 * 完成挑战写入 store（掌握度信号之一）。
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CHALLENGE_DEFS, getChallengeDef } from '../../core/challenge/defs';
import { createMachine, restartMachine, submitAction } from '../../core/challenge/machine';
import type { ChallengeAction, ChallengeMachine } from '../../core/challenge/types';
import { getLearningStore } from '../../core/storage/store';
import { useLearningProfile } from '../hooks/useLearningProfile';
import { TreeView } from '../components/frames/TreeView';
import { GraphView } from '../components/frames/GraphView';
import { StructureView } from '../components/frames/StructureView';
import { machineFrame } from './challengeView';

export function ChallengesPage() {
  const profile = useLearningProfile();
  return (
    <div className="challenges-page">
      <header className="learn-head">
        <h1>挑战</h1>
        <p>不是看动画，而是由你来执行算法的每一步。系统会判断操作是否符合正确的算法，并解释原因。</p>
      </header>
      <div className="challenges-grid">
        {CHALLENGE_DEFS.map((def) => {
          const rec = profile.progress[def.algorithmId]?.challenge[def.id];
          return (
            <section key={def.id} className="card challenge-card" aria-label={def.title}>
              <h2>
                {def.title}
                {rec?.completed ? <span className="challenge-done-mark">✓ 已完成</span> : null}
              </h2>
              <p>{def.goal}</p>
              <div className="challenge-card-foot">
                <Link className="btn btn-primary" to={`/challenges/${def.id}`}>
                  {rec?.completed ? '再玩一次' : '开始挑战'}
                </Link>
                {rec ? (
                  <span className="challenge-meta">
                    尝试 {rec.attempts} 次 · 最少错误 {rec.bestMistakes}
                  </span>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function ChallengePlayPage() {
  const { challengeId } = useParams();
  const def = challengeId ? getChallengeDef(challengeId) : undefined;
  if (!def) {
    return (
      <div className="page-missing">
        <h2>未找到该挑战</h2>
        <p>
          请从 <Link to="/challenges">挑战列表</Link> 选择一个挑战。
        </p>
      </div>
    );
  }
  return <ChallengePlayInner key={def.id} defId={def.id} />;
}

function ChallengePlayInner({ defId }: { defId: string }) {
  const def = getChallengeDef(defId)!;
  const store = getLearningStore();
  const [machine, setMachine] = useState<ChallengeMachine>(() => createMachine(def));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);
  // 排序挑战：当前选中的两个下标
  const [picked, setPicked] = useState<number[]>([]);

  const frame = useMemo(() => machineFrame(machine), [machine]);
  if (!frame) return null;

  const act = (action: ChallengeAction) => {
    const { machine: next, accepted, feedback: fb, justCompleted } = submitAction(machine, action);
    setMachine(next);
    setFeedback(fb);
    setFeedbackOk(accepted);
    setPicked([]);
    if (justCompleted) {
      store.recordChallengeResult(def.algorithmId, def.id, true, next.mistakes);
    }
  };

  const restart = () => {
    setMachine(restartMachine(machine));
    setFeedback(null);
    setPicked([]);
  };

  // ---- 交互区按 ui 分派 ----
  let controls: React.ReactNode = null;

  if (def.ui === 'sort') {
    const values = frame.kind === 'array' ? frame.values : [];
    const toggle = (i: number) =>
      setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length >= 2 ? [p[1]!, i] : [...p, i]));
    controls = (
      <div className="challenge-controls" aria-label="挑战操作">
        <div className="challenge-array" role="listbox" aria-label="数组元素">
          {values.map((v, i) => (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={picked.includes(i)}
              className={`challenge-cell${picked.includes(i) ? ' is-picked' : ''}`}
              onClick={() => toggle(i)}
            >
              <span className="challenge-cell-idx">{i}</span>
              {v}
            </button>
          ))}
        </div>
        <div className="challenge-buttons">
          <button
            type="button"
            className="btn"
            disabled={picked.length !== 2}
            onClick={() => picked.length === 2 && act({ kind: 'compare', indices: [picked[0]!, picked[1]!] })}
          >
            比较
          </button>
          <button
            type="button"
            className="btn"
            disabled={picked.length !== 2}
            onClick={() => picked.length === 2 && act({ kind: 'swap', indices: [picked[0]!, picked[1]!] })}
          >
            交换
          </button>
        </div>
      </div>
    );
  } else if (def.ui === 'pick-array') {
    const values = frame.kind === 'array' ? frame.values : [];
    controls = (
      <div className="challenge-controls" aria-label="挑战操作">
        <div className="challenge-array" role="listbox" aria-label="数组元素">
          {values.map((v, i) => (
            <button
              key={i}
              type="button"
              role="option"
              className="challenge-cell"
              aria-label={`选择值 ${v}（下标 ${i}）`}
              onClick={() => act({ kind: 'pick', value: String(v) })}
            >
              <span className="challenge-cell-idx">{i}</span>
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (def.ui === 'structure') {
    controls = (
      <div className="challenge-buttons" aria-label="挑战操作">
        {(def.opButtons ?? []).map((a, i) => (
          <button key={i} type="button" className="btn" onClick={() => act(a)}>
            {a.kind === 'op' ? (a.value ? `${a.op} ${a.value}` : a.op) : ''}
          </button>
        ))}
      </div>
    );
  } else if (def.ui === 'tree' && frame.kind === 'tree') {
    controls = <p className="challenge-hint">点击树上的节点：选择算法下一步将走到的节点。</p>;
  } else if (def.ui === 'graph' && frame.kind === 'graph') {
    controls = <p className="challenge-hint">点击图中的节点：按 BFS 顺序访问。</p>;
  }

  const total = machine.interactive.length;
  const completed = machine.status === 'completed';

  return (
    <div className="challenge-play">
      <header className="challenge-head">
        <p className="concept-crumb">
          <Link to="/challenges">挑战</Link>
          <span aria-hidden="true"> / </span>
          <span>{def.title}</span>
        </p>
        <h1>{def.title}</h1>
        <p className="challenge-goal">{def.goal}</p>
        <div className="challenge-status">
          <span>
            进度 {machine.cursor}/{total}
          </span>
          <span>错误 {machine.mistakes}</span>
          <button type="button" className="btn" onClick={restart}>
            重新开始
          </button>
        </div>
      </header>

      <section className="card" aria-label="挑战可视化">
        {frame.kind === 'tree' ? (
          <TreeView frame={frame} onSelectNode={(id) => {
            const node = frame.nodes.find((n) => n.id === id);
            if (node) act({ kind: 'pick', value: String(node.value) });
          }} />
        ) : frame.kind === 'graph' ? (
          <GraphView frame={frame} onSelectNode={(id) => act({ kind: 'pick', value: id })} />
        ) : frame.kind === 'structure' ? (
          <StructureView frame={frame} />
        ) : (
          <div className="viz-empty">{completed ? '挑战完成！' : '该挑战使用下方交互数组。'}</div>
        )}
      </section>

      {controls}

      <div className="challenge-feedback" role="status" aria-live="polite">
        {completed ? (
          <p className="challenge-verdict is-correct">
            🎉 完成！共 {machine.mistakes} 次错误。
            <button type="button" className="btn" onClick={restart}>
              再来一次
            </button>
          </p>
        ) : feedback ? (
          <p className={feedbackOk ? 'challenge-verdict is-correct' : 'challenge-verdict is-wrong'}>{feedback}</p>
        ) : (
          <p className="challenge-hint">执行你认为正确的下一步操作。</p>
        )}
      </div>
    </div>
  );
}

export default ChallengesPage;
