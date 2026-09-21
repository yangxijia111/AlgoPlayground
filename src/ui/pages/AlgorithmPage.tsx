/**
 * 算法页（注册表驱动的通用页面）：
 * 中栏 = 输入编辑器 + 可视化 + 播放器；右栏 = 教学面板。
 * 校验失败时保留上一次成功步骤并显示错误（STATE_SPEC §6）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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
      </div>

      <aside className="algo-right" aria-label="教学说明">
        <TeachingPanel meta={entry.meta} step={step} stateSlot={stateSlot} />
      </aside>
    </div>
  );
}
