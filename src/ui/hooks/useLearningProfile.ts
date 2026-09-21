/**
 * 学习数据 React 绑定：useSyncExternalStore 订阅 LearningStore。
 */
import { useSyncExternalStore } from 'react';
import type { LearningProfile } from '../../core/learning/types';
import { getLearningStore } from '../../core/storage/store';

export function useLearningProfile(): LearningProfile {
  const store = getLearningStore();
  return useSyncExternalStore(store.subscribe, store.getProfile);
}
