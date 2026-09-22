/**
 * 挑战页当前帧选择：显示「下一个期望动作」对应的真实算法帧；
 * 完成后显示期望序列最后一步的帧（终态）。
 */
import type { Frame } from '../../core/step/frame';
import type { ChallengeMachine } from '../../core/challenge/types';

/** 每个挑战定义缓存一次步骤（def 不可变，输入固定） */
const frameCache = new Map<string, Frame[]>();

export function machineFrame(m: ChallengeMachine): Frame | null {
  const defId = m.def.id;
  let frames = frameCache.get(defId);
  if (!frames) {
    frames = m.def.buildSteps().map((s) => s.frame);
    frameCache.set(defId, frames);
  }
  if (frames.length === 0) return null;
  if (m.status === 'completed') return frames[frames.length - 1] ?? null;
  // 显示「下一个期望动作」之前的最后状态：interactive[cursor].stepIndex 的前一步
  const next = m.interactive[m.cursor];
  if (!next) return frames[frames.length - 1] ?? null;
  const idx = Math.max(0, next.stepIndex - 1);
  return frames[idx] ?? null;
}
