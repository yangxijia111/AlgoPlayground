/**
 * 术语表数据完整性测试。
 */
import { describe, expect, it } from 'vitest';
import { allEntries } from '../algorithms';
import { getAlgorithm, registerAll } from '../registry';
import { GLOSSARY_TERMS, getTerm, isTermId } from './glossary';

registerAll(allEntries);

/** 任务要求的首批术语 id */
const REQUIRED_TERMS = [
  'pivot', 'stack', 'queue', 'fifo', 'lifo', 'recursion', 'base-case', 'visited', 'frontier',
  'relaxation', 'distance', 'predecessor', 'heap', 'stable-sort', 'in-place', 'time-complexity',
  'space-complexity', 'dp-state', 'backtracking', 'branch', 'node', 'edge',
];

describe('Glossary 数据', () => {
  it('包含任务要求的全部 22+ 术语', () => {
    for (const id of REQUIRED_TERMS) {
      expect(getTerm(id), `缺少术语 ${id}`).toBeDefined();
    }
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(REQUIRED_TERMS.length);
  });

  it('id 唯一、term/definition 非空', () => {
    const ids = GLOSSARY_TERMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of GLOSSARY_TERMS) {
      expect(t.term.length).toBeGreaterThan(0);
      expect(t.en.length).toBeGreaterThan(0);
      expect(t.definition.length).toBeGreaterThan(10);
    }
  });

  it('related 引用的算法真实存在', () => {
    for (const t of GLOSSARY_TERMS) {
      for (const algoId of t.related ?? []) {
        expect(getAlgorithm(algoId), `${t.id} 引用 ${algoId}`).toBeDefined();
      }
    }
  });

  it('getTerm 与 isTermId 行为正确', () => {
    expect(getTerm('pivot')?.en).toBe('pivot');
    expect(getTerm('missing')).toBeUndefined();
    expect(isTermId('pivot')).toBe(true);
    expect(isTermId('missing')).toBe(false);
  });
});
