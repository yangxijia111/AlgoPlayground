/**
 * 首批 7 个挑战定义（docs/CHALLENGE_SPEC.md §3）。
 * 全部复用现有 Generator 提取期望序列：排序取「可交互步」（比较/交换），
 * 结构类拼接多次单操作运行，树/图取「被访问节点」。
 */
import type { AlgorithmInput } from './deps';
import type { ChallengeAction, ChallengeDef } from './types';
import type { VizStep } from './types';
import { collectSteps } from '../step/step';
import { getAlgorithm } from '../registry';
import { bfsDefaultInput } from './bfsPreset';

const run = (algoId: string, input: AlgorithmInput): VizStep[] => {
  const entry = getAlgorithm(algoId);
  if (!entry) throw new Error(`算法不存在：${algoId}`);
  return collectSteps(entry.run(input));
};

/** 数组帧：比较/交换动作提取（冒泡与选择共用） */
function extractSortAction(cur: VizStep): ChallengeAction | null {
  const f = cur.frame;
  if (f.kind !== 'array') return null;
  if (f.swapping.length === 2) {
    return { kind: 'swap', indices: [f.swapping[0]!, f.swapping[1]!] };
  }
  if (f.comparing.length === 2) {
    return { kind: 'compare', indices: [f.comparing[0]!, f.comparing[1]!] };
  }
  return null;
}

