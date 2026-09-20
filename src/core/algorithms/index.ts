/**
 * 算法条目聚合：应用入口与测试共用。
 */
import type { AlgorithmEntry } from '../registry';
import sorting from './sorting';
import searching from './searching';
import linear from './linear';
import tree from './tree';

export const allEntries: AlgorithmEntry[] = [...sorting, ...searching, ...linear, ...tree];
