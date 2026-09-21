/**
 * 学习路线数据完整性测试：覆盖全部算法、引用合法、派生计算正确。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { allEntries } from '../algorithms';
import { allAlgorithms, getAlgorithm, registerAll } from '../registry';
import {
  LEARNING_SECTIONS,
  allLessons,
  isLessonDone,
  lessonLink,
  lessonTitle,
  overallProgress,
  sectionProgress,
} from './path';
import { CONCEPT_LESSONS, getConcept } from './concepts';

beforeAll(() => {
  registerAll(allEntries);
});

describe('概念课内容', () => {
  it('4 节基础概念课存在且结构完整', () => {
    expect(CONCEPT_LESSONS.map((c) => c.id)).toEqual([
      'what-is-algorithm',
      'what-is-data-structure',
      'time-complexity',
      'space-complexity',
    ]);
    for (const c of CONCEPT_LESSONS) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.summary.length).toBeGreaterThan(0);
      expect(c.sections.length).toBeGreaterThanOrEqual(3);
      for (const s of c.sections) {
        expect(s.heading.length).toBeGreaterThan(0);
        expect(s.paragraphs.length).toBeGreaterThan(0);
        for (const p of s.paragraphs) expect(p.length).toBeGreaterThan(0);
      }
      expect(c.relatedAlgorithms.length).toBeGreaterThan(0);
    }
  });

  it('getConcept 命中与兜底', () => {
    expect(getConcept('time-complexity')?.title).toBe('时间复杂度');
    expect(getConcept('nope')).toBeUndefined();
  });

  it('概念课引用的算法都真实存在', () => {
    for (const c of CONCEPT_LESSONS) {
      for (const algoId of c.relatedAlgorithms) {
        expect(getAlgorithm(algoId), `${c.id} 引用 ${algoId}`).toBeDefined();
      }
    }
  });
});

describe('学习路线数据', () => {
  it('13 章且全部 22 个算法都被覆盖（恰好一次）', () => {
    expect(LEARNING_SECTIONS).toHaveLength(13);
    const referenced = allLessons()
      .filter((l) => l.ref.kind === 'algorithm')
      .map((l) => (l.ref.kind === 'algorithm' ? l.ref.algorithmId : ''));
    const all = allAlgorithms().map((e) => e.meta.id);
    expect(new Set(referenced).size).toBe(referenced.length); // 无重复
    expect(new Set(referenced)).toEqual(new Set(all)); // 覆盖全部
  });

  it('全部小节引用可解析（标题与链接非兜底值）', () => {
    for (const lesson of allLessons()) {
      const { title } = lessonTitle(lesson);
      expect(title.length).toBeGreaterThan(0);
      expect(lessonLink(lesson)).toMatch(/^\//);
      if (lesson.ref.kind === 'algorithm') {
        expect(getAlgorithm(lesson.ref.algorithmId)).toBeDefined();
      } else {
        expect(getConcept(lesson.ref.conceptId)).toBeDefined();
      }
    }
  });

  it('章节 id 唯一', () => {
    const ids = LEARNING_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('进度派生计算', () => {
  it('isLessonDone：算法与概念课都以 viewCount ≥ 1 为完成', () => {
    const vc = { 'bubble-sort': 1, 'concept:what-is-algorithm': 0 };
    const bubble = LEARNING_SECTIONS[1]!.lessons[0]!;
    const basics = LEARNING_SECTIONS[0]!.lessons[0]!;
    expect(isLessonDone(bubble, vc)).toBe(true);
    expect(isLessonDone(basics, vc)).toBe(false);
  });

  it('sectionProgress：完成数与推荐下一步', () => {
    const searching = LEARNING_SECTIONS[5]!; // 搜索章：linear + binary
    expect(sectionProgress(searching, {})).toEqual({
      done: 0,
      total: 2,
      nextLesson: searching.lessons[0] ?? null,
    });
    const vc = { 'linear-search': 2 };
    const p = sectionProgress(searching, vc);
    expect(p.done).toBe(1);
    expect(p.nextLesson?.ref.kind).toBe('algorithm');
    if (p.nextLesson?.ref.kind === 'algorithm') {
      expect(p.nextLesson.ref.algorithmId).toBe('binary-search');
    }
    // 全部完成 → nextLesson 为 null
    expect(sectionProgress(searching, { 'linear-search': 1, 'binary-search': 1 }).nextLesson).toBeNull();
  });

  it('overallProgress：全空为 0，全覆盖为 total', () => {
    const lessons = allLessons();
    expect(overallProgress({}).done).toBe(0);
    expect(overallProgress({}).total).toBe(lessons.length);
    const vc: Record<string, number> = {};
    for (const l of lessons) vc[l.ref.kind === 'concept' ? `concept:${l.ref.conceptId}` : l.ref.algorithmId] = 1;
    const full = overallProgress(vc);
    expect(full.done).toBe(full.total);
  });
});
