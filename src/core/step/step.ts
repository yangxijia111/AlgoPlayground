/**
 * VizStep：算法产出的标准化可视化步骤。
 * 算法只负责生成步骤流；播放、回退、变速等一律由播放器层处理。
 */
import type { Frame } from './frame';
import type { StepSemantic } from './semantic';

export interface VizStep {
  /** 当前步骤的完整可视化快照 */
  frame: Frame;
  /** 当前步骤的中文解释（教学解说） */
  description: string;
  /** 高亮的伪代码行下标（0 起），可多行 */
  pseudocodeLines: number[];
  /** 计数器快照（comparisons / swaps / visits 等），键集全程一致且单调不减 */
  counters: Record<string, number>;
  /**
   * 一等语义（SEMANTIC_STEP_SPEC）：这一步发生了什么、为什么。
   * init / transition / 纯视觉步骤允许缺失；关键操作步骤必须携带
   * （由 Semantic Coverage Contract 测试强制）。消费者优先读 semantic，
   * 缺失时回退 frame-diff 兼容路径。
   */
  semantic?: StepSemantic;
}

/** 将生成器预计算为步骤数组（快照式设计，支持任意回退/拖动/重放） */
export function collectSteps(gen: Generator<VizStep, void, void>): VizStep[] {
  const steps: VizStep[] = [];
  for (const s of gen) {
    steps.push(s);
  }
  return steps;
}
