/**
 * 注册表全量扫描（TEST_PLAN T2 + 结构健全性）：
 * 对全部注册条目用默认输入运行，检查步骤完整性、元数据与校验一致性。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { allEntries } from './index';
import { allAlgorithms, getAlgorithm, algorithmsByCategory, registerAll } from '../registry';
import { collectSteps } from '../step/step';
import { checkStepIntegrity } from '../step/integrity';

describe('注册表查找函数', () => {
  beforeAll(() => {
    registerAll(allEntries);
  });

  it('getAlgorithm：命中与未命中', () => {
    expect(getAlgorithm('bubble-sort')?.meta.name).toBe('冒泡排序');
    expect(getAlgorithm('no-such-id')).toBeUndefined();
  });

  it('algorithmsByCategory：按分类过滤', () => {
    expect(algorithmsByCategory('sorting')).toHaveLength(6);
    expect(algorithmsByCategory('no-such-category')).toEqual([]);
  });

  it('allAlgorithms 与 allEntries 一致；registerAll 可重建', () => {
    expect([...allAlgorithms()]).toEqual(allEntries);
    registerAll(allEntries);
    expect(allAlgorithms().length).toBe(allEntries.length);
  });
});

describe('注册表结构', () => {
  it('至少注册 20 个算法，覆盖 8 个分类', () => {
    expect(allEntries.length).toBeGreaterThanOrEqual(20);
    const categories = new Set(allEntries.map((e) => e.meta.category));
    expect(categories.size).toBe(8);
  });

  it.each(allEntries.map((e) => [e.meta.id]))('%s：元数据完整', (id) => {
    const e = allEntries.find((x) => x.meta.id === id)!;
    expect(e.meta.name.trim()).not.toBe('');
    expect(e.meta.enName.trim()).not.toBe('');
    expect(e.meta.purpose.trim()).not.toBe('');
    expect(e.meta.coreIdea.trim()).not.toBe('');
    expect(e.meta.timeComplexity.trim()).not.toBe('');
    expect(e.meta.spaceComplexity.trim()).not.toBe('');
    expect(e.meta.pseudocode.length).toBeGreaterThanOrEqual(3);
  });

  it.each(allEntries.map((e) => [e.meta.id]))('%s：默认输入通过自身校验', (id) => {
    const e = allEntries.find((x) => x.meta.id === id)!;
    expect(e.validate(e.defaultInput)).toBeNull();
  });

  it('排序条目都声明 compareGroup 且都有稳定性', () => {
    const sorts = allEntries.filter((e) => e.compareGroup === 'sorting');
    expect(sorts).toHaveLength(6);
    for (const s of sorts) {
      expect(s.meta.stability).toBeTruthy();
    }
  });
});

describe('T2：全部条目默认输入的步骤完整性', () => {
  it.each(allEntries.map((e) => [e.meta.id]))('%s', (id) => {
    const e = allEntries.find((x) => x.meta.id === id)!;
    const steps = collectSteps(e.run(e.defaultInput));
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[0].description.trim()).not.toBe('');
    expect(steps[steps.length - 1].description.trim()).not.toBe('');
    expect(checkStepIntegrity(steps, e.meta.pseudocode.length)).toEqual([]);
  });
});
