/**
 * 随堂小测卡片：按题库顺序作答、即时判分与解析、可重做、进度与历史点标记。
 * 判分逻辑在 core/quiz；答题记录经 onAnswer 回调写入 store。
 */
import { useEffect, useMemo, useState } from 'react';
import type { QuizQuestion } from '../../core/quiz/types';
import { gradeQuiz } from '../../core/quiz/types';

export interface QuizHistory {
  [questionId: string]: { attemptCount: number; lastCorrect: boolean };
}

export function QuizCard({
  questions,
  history,
  onAnswer,
}: {
  questions: QuizQuestion[];
  /** 历史记录（store 派生） */
  history: QuizHistory;
  onAnswer: (questionId: string, correct: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const q = questions[index];

  useEffect(() => {
    setSelected([]);
    setSubmitted(false);
  }, [index]);

  const answeredThisRound = useMemo(() => {
    if (!submitted || !q) return { correct: false };
    return gradeQuiz(q, selected);
  }, [submitted, q, selected]);

  if (!q) {
    return (
      <section className="card quiz-card" aria-label="随堂小测">
        <h3 className="panel-subtitle">📝 随堂小测</h3>
        <p className="quiz-empty">该算法的题目正在编写中。</p>
      </section>
    );
  }

  const done = index === questions.length - 1 && submitted;
  const multi = q.type === 'multiple';

  const toggle = (i: number) => {
    if (submitted) return;
    if (multi) {
      setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
    } else {
      setSelected([i]);
    }
  };

  const submit = () => {
    if (selected.length === 0) return;
    setSubmitted(true);
    const { correct } = gradeQuiz(q, selected);
    onAnswer(q.id, correct);
  };

  const next = () => {
    if (done) {
      setIndex(0);
      return; // 重开一轮（useEffect 重置选择）
    }
    setIndex((i) => i + 1);
  };

  return (
    <section className="card quiz-card" aria-label="随堂小测">
      <div className="quiz-head">
        <h3 className="panel-subtitle">📝 随堂小测</h3>
        <span className="quiz-progress" aria-label={`第 ${index + 1} 题，共 ${questions.length} 题`}>
          {index + 1}/{questions.length}
        </span>
      </div>
      <p className="quiz-question">{q.question}</p>
      {multi ? <p className="quiz-multi-hint">多选题：需全部选对</p> : null}
      <div className={`quiz-options${multi ? ' is-multi' : ''}`} role="radiogroup" aria-label={q.question}>
        {q.options.map((opt, i) => {
          const picked = selected.includes(i);
          let cls = 'quiz-option';
          if (submitted) {
            if (q.answer.includes(i)) cls += ' is-right';
            else if (picked) cls += ' is-wrong';
          } else if (picked) cls += ' is-picked';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={submitted}
              className={cls}
              onClick={() => toggle(i)}
            >
              <span className="quiz-option-mark">{multi ? (picked ? '☑' : '☐') : picked ? '●' : '○'}</span>
              {opt}
              {history[q.id] && !submitted ? (
                <span
                  className={`quiz-history-dot${history[q.id].lastCorrect ? ' is-right' : ' is-wrong'}`}
                  title={`做过 ${history[q.id].attemptCount} 次`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {submitted ? (
        <div className="quiz-result" role="status" aria-live="polite">
          <p className={answeredThisRound.correct ? 'quiz-verdict is-correct' : 'quiz-verdict is-wrong'}>
            {answeredThisRound.correct ? '✅ 正确' : '❌ 不正确'}
          </p>
          <p className="quiz-explanation">{q.explanation}</p>
        </div>
      ) : null}
      <div className="quiz-actions">
        {submitted ? (
          <button type="button" className="btn" onClick={next}>
            {done ? '再做一轮' : '下一题'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={selected.length === 0} onClick={submit}>
            提交
          </button>
        )}
      </div>
    </section>
  );
}
