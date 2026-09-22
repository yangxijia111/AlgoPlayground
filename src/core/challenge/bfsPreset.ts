/**
 * BFS 挑战专用图输入（与默认演示图同构，起点 A）。
 */
import type { AlgorithmInput } from './deps';
import { defaultGraph } from '../algorithms/graph/presets';

export function bfsDefaultInput(): AlgorithmInput {
  return { type: 'graph', algorithm: 'bfs', graph: defaultGraph(), start: 'A', end: null };
}
