/**
 * VizStep：算法产出的标准化可视化步骤。
 * 算法只负责生成步骤流；播放、回退、变速等一律由播放器层处理。
 */
import type { Frame } from './frame';

export interface VizStep {
  /** 当前步骤的完整可视化快照 */
  frame: Frame;
  /** 当前步骤的中文解释（教学解说） */
  description: string;
  /** 高亮的伪代码行下标（0 起），可多行 */
  pseudocodeLines: number[];
  /** 计数器快照（comparisons / swaps / visits 等），键集全程一致且单调不减 */
  counters: Record<string, number>;
}

/** 将生成器预计算为步骤数组（快照式设计，支持任意回退/拖动/重放） */
export function collectSteps(gen: Generator<VizStep, void, void>): VizStep[] {
  const steps: VizStep[] = [];
  for (const s of gen) {
    steps.push(s);
  }
  return steps;
}

/** 步骤计数器快捷构造 */
export function counters(entries: Record<string, number>): Record<string, number> {
  return { ...entries };
}
