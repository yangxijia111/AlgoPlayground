/**
 * Graph Share 边界测试（STORAGE/SHARE 边界，任务 §18）：
 * 应用允许创建的最大合法图（12 节点 24 边、最大权重、有向/无向混合）
 * → 生成分享链接 → 打开 → 必须恢复成功（v1 与 v2 两种协议都验证）。
 */
import { describe, expect, it } from 'vitest';
import { registerAll, getAlgorithm } from '../registry';
import { allEntries } from '../algorithms';
import type { AlgorithmInput, GraphInput } from '../registry';
import { buildShareQuery, encodeInput, decodeInput, parseShareQuery } from './url';

registerAll(allEntries);

/** 构造接近上限的合法图：12 节点、24 条边（混合有向/无向）、权重极值 1 与 99 */
function maxLegalGraph(): GraphInput {
  const nodes = Array.from({ length: 12 }, (_, i) => ({
    id: `N${String(i + 1).padStart(2, '0')}${'x'.repeat(6)}`, // 长 id 增大 payload
    x: Math.round(((i * 79) % 97) / 97 * 100) / 100,
    y: Math.round(((i * 41 + 13) % 89) / 89 * 100) / 100,
  }));
  const edges = [];
  let k = 0;
  // 环 + 交叉边：12 节点 24 边，无重复（无向按排序对去重）
  for (let i = 0; i < 12 && edges.length < 24; i++) {
    const a = nodes[i]!.id;
    const b = nodes[(i + 1) % 12]!.id;
    edges.push({ id: `edge-${String(k++).padStart(3, '0')}`, from: a, to: b, directed: i % 2 === 0, weight: i % 3 === 0 ? 99 : i % 3 === 1 ? 1 : 50 });
  }
  for (let i = 0; i < 12 && edges.length < 24; i++) {
    const a = nodes[i]!.id;
    const b = nodes[(i + 5) % 12]!.id;
    if (a === b) continue;
    const directed = true; // 有向边不与无向重复
    edges.push({ id: `edge-${String(k++).padStart(3, '0')}`, from: a, to: b, directed, weight: i % 2 === 0 ? 1 : 99 });
  }
  return { type: 'graph', algorithm: 'dijkstra', graph: { nodes, edges }, start: nodes[0]!.id, end: nodes[11]!.id };
}

describe('最大合法 Graph Share roundtrip', () => {
  it('构造的图通过 entry.validate（确实是应用允许创建的合法图）', () => {
    const input = maxLegalGraph();
    const entry = getAlgorithm('dijkstra')!;
    expect(entry.validate(input)).toBeNull();
  });

  it('v1 编码长度超过旧 2000 上限（这正是 v1 bug 的触发条件）', () => {
    const input = maxLegalGraph();
    const v1 = encodeInput(input);
    expect(v1.length).toBeGreaterThan(2000);
  });

  it('[P11 修复锁定] v2 链接：最大合法图 roundtrip 深等 + 通过 validate', () => {
    const input = maxLegalGraph();
    const q = buildShareQuery(input, { algorithmId: 'dijkstra' });
    expect(q.length).toBeLessThan(4096); // URL 长度合理
    const parsed = parseShareQuery('graph', q, { algorithmId: 'dijkstra' });
    expect(parsed).not.toBeNull();
    expect(parsed!.input).toEqual(input);
    expect(getAlgorithm('dijkstra')!.validate(parsed!.input)).toBeNull();
  });

  it('[P11 修复锁定] v1 兼容路径：旧链接（可能 >2000）现在也能解（上限放宽到 16KB）', () => {
    const input = maxLegalGraph();
    const v1Query = encodeInput(input);
    const decoded = decodeInput('graph', new URLSearchParams(v1Query));
    expect(decoded).not.toBeNull();
    expect(decoded).toEqual(input);
    expect(getAlgorithm('dijkstra')!.validate(decoded as AlgorithmInput)).toBeNull();
  });

  it('v2 带步数与 beginner 的最大图 roundtrip', () => {
    const input = maxLegalGraph();
    const q = buildShareQuery(input, { algorithmId: 'dijkstra', step: 7, beginner: true });
    const parsed = parseShareQuery('graph', q, { algorithmId: 'dijkstra' });
    expect(parsed!.input).toEqual(input);
    expect(parsed!.step).toBe(7);
    expect(parsed!.beginnerMode).toBe(true);
  });
});
