/**
 * Challenge 状态机：纯函数、不可变更新、headless 可测。
 * submitAction 把用户动作与期望动作比对：接受则前进，错误则累计 mistakes 并给出教学反馈。
 */
import type { ChallengeAction, ChallengeDef, ChallengeMachine, ChallengeResult, InteractiveStep } from './types';

/** 动作全等比较（indices 归一为升序后比较） */
export function actionsEqual(a: ChallengeAction, b: ChallengeAction): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'compare':
    case 'swap': {
      const b2 = b as typeof a;
      const norm = (x: [number, number]): [number, number] => [Math.min(x[0], x[1]), Math.max(x[0], x[1])];
      const [a1, a2] = norm(a.indices);
      const [b1, b2i] = norm(b2.indices);
      return a1 === b1 && a2 === b2i;
    }
    case 'pick':
      return a.value === (b as typeof a).value;
    case 'op': {
      const b2 = b as typeof a;
      return a.op === b2.op && a.value === b2.value;
    }
  }
}

/** 动作的中文描述（反馈用） */
export function describeAction(a: ChallengeAction): string {
  switch (a.kind) {
    case 'compare':
      return `比较 a[${a.indices[0]}] 与 a[${a.indices[1]}]`;
    case 'swap':
      return `交换 a[${a.indices[0]}] 与 a[${a.indices[1]}]`;
    case 'pick':
      return `选择 ${a.value}`;
    case 'op':
      return a.value ? `${a.op} ${a.value}` : a.op;
  }
}

/** 动作的教学提示（错误反馈：说明算法此刻应该做什么） */
export function actionHint(a: ChallengeAction): string {
  switch (a.kind) {
    case 'compare':
      return `当前算法此时应该先比较下标 ${a.indices[0]} 和 ${a.indices[1]}。`;
    case 'swap':
      return `此刻这两个元素不符合顺序，算法应该交换下标 ${a.indices[0]} 和 ${a.indices[1]}。`;
    case 'pick':
      return `算法下一步应该选择 ${a.value}。`;
    case 'op':
      return `此时应该执行 ${describeAction(a)}。`;
  }
}

/** 创建挑战：用现有 Generator 生成期望序列并过滤出可交互步骤 */
export function createMachine(def: ChallengeDef): ChallengeMachine {
  const steps = def.buildSteps();
  const interactive: InteractiveStep[] = [];
  let prev: (typeof steps)[number] | null = null;
  for (let i = 0; i < steps.length; i++) {
    const action = def.extractAction(steps[i]!, prev);
    if (action) interactive.push({ action, stepIndex: i });
    prev = steps[i]!;
    if (def.takeActions !== undefined && interactive.length >= def.takeActions) break;
  }
  return {
    def,
    interactive,
    descriptions: steps.map((s) => s.description),
    cursor: 0,
    mistakes: 0,
    status: interactive.length > 0 ? 'active' : 'completed',
  };
}

/** 提交动作 */
export function submitAction(m: ChallengeMachine, a: ChallengeAction): ChallengeResult {
  if (m.status !== 'active') {
    return { machine: m, accepted: false, feedback: '挑战已完成。点击「重新开始」再来一次。', justCompleted: false };
  }
  const expected = m.interactive[m.cursor];
  if (!expected) {
    return { machine: m, accepted: false, feedback: '挑战已完成。', justCompleted: false };
  }

  if (actionsEqual(expected.action, a)) {
    const cursor = m.cursor + 1;
    const completed = cursor >= m.interactive.length;
    return {
      machine: { ...m, cursor, status: completed ? 'completed' : 'active' },
      accepted: true,
      feedback: `✓ 正确！${m.descriptions[expected.stepIndex] ?? ''}`,
      justCompleted: completed,
    };
  }

  return {
    machine: { ...m, mistakes: m.mistakes + 1 },
    accepted: false,
    feedback: `不对哦。${actionHint(expected.action)}`,
    justCompleted: false,
    error: { expected: expected.action },
  };
}

/** 重开（同一 def 重新生成期望序列） */
export function restartMachine(m: ChallengeMachine): ChallengeMachine {
  return createMachine(m.def);
}
