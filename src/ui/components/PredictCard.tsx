/**
 * Predict Next Step 卡片：出题/作答/判分/解释/继续。
 * 纯展示组件；出题与判分逻辑在 core/predict，评分持久化由父组件经 store 完成。
 */
import { useEffect, useRef, useState } from 'react';
import type { PredictQuestion } from '../../core/predict/engine';
import { gradePredict } from '../../core/predict/engine';

export interface PredictActive {
  question: PredictQuestion;
  stepIndex: number;
}

export function PredictCard({
  active,
  session,
  onAnswer,
  onProceed,
  onClose,
}: {
  active: PredictActive;
  /** 本次会话累计（答题后已更新） */
  session: { total: number; correct: number };
  /** 作答（父组件负责判分记录与展示） */
  onAnswer: (selectedIndex: number) => void;
  /** 继续（关闭题目卡片） */
  onProceed: () => void;
  /** 关闭 Predict 模式 */
  onClose: () => void;
}) {
  const { question } = active;
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 每道新题重置选择
  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
  }, [active.question, active.stepIndex]);

  const answered = submitted && selected !== null;
  const correct = answered && gradePredict(question, selected);

  return (
    <section className="card predict-card" ref={cardRef} aria-label="预测下一步">
      <div className="predict-head">
        <h3>🤔 预测下一步</h3>
        <span className="predict-session" aria-label={`本次会话答对 ${session.correct} 题，共 ${session.total} 题`}>
          本次 {session.correct}/{session.total}
        </span>
        <button type="button" className="btn btn-icon" aria-label="关闭预测模式" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="predict-prompt">{question.prompt}</p>
      <div className="predict-options" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((opt, i) => {
          const state = !answered ? '' : i === question.answerIndex ? ' is-right' : i === selected ? ' is-wrong' : '';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected === i}
              className={`predict-option${state}`}
              disabled={answered}
              onClick={() => setSelected(i)}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className="predict-result" role="status" aria-live="polite">
          <p className={correct ? 'predict-verdict is-correct' : 'predict-verdict is-wrong'}>
            {correct ? '✅ 答对了！' : '❌ 不对哦。'}
          </p>
          <p className="predict-explanation">{question.explanation}</p>
          <button type="button" className="btn btn-primary" onClick={onProceed}>
            继续动画
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          disabled={selected === null}
          onClick={() => {
            if (selected === null) return;
            setSubmitted(true);
            onAnswer(selected);
          }}
        >
          提交答案
        </button>
      )}
    </section>
  );
}
