/**
 * 算法条目聚合：应用入口与测试共用。
 */
import type { AlgorithmEntry } from '../registry';
import sorting from './sorting';

export const allEntries: AlgorithmEntry[] = [...sorting];
