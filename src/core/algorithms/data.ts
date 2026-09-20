/**
 * 排序/搜索数据生成器：带种子（mulberry32）保证可复现，测试与 UI 共用。
 */

export type DataPattern = 'random' | 'nearlySorted' | 'reversed' | 'fewUnique';

export const DATA_PATTERNS: { id: DataPattern; name: string }[] = [
  { id: 'random', name: '随机数组' },
  { id: 'nearlySorted', name: '几乎有序' },
  { id: 'reversed', name: '逆序' },
  { id: 'fewUnique', name: '大量重复值' },
];

/** 确定性伪随机数生成器 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 按模式生成数组；值域 5–100，n ≥ 1 */
export function generateArray(pattern: DataPattern, size: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const n = Math.max(1, Math.floor(size));
  switch (pattern) {
    case 'random': {
      const arr: number[] = [];
      for (let i = 0; i < n; i++) arr.push(5 + Math.floor(rand() * 96));
      return arr;
    }
    case 'nearlySorted': {
      const arr: number[] = [];
      for (let i = 0; i < n; i++) arr.push(5 + i * 5);
      // 打乱少量相邻位置（约 n/5 次）
      const swaps = Math.max(1, Math.floor(n / 5));
      for (let k = 0; k < swaps; k++) {
        const i = Math.floor(rand() * n);
        const j = Math.min(n - 1, i + 1 + Math.floor(rand() * 3));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
      return arr;
    }
    case 'reversed': {
      const arr: number[] = [];
      for (let i = 0; i < n; i++) arr.push(100 - i * 5);
      return arr;
    }
    case 'fewUnique': {
      const palette = [12, 34, 56, 78];
      const arr: number[] = [];
      for (let i = 0; i < n; i++) arr.push(palette[Math.floor(rand() * palette.length)]);
      return arr;
    }
  }
}