export const CHALLENGE_DEFS: ChallengeDef[] = [
  {
    id: 'bubble-pass',
    algorithmId: 'bubble-sort',
    title: '冒泡一轮',
    goal: '对数组 [5, 2, 4, 1] 完成一轮完整的冒泡扫描：从左到右依次比较相邻元素，逆序就交换。',
    ui: 'sort',
    buildSteps: () => run('bubble-sort', { type: 'sort', array: [5, 2, 4, 1] }),
    extractAction: extractSortAction,
    takeActions: 6, // [5,2,4,1] 第一轮：3 次比较 + 3 次交换
  },
  {
    id: 'selection-round',
    algorithmId: 'selection-sort',
    title: '选择一轮',
    goal: '对数组 [7, 3, 5, 2] 完成选择排序的第一轮：在未排序区中找出最小值 2，换到队首。',
    ui: 'sort',
    buildSteps: () => run('selection-sort', { type: 'sort', array: [7, 3, 5, 2] }),
    extractAction: extractSortAction,
    takeActions: 4, // 比较(0,1) 比较(1,2) 比较(1,3) 交换(0,3)
  },
  {
    id: 'binary-search',
    algorithmId: 'binary-search',
    title: '二分定位',
    goal: '在有序数组 [1, 3, 5, 7, 9, 11] 中查找 9：每轮点击你认为的中点元素，看算法如何收缩区间。',
    ui: 'pick-array',
    buildSteps: () => run('binary-search', { type: 'search', variant: 'binary', array: [1, 3, 5, 7, 9, 11], target: 9 }),
    extractAction: (cur) => {
      const f = cur.frame;
      if (f.kind !== 'array') return null;
      const mid = f.pointers.mid;
      if (f.comparing.length === 1 && mid !== undefined) {
        return { kind: 'pick', value: String(f.values[mid]) };
      }
      return null;
    },
  },
  {
    id: 'stack-ops',
    algorithmId: 'stack',
    title: '栈操作序列',
    goal: '空栈出发，依次完成：push x、push y、pop。注意栈只能在顶部操作（LIFO）。',
    ui: 'structure',
    opButtons: [
      { kind: 'op', op: 'push', value: 'x' },
      { kind: 'op', op: 'push', value: 'y' },
      { kind: 'op', op: 'pop' },
    ],
    buildSteps: () => [
      ...run('stack', { type: 'linear', structure: 'stack', initial: [], operation: { op: 'push', value: 'x' } }),
      ...run('stack', { type: 'linear', structure: 'stack', initial: ['x'], operation: { op: 'push', value: 'y' } }),
      ...run('stack', { type: 'linear', structure: 'stack', initial: ['x', 'y'], operation: { op: 'pop' } }),
    ],
    extractAction: (cur, prev) => {
      const f = cur.frame;
      if (f.kind !== 'structure' || f.layout !== 'stack') return null;
      const p = prev?.frame;
      if (p?.kind !== 'structure') return null;
      if (f.nodes.length === p.nodes.length + 1) {
        const added = f.nodes[f.nodes.length - 1];
        return added ? { kind: 'op', op: 'push', value: added.value } : null;
      }
      if (f.nodes.length === p.nodes.length - 1) return { kind: 'op', op: 'pop' };
      return null;
    },
  },
  {
    id: 'queue-ops',
    algorithmId: 'queue',
    title: '队列操作序列',
    goal: '空队列出发，依次完成：enqueue p、enqueue q、dequeue。注意队列从队尾进、队头出（FIFO）。',
    ui: 'structure',
    opButtons: [
      { kind: 'op', op: 'enqueue', value: 'p' },
      { kind: 'op', op: 'enqueue', value: 'q' },
      { kind: 'op', op: 'dequeue' },
    ],
    buildSteps: () => [
      ...run('queue', { type: 'linear', structure: 'queue', initial: [], operation: { op: 'enqueue', value: 'p' } }),
      ...run('queue', { type: 'linear', structure: 'queue', initial: ['p'], operation: { op: 'enqueue', value: 'q' } }),
      ...run('queue', { type: 'linear', structure: 'queue', initial: ['p', 'q'], operation: { op: 'dequeue' } }),
    ],
    extractAction: (cur, prev) => {
      const f = cur.frame;
      if (f.kind !== 'structure' || f.layout !== 'queue') return null;
      const p = prev?.frame;
      if (p?.kind !== 'structure') return null;
      if (f.nodes.length === p.nodes.length + 1) {
        const added = f.nodes[f.nodes.length - 1];
        return added ? { kind: 'op', op: 'enqueue', value: added.value } : null;
      }
      if (f.nodes.length === p.nodes.length - 1) return { kind: 'op', op: 'dequeue' };
      return null;
    },
  },
  {
    id: 'bst-search',
    algorithmId: 'bst-operations',
    title: 'BST 查找',
    goal: '在 BST 中查找 6：从根节点开始，点击「算法将走到」的节点，体会小往左、大往右。',
    ui: 'tree',
    buildSteps: () => run('bst-operations', { type: 'bst', startTree: [8, 3, 10, 1, 6, 14], operation: { op: 'search', value: 6 } }),
    extractAction: (cur, prev) => {
      const f = cur.frame;
      if (f.kind !== 'tree') return null;
      const p = prev?.frame;
      const wasActive = (id: number) => p?.kind === 'tree' && p.nodes.some((m) => m.id === id && m.state === 'active');
      const active = f.nodes.find((n) => n.state === 'active' && !wasActive(n.id));
      return active ? { kind: 'pick', value: String(active.value) } : null;
    },
  },
  {
    id: 'bfs-order',
    algorithmId: 'bfs',
    title: 'BFS 访问顺序',
    goal: '从 A 出发对图做广度优先搜索：按 BFS 的访问顺序依次点击节点（邻居按字母序入队）。',
    ui: 'graph',
    buildSteps: () => run('bfs', bfsDefaultInput()),
    extractAction: (cur, prev) => {
      const f = cur.frame;
      if (f.kind !== 'graph') return null;
      const p = prev?.frame;
      if (f.current !== null && p?.kind === 'graph' && p.current !== f.current) {
        return { kind: 'pick', value: f.current };
      }
      return null;
    },
  },
];

export function getChallengeDef(id: string): ChallengeDef | undefined {
  return CHALLENGE_DEFS.find((d) => d.id === id);
}
