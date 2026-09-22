/**
 * Complexity Explorer 核心：常见复杂度的增长函数与关联算法（区分最好/平均/最坏）。
 * 纯函数、确定性；页面渲染为简单 SVG 曲线（不引入图表库）。
 */

export type GrowthFn = (n: number) => number;

export interface ComplexityKind {
  id: string;
  label: string;
  fn: GrowthFn;
  /** 一句话直觉 */
  blurb: string;
  /** 示例：n=1000 时的近似操作数（用于表格） */
}

export const COMPLEXITY_KINDS: ComplexityKind[] = [
  { id: 'const', label: 'O(1)', fn: () => 1, blurb: '常数：与规模无关，如数组按下标取值' },
  { id: 'log', label: 'O(log n)', fn: (n) => Math.log2(Math.max(1, n)), blurb: '对数：每次把规模砍半，如二分查找' },
  { id: 'linear', label: 'O(n)', fn: (n) => n, blurb: '线性：扫描一遍，如线性查找' },
  { id: 'nlogn', label: 'O(n log n)', fn: (n) => n * Math.log2(Math.max(1, n)), blurb: '线性对数：高效排序的下限，如归并' },
  { id: 'quad', label: 'O(n²)', fn: (n) => n * n, blurb: '平方：两层嵌套扫描，如冒泡/选择' },
  { id: 'exp', label: 'O(2ⁿ)', fn: (n) => Math.pow(2, Math.min(n, 60)), blurb: '指数：每步分裂两个子问题，如朴素递归 fib' },
];

/** 复杂度曲线采样（对数 y 轴展示） */
export function sampleCurves(maxN: number, samples = 40): { n: number; values: Record<string, number> }[] {
  const out: { n: number; values: Record<string, number> }[] = [];
  for (let i = 1; i <= samples; i++) {
    const n = Math.max(1, Math.round((maxN * i) / samples));
    const values: Record<string, number> = {};
    for (const k of COMPLEXITY_KINDS) values[k.id] = Math.max(1, k.fn(n));
    out.push({ n, values });
  }
  return out;
}

/** 复杂度 → 算法映射（区分平均/最坏；id 对应注册表算法） */
export interface ComplexityAlgoRef {
  algorithmId: string;
  best: string;
  average: string;
  worst: string;
  note?: string;
}

export const ALGO_COMPLEXITY: ComplexityAlgoRef[] = [
  { algorithmId: 'bubble-sort', best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', note: '带 swapped 早停：几乎有序时接近 O(n)' },
  { algorithmId: 'selection-sort', best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', note: '比较次数固定，与输入无关' },
  { algorithmId: 'insertion-sort', best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', note: '几乎有序时非常快' },
  { algorithmId: 'merge-sort', best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', note: '始终稳定；需 O(n) 辅助空间' },
  { algorithmId: 'quick-sort', best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', note: '最坏发生在 pivot 极端（如已排序取末元素）' },
  { algorithmId: 'heap-sort', best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', note: '原地；不稳定' },
  { algorithmId: 'linear-search', best: 'O(1)', average: 'O(n)', worst: 'O(n)', note: '最好：第一个就是目标' },
  { algorithmId: 'binary-search', best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', note: '前提：数组有序' },
  { algorithmId: 'bst-operations', best: 'O(log n)', average: 'O(log n)', worst: 'O(n)', note: '最坏：退化成链表（不平衡）' },
  { algorithmId: 'fibonacci-recursion', best: 'O(2ⁿ)', average: 'O(2ⁿ)', worst: 'O(2ⁿ)', note: '调用次数指数增长' },
  { algorithmId: 'fib-dp', best: 'O(n)', average: 'O(n)', worst: 'O(n)', note: '每个子问题只算一次' },
  { algorithmId: 'knapsack', best: 'O(nW)', average: 'O(nW)', worst: 'O(nW)', note: '伪多项式：W 为容量' },
  { algorithmId: 'n-queens', best: '指数级', average: '指数级', worst: '指数级', note: '回溯 + 剪枝，解数指数增长' },
];

/** n 从 1..maxN 的操作数表（页面表格用） */
export function opTable(maxN: number): { n: number; ops: Record<string, string> }[] {
  const ns = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024].filter((x) => x <= Math.max(16, maxN));
  return ns.map((n) => {
    const ops: Record<string, string> = {};
    for (const k of COMPLEXITY_KINDS) {
      const v = k.fn(n);
      ops[k.id] = v >= 1e6 ? v.toExponential(1) : String(Math.round(v));
    }
    return { n, ops };
  });
}
