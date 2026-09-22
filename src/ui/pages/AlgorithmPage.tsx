/**
 * 算法页（注册表驱动的通用页面）：
 * 中栏 = 输入编辑器 + 可视化 + 播放器；右栏 = 教学面板。
 * 校验失败时保留上一次成功步骤并显示错误（STATE_SPEC §6）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAlgorithm } from '../../core/registry';
import type { AlgorithmEntry, AlgorithmInput } from '../../core/registry';
import { collectSteps } from '../../core/step/step';
import type { VizStep } from '../../core/step/step';
import { getLearningStore } from '../../core/storage/store';
import { isArrayFrame, isStructureFrame, isTreeFrame, isGraphFrame, isRecursionFrame, isNQueensFrame, isDPFrame } from '../../core/step/frame';
import { PlayerBar } from '../components/PlayerBar';
import { TeachingPanel } from '../components/TeachingPanel';
import { FrameView } from '../components/frames/FrameView';
import { ArrayStateView } from '../components/frames/ArrayStateView';
import { StructureStateView } from '../components/frames/StructureStateView';
import { TreeStateView } from '../components/frames/TreeStateView';
import { GraphStateView } from '../components/frames/GraphStateView';
import { RecursionStateView, NQueensStateView, DPStateView } from '../components/frames/P5StateViews';
import { SortInputEditor } from '../editors/SortInputEditor';
import { SearchInputEditor } from '../editors/SearchInputEditor';
import { LinearInputEditor } from '../editors/LinearInputEditor';
import { LinkedListInputEditor } from '../editors/LinkedListInputEditor';
import { BSTInputEditor } from '../editors/BSTInputEditor';
import { TraversalInputEditor } from '../editors/TraversalInputEditor';
import { GraphInputEditor } from '../editors/GraphInputEditor';
import { RecursionInputEditor, NQueensInputEditor, DPInputEditor } from '../editors/RecursionDPEditors';
import { usePlayback } from '../hooks/usePlayback';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useLearningProfile } from '../hooks/useLearningProfile';
import { explainStepBeginner, getBeginnerNote } from '../../core/learning/beginner';
import { generatePredictQuestion } from '../../core/predict/engine';
import type { PredictQuestion } from '../../core/predict/engine';
import { PredictCard } from '../components/PredictCard';
import { QuizCard } from '../components/QuizCard';
import { NoteEditor } from '../components/NoteEditor';
import { questionsByAlgorithm } from '../../core/quiz';

export default function AlgorithmPage() {
  const { algoId } = useParams();
  const entry = algoId ? getAlgorithm(algoId) : undefined;
  if (!entry) {
    return (
      <div className="page-missing">
        <h2>未找到该算法</h2>
        <p>请从左侧选择一个算法。</p>
      </div>
    );
  }
  return <AlgorithmPageInner key={entry.meta.id} entry={entry} />;
}

function InputEditor({
  input,
  entry,
  onCommit,
}: {
  input: AlgorithmInput;
  entry: AlgorithmEntry;
  onCommit: (i: AlgorithmInput) => void;
}) {
  switch (input.type) {
    case 'sort':
      return <SortInputEditor value={input} onCommit={onCommit} />;
    case 'search':
      return <SearchInputEditor value={input} onCommit={onCommit} />;
    case 'linear':
      return <LinearInputEditor value={input} onCommit={onCommit} />;
    case 'linkedlist':
      return <LinkedListInputEditor value={input} onCommit={onCommit} />;
    case 'bst':
      // 按条目区分（而非 operation）：遍历页"重建"提交 build 后仍应显示遍历编辑器
      return entry.meta.id === 'tree-traversal' ? (
        <TraversalInputEditor value={input} onCommit={onCommit} />
      ) : (
        <BSTInputEditor value={input} onCommit={onCommit} />
      );
    case 'graph':
      return <GraphInputEditor value={input} onCommit={onCommit} />;
    case 'recursion':
      return <RecursionInputEditor value={input} onCommit={onCommit} />;
    case 'nqueens':
      return <NQueensInputEditor value={input} onCommit={onCommit} />;
    case 'dp':
      return <DPInputEditor value={input} onCommit={onCommit} />;
    default:
      return <p className="editor-placeholder">该类别的输入编辑器将在后续阶段提供</p>;
  }
}

function AlgorithmPageInner({ entry }: { entry: AlgorithmEntry }) {
  const [input, setInput] = useState<AlgorithmInput>(entry.defaultInput);
  const [steps, setSteps] = useState<VizStep[]>(() => collectSteps(entry.run(entry.defaultInput)));
  const [error, setError] = useState<string | null>(null);
  const store = getLearningStore();

  // 学习记录：进入页面计数（ref 防抖：StrictMode 重挂不重复计数）
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (viewedRef.current === entry.meta.id) return;
    viewedRef.current = entry.meta.id;
    store.recordAlgorithmView(entry.meta.id);
  }, [entry.meta.id, store]);

  const commit = useCallback(
    (next: AlgorithmInput) => {
      const err = entry.validate(next);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      setInput(next);
      setSteps(collectSteps(entry.run(next)));
    },
    [entry],
  );

  const { engine, snapshot } = usePlayback(steps.length);
  useKeyboardShortcuts(engine);

  // 学习记录：播放到末步视为「看完动画」
  useEffect(() => {
    if (snapshot.finished && snapshot.total > 1) store.markAnimationWatched(entry.meta.id);
  }, [snapshot.finished, snapshot.total, entry.meta.id, store]);

  // Beginner Mode：当前步详解 + 算法要点（frame-diff 确定性生成）
  const profile = useLearningProfile();
  const beginner = useMemo(() => {
    if (!profile.settings.beginnerMode) return { detail: null, note: null };
    const step = steps[snapshot.index];
    const prev = snapshot.index > 0 ? steps[snapshot.index - 1] : null;
    return { detail: step ? explainStepBeginner(step, prev ?? null) : null, note: getBeginnerNote(entry.meta.id) };
  }, [profile.settings.beginnerMode, steps, snapshot.index, entry.meta.id]);

  // Predict Next Step：播放推进到出题点自动暂停出题；也可手动「考考我」
  const [predictMode, setPredictMode] = useState(false);
  const [predictSession, setPredictSession] = useState({ total: 0, correct: 0 });
  const [predict, setPredict] = useState<{ question: PredictQuestion; stepIndex: number } | null>(null);

  useEffect(() => {
    if (!predictMode || predict !== null || !snapshot.playing) return;
    if (snapshot.index > 0 && snapshot.index % 4 === 3) {
      const q = generatePredictQuestion(steps, snapshot.index);
      if (q) {
        engine.pause();
        setPredict({ question: q, stepIndex: snapshot.index });
      }
    }
  }, [predictMode, predict, snapshot.playing, snapshot.index, steps, engine]);

  const askNow = useCallback(() => {
    const q = generatePredictQuestion(steps, snapshot.index);
    if (q) {
      engine.pause();
      setPredict({ question: q, stepIndex: snapshot.index });
    }
  }, [steps, snapshot.index, engine]);

  const answerPredict = useCallback(
    (selected: number) => {
      if (predict === null) return;
      const correct = selected === predict.question.answerIndex;
      store.recordPredictAttempt(entry.meta.id, {
        stepIndex: predict.stepIndex,
        stepType: predict.question.stepType,
        correct,
      });
      setPredictSession((s) => ({ total: s.total + 1, correct: s.correct + (correct ? 1 : 0) }));
    },
    [predict, store, entry.meta.id],
  );

  const proceedPredict = useCallback(() => {
    setPredict(null);
  }, []);

  // Quiz：本算法题组与历史记录
  const quizQuestions = useMemo(() => questionsByAlgorithm(entry.meta.id), [entry.meta.id]);
  const quizHistory = useMemo(() => {
    const out: Record<string, { attemptCount: number; lastCorrect: boolean }> = {};
    const rec = profile.progress[entry.meta.id]?.quiz;
    if (rec) {
      for (const [qid, r] of Object.entries(rec)) out[qid] = { attemptCount: r.attemptCount, lastCorrect: r.lastCorrect };
    }
    return out;
  }, [profile.progress, entry.meta.id]);
  const answerQuiz = useCallback(
    (questionId: string, correct: boolean) => {
      store.recordQuizAnswer(entry.meta.id, questionId, correct);
    },
    [store, entry.meta.id],
  );

  const bookmarked = profile.bookmarks.some((b) => b.targetId === entry.meta.id);

  const step = steps[snapshot.index];
  const stateSlot = step && isArrayFrame(step.frame) ? (
    <ArrayStateView frame={step.frame} />
  ) : step && isStructureFrame(step.frame) ? (
    <StructureStateView frame={step.frame} />
  ) : step && isTreeFrame(step.frame) ? (
    <TreeStateView frame={step.frame} />
  ) : step && isGraphFrame(step.frame) ? (
    <GraphStateView frame={step.frame} />
  ) : step && isRecursionFrame(step.frame) ? (
    <RecursionStateView frame={step.frame} />
  ) : step && isNQueensFrame(step.frame) ? (
    <NQueensStateView frame={step.frame} />
  ) : step && isDPFrame(step.frame) ? (
    <DPStateView frame={step.frame} />
  ) : undefined;

  return (
    <div className="algo-page">
      <div className="algo-center">
        <section className="card editor-card" aria-label="输入">
          <div className="card-head">
            <h1 className="card-title">{entry.meta.name}</h1>
            <span className="card-sub">{entry.meta.enName}</span>
            <button
              type="button"
              className={`btn btn-icon bookmark-btn${bookmarked ? ' is-on' : ''}`}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? '取消收藏' : '收藏本算法'}
              title={bookmarked ? '取消收藏' : '收藏'}
              onClick={() => store.toggleBookmark(entry.meta.id)}
            >
              {bookmarked ? '★' : '☆'}
            </button>
          </div>
          <InputEditor input={input} entry={entry} onCommit={commit} />
          {error ? (
            <p className="form-error form-error--page" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <section className="card viz-card" aria-label="算法可视化">
          {step ? <FrameView frame={step.frame} /> : <div className="viz-empty">暂无可视化内容</div>}
        </section>

        <PlayerBar snapshot={snapshot} engine={engine} />

        <div className="predict-bar" aria-label="预测模式控制">
          <button
            type="button"
            className={`btn predict-toggle${predictMode ? ' is-on' : ''}`}
            aria-pressed={predictMode}
            onClick={() => {
              setPredictMode((v) => !v);
              setPredict(null);
            }}
          >
            🤔 预测模式
          </button>
          <button type="button" className="btn" onClick={askNow} disabled={!predictMode || predict !== null}>
            考考我
          </button>
          {predictMode ? (
            <span className="predict-hint">开启后，播放每推进几步会暂停出题：猜一猜算法的下一步。</span>
          ) : null}
        </div>

        {predictMode && predict !== null ? (
          <PredictCard
            active={predict}
            session={predictSession}
            onAnswer={answerPredict}
            onProceed={proceedPredict}
            onClose={() => {
              setPredictMode(false);
              setPredict(null);
            }}
          />
        ) : null}
      </div>

      <aside className="algo-right" aria-label="教学说明">
        <TeachingPanel meta={entry.meta} step={step} stateSlot={stateSlot} beginner={beginner} />
        {quizQuestions.length > 0 ? (
          <QuizCard
            questions={quizQuestions}
            history={quizHistory}
            onAnswer={answerQuiz}
          />
        ) : null}
        <NoteEditor algorithmId={entry.meta.id} />
      </aside>
    </div>
  );
}
