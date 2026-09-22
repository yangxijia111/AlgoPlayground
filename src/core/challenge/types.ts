/**
 * Challenge Mode 类型定义（docs/CHALLENGE_SPEC.md）。
 * 挑战期望序列完全由现有 Generator 产出提取（不复制算法实现），
 * 保证挑战与真实算法永不冲突。
 */
import type { AlgorithmInput, VizStep } from './deps';

export type { AlgorithmInput, VizStep };

/** 用户可执行的动作 */
export type ChallengeAction =
  | { kind: 'compare'; indices: [number, number] }
  | { kind: 'swap'; indices: [number, number] }
  /** 选节点/元素（二分选 mid、BST 走向、BFS 访问序） */
  | { kind: 'pick'; value: string }
  /** 结构操作 */
  | { kind: 'op'; op: 'push' | 'pop' | 'enqueue' | 'dequeue'; value?: string };

/** 期望序列的一项：动作 + 对应原步骤下标（渲染与反馈用） */
export interface InteractiveStep {
  action: ChallengeAction;
  stepIndex: number;
}

/** 挑战界面交互形态 */
export type ChallengeUiKind = 'sort' | 'pick-array' | 'structure' | 'tree' | 'graph';

export interface ChallengeDef {
  id: string;
  algorithmId: string;
  title: string;
  /** 中文目标描述 */
  goal: string;
  /** 期望序列来源（复用现有 Generator；可拼接多次运行） */
  buildSteps: () => VizStep[];
  /** 从步骤提取期望动作；null = 该步不是可交互步 */
  extractAction: (cur: VizStep, prev: VizStep | null) => ChallengeAction | null;
  /** 仅取前 N 个动作（如「完成一轮扫描」）；缺省取全部 */
  takeActions?: number;
  /** 交互形态 */
  ui: ChallengeUiKind;
  /** 结构类挑战的操作按钮（ui = structure 时） */
  opButtons?: ChallengeAction[];
}

export interface ChallengeMachine {
  def: ChallengeDef;
  interactive: InteractiveStep[];
  /** 全部步骤的中文解说（反馈引用真实算法步骤用） */
  descriptions: string[];
  /** 下一个期望动作下标 */
  cursor: number;
  mistakes: number;
  status: 'active' | 'completed';
}

export interface ChallengeResult {
  machine: ChallengeMachine;
  accepted: boolean;
  /** 教学性反馈（对/错都要有内容） */
  feedback: string;
  justCompleted: boolean;
  /** 被接受的动作为 null；错误时为期望动作 */
  error?: { expected: ChallengeAction };
}
