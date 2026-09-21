/**
 * 帧类型守卫测试：渲染分发与状态视图依赖这些守卫做运行时收窄。
 */
import { describe, expect, it } from 'vitest';
import {
  isArrayFrame,
  isStructureFrame,
  isTreeFrame,
  isGraphFrame,
  isRecursionFrame,
  isNQueensFrame,
  isDPFrame,
} from './frame';
import { arrayFrame, structureFrame } from './frame';

describe('帧类型守卫', () => {
  it('arrayFrame：仅 isArrayFrame 为真', () => {
    const f = arrayFrame([1, 2]);
    expect(isArrayFrame(f)).toBe(true);
    expect(isStructureFrame(f)).toBe(false);
    expect(isTreeFrame(f)).toBe(false);
    expect(isGraphFrame(f)).toBe(false);
    expect(isRecursionFrame(f)).toBe(false);
    expect(isNQueensFrame(f)).toBe(false);
    expect(isDPFrame(f)).toBe(false);
  });

  it('structureFrame：仅 isStructureFrame 为真', () => {
    const f = structureFrame('stack', [], {});
    expect(isStructureFrame(f)).toBe(true);
    expect(isArrayFrame(f)).toBe(false);
  });

  it('其余帧类型：各自守卫为真、其余为假', () => {
    const tree = { kind: 'tree', nodes: [], edges: [], highlight: [], output: [], message: '' } as const;
    const graph = { kind: 'graph', nodes: [], edges: [], current: null, frontier: [], frontierKind: 'none', message: '' } as const;
    const rec = { kind: 'recursion', callStack: [], pegs: null, lastMove: null, memo: null, message: '' } as const;
    const queens = { kind: 'nqueens', n: 4, queens: [-1, -1, -1, -1], tryingRow: -1, tryingCol: -1, attacking: false, solutions: [], message: '' } as const;
    const dp = { kind: 'dp', rowHeaders: [], colHeaders: [], cells: [], current: null, dependencies: [], message: '', extras: { label: '', items: [] } } as const;

    const frames = [tree, graph, rec, queens, dp] as const;
    const guards = [isTreeFrame, isGraphFrame, isRecursionFrame, isNQueensFrame, isDPFrame];
    for (let i = 0; i < frames.length; i++) {
      for (let j = 0; j < guards.length; j++) {
        expect(guards[j](frames[i])).toBe(i === j);
      }
      expect(isArrayFrame(frames[i])).toBe(false);
      expect(isStructureFrame(frames[i])).toBe(false);
    }
  });
});
