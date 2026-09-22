/**
 * Challenge 核心依赖的类型别名（避免 challenge → registry 循环引用问题集中一处）。
 */
export type { AlgorithmInput } from '../registry';
export type { VizStep } from '../step/step';
