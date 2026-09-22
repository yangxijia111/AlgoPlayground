/**
 * Property-Based Tests（CROSS_LAYER_TEST_SPEC §3，fast-check，每属性 100 cases）：
 * Reference Model（reducer）⇄ Generator ⇄ 随机输入下的不变式恒成立。
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { registerAll, getAlgorithm } from '../registry';
import { allEntries } from '../algorithms';
import type { AlgorithmInput } from '../registry';
import { collectSteps } from '../step/step';
import type { VizStep } from '../step/step';
import { isStructureFrame } from '../step/frame';
import { applyLinearOperation, applyLinkedListOperation, applyBSTOperation } from '../editors/structureState';
import { buildTree, inOrderValues, preOrderValues } from '../algorithms/tree/model';
import { buildShareQuery, parseShareQuery } from '../share/url';

registerAll(allEntries);

const NUM_RUNS = 100;

function finalStructureValues(steps: VizStep[]): string[] {
  const last = steps[steps.length - 1];
  if (!last || !isStructureFrame(last.frame)) throw new Error('终态不是结构帧');
  return last.frame.nodes.map((n) => n.value);
}

// ---------------------------------------------------------------------------
// 栈 / 队列：随机操作序列下 reducer === Generator 终态
// ---------------------------------------------------------------------------

const stackOpArb = fc.constantFrom(
  { op: 'push' as const, value: 'a' },
  { op: 'push' as const, value: 'b' },
  { op: 'push' as const, value: 'c' },
  { op: 'pop' as const },
  { op: 'peek' as const },
);
const queueOpArb = fc.constantFrom(
  { op: 'enqueue' as const, value: 'p' },
  { op: 'enqueue' as const, value: 'q' },
  { op: 'dequeue' as const },
  { op: 'front' as const },
);
const stringListArb = fc.array(fc.constantFrom('x', 'y', 'z'), { maxLength: 12 });

describe('Property：栈', () => {
  it('随机操作序列（≤30 步）下：reducer.next === Generator 终态，且 LIFO 参考一致', () => {
    fc.assert(
      fc.property(fc.array(stackOpArb, { maxLength: 30 }), stringListArb, (ops, initial) => {
        let state = initial;
        for (const op of ops) {
          const before = state;
          const r = applyLinearOperation(before, 'stack', op);
          const steps = collectSteps(
            getAlgorithm('stack')!.run({ type: 'linear', structure: 'stack', initial: before, operation: op }),
          );
          const generatorFinal = finalStructureValues(steps);
          // Generator 拒绝时终态 === before
          expect(r.next).toEqual(generatorFinal);
          state = r.next;
        }
        // LIFO 参考：重放操作序列（独立实现）验证
        const ref: string[] = [...initial];
        for (const op of ops) {
          if (op.op === 'push') {
            if (ref.length < 12) ref.push(op.value);
          } else if (op.op === 'pop') {
            ref.pop();
          }
        }
        expect(state).toEqual(ref);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('Property：队列', () => {
  it('随机操作序列（≤30 步）下：reducer === Generator，且 FIFO 参考一致', () => {
    fc.assert(
      fc.property(fc.array(queueOpArb, { maxLength: 30 }), stringListArb, (ops, initial) => {
        let state = initial;
        for (const op of ops) {
          const before = state;
          const r = applyLinearOperation(before, 'queue', op);
          const steps = collectSteps(
            getAlgorithm('queue')!.run({ type: 'linear', structure: 'queue', initial: before, operation: op }),
          );
          expect(r.next).toEqual(finalStructureValues(steps));
          state = r.next;
        }
        const ref: string[] = [...initial];
        for (const op of ops) {
          if (op.op === 'enqueue') {
            if (ref.length < 12) ref.push(op.value);
          } else if (op.op === 'dequeue') {
            ref.shift();
          }
        }
        expect(state).toEqual(ref);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// 链表
// ---------------------------------------------------------------------------

describe('Property：链表', () => {
  it('随机 insert/delete 序列下：reducer === Generator 终态', () => {
    const opArb = fc
      .constantFrom(0, 1, 2, 3, 5, 7, 11)
      .chain((pos) =>
        fc.oneof(
          fc.record({ op: fc.constant('insert' as const), position: fc.constant(pos), value: fc.constantFrom('A', 'B', 'C') }),
          fc.record({ op: fc.constant('delete' as const), position: fc.constant(pos) }),
        ),
      );
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 20 }), stringListArb, (ops, initial) => {
        let state = initial;
        for (const op of ops) {
          const before = state;
          const r = applyLinkedListOperation(before, op);
          const steps = collectSteps(getAlgorithm('linked-list')!.run({ type: 'linkedlist', initial: before, operation: op }));
          expect(r.next).toEqual(finalStructureValues(steps));
          state = r.next;
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// BST：随机序列下三种不变式
// ---------------------------------------------------------------------------

describe('Property：BST', () => {
  const valueArb = fc.integer({ min: -99, max: 999 });
  const bstOpArb = fc
    .constantFrom(1, 2, 3, 5, 8, 13, 21, 34, 55, 89)
    .chain((v) =>
      fc.oneof(
        fc.record({ op: fc.constant('insert' as const), value: fc.constant(v) }),
        fc.record({ op: fc.constant('delete' as const), value: fc.constant(v) }),
      ),
    );

  it('随机 insert/delete 序列：先序表示重建树 === Generator 终态树（同构）', () => {
    fc.assert(
      fc.property(fc.array(bstOpArb, { maxLength: 25 }), fc.array(valueArb, { maxLength: 8 }), (ops, initial) => {
        let seq = [...new Set(initial)];
        for (const op of ops) {
          const before = seq;
          const r = applyBSTOperation(before, op);
          const steps = collectSteps(getAlgorithm('bst-operations')!.run({ type: 'bst', startTree: before, operation: op }));
          // Generator 终态帧 → 先序（重建结构）
          const genPre = treeFramePreOrder(steps);
          const reducerPre = preOrderValues(buildTree(r.next).root);
          expect(reducerPre).toEqual(genPre);
          seq = r.next;
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('任意序列后中序序列始终升序且等于排序去重集合', () => {
    fc.assert(
      fc.property(fc.array(bstOpArb, { maxLength: 25 }), fc.array(valueArb, { maxLength: 8 }), (ops, initial) => {
        let seq = [...new Set(initial)];
        const ref = new Set<number>(initial);
        for (const op of ops) {
          if (op.op === 'insert') ref.add(op.value);
          const r = applyBSTOperation(seq, op);
          if (op.op === 'delete' && !r.rejected) ref.delete(op.value);
          seq = r.next;
        }
        const inOrder = inOrderValues(buildTree(seq).root);
        expect(inOrder).toEqual([...ref].sort((a, b) => a - b));
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/** 树帧 → 先序序列（同 structureState.test 的实现） */
function treeFramePreOrder(steps: VizStep[]): number[] {
  const last = steps[steps.length - 1];
  if (!last || last.frame.kind !== 'tree') throw new Error('终态不是树帧');
  const f = last.frame;
  const nodes = new Map(f.nodes.map((n) => [n.id, n]));
  const children = new Map<number, { left?: number; right?: number }>();
  for (const e of f.edges) {
    const parent = children.get(e.from) ?? {};
    const fromVal = nodes.get(e.from)?.value ?? 0;
    const toVal = nodes.get(e.to)?.value ?? 0;
    if (toVal < fromVal) parent.left = e.to;
    else parent.right = e.to;
    children.set(e.from, parent);
  }
  const hasParent = new Set(f.edges.map((e) => e.to));
  const root = f.nodes.find((n) => !hasParent.has(n.id));
  const out: number[] = [];
  const walk = (id: number | undefined) => {
    if (id === undefined) return;
    const node = nodes.get(id);
    if (!node) return;
    out.push(node.value);
    const c = children.get(id);
    walk(c?.left);
    walk(c?.right);
  };
  walk(root?.id);
  return out;
}

// ---------------------------------------------------------------------------
// Share roundtrip property
// ---------------------------------------------------------------------------

describe('Property：Share roundtrip', () => {
  it('sort：随机数组 → v2 encode → decode → deepEqual 且通过 validate', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: -99, max: 999 }), { minLength: 1, maxLength: 60 }), (arr) => {
        const input: AlgorithmInput = { type: 'sort', array: arr };
        const q = buildShareQuery(input, { algorithmId: 'bubble-sort' });
        const parsed = parseShareQuery('sort', q, { algorithmId: 'bubble-sort' });
        expect(parsed).not.toBeNull();
        expect(parsed!.input).toEqual(input);
        expect(getAlgorithm('bubble-sort')!.validate(parsed!.input)).toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('search binary：随机有序数组 + 目标 → roundtrip 保持 variant=binary', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: -99, max: 999 }), { minLength: 1, maxLength: 60 }), (raw) => {
        const arr = [...raw].sort((a, b) => a - b);
        const target = arr[Math.floor(arr.length / 2)]!;
        const input: AlgorithmInput = { type: 'search', variant: 'binary', array: arr, target };
        const q = buildShareQuery(input, { algorithmId: 'binary-search' });
        const parsed = parseShareQuery('search', q, { algorithmId: 'binary-search' });
        expect(parsed!.input).toEqual(input);
        expect((parsed!.input as { variant: string }).variant).toBe('binary');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('graph：随机合法图（≤12 节点 ≤24 边）→ roundtrip deepEqual', () => {
    const graphArb = fc.record({
      n: fc.integer({ min: 1, max: 12 }),
      seed: fc.integer({ min: 0, max: 1 << 30 }),
      e: fc.integer({ min: 0, max: 24 }),
      alg: fc.constantFrom('bfs' as const, 'dfs' as const, 'dijkstra' as const),
    });
    fc.assert(
      fc.property(graphArb, ({ n, seed, e, alg }) => {
        // 确定性构造：环形骨架 + 剩余按序连线（避免重复边）
        let s = seed >>> 0;
        const rand = () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 4294967296;
        };
        const nodes = Array.from({ length: n }, (_, i) => ({
          id: `N${i}`,
          x: Math.round(rand() * 100) / 100,
          y: Math.round(rand() * 100) / 100,
        }));
        const seen = new Set<string>();
        const edges: { id: string; from: string; to: string; directed: boolean; weight: number }[] = [];
        let eid = 0;
        const tryEdge = (from: string, to: string, directed: boolean) => {
          if (from === to || seen.has(`${from}>${to}`)) return;
          seen.add(`${from}>${to}`);
          if (!directed) seen.add(`${to}>${from}`);
          edges.push({ id: `e${eid++}`, from, to, directed, weight: 1 + Math.floor(rand() * 99) });
        };
        for (let i = 0; i < n; i++) tryEdge(nodes[i]!.id, nodes[(i + 1) % n]!.id, false);
        // 尝试上限防止死循环（n=1 时全部自环被跳过，永远凑不够边数）
        let attempts = 0;
        while (edges.length < Math.min(e, 24) && attempts < 200) {
          attempts++;
          const a = nodes[Math.floor(rand() * n)]!.id;
          const b = nodes[Math.floor(rand() * n)]!.id;
          tryEdge(a, b, true); // 有向边以避开无向重复约束
        }
        const input: AlgorithmInput = { type: 'graph', algorithm: alg, graph: { nodes, edges }, start: nodes[0]!.id, end: null };
        expect(getAlgorithm('bfs')!.validate(input)).toBeNull();
        const q = buildShareQuery(input, { algorithmId: 'bfs' });
        const parsed = parseShareQuery('graph', q, { algorithmId: 'bfs' });
        expect(parsed).not.toBeNull();
        expect(parsed!.input).toEqual(input);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('bst / recursion / nqueens / knapsack：随机合法输入 roundtrip', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -99, max: 999 }), { minLength: 0, maxLength: 31 }),
        fc.integer({ min: 4, max: 8 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 8 }),
        (tree, nq, n, items) => {
          const bst: AlgorithmInput = { type: 'bst', startTree: [...new Set(tree)], operation: { op: 'traverse', order: 'in' } };
          const pq: AlgorithmInput = { type: 'nqueens', n: nq };
          const rec: AlgorithmInput = { type: 'recursion', kind: 'hanoi', n: Math.min(5, n) };
          const ksItems = Array.from({ length: Math.max(1, items) }, (_, i) => ({ name: `I${i}`, weight: 1 + ((i * 7) % 9), value: 1 + ((i * 13) % 50) }));
          const ks: AlgorithmInput = { type: 'dp', kind: 'knapsack', items: ksItems, capacity: 3 + (n % 18) };
          for (const [input, algoId] of [
            [bst, 'bst-operations'],
            [pq, 'n-queens'],
            [rec, 'hanoi'],
            [ks, 'knapsack'],
          ] as Array<[AlgorithmInput, string]>) {
            const q = buildShareQuery(input, { algorithmId: algoId });
            const parsed = parseShareQuery(input.type, q, { algorithmId: algoId });
            expect(parsed, `${algoId}`).not.toBeNull();
            expect(parsed!.input).toEqual(input);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// 排序 semantic 与帧一致性
// ---------------------------------------------------------------------------

describe('Property：排序 semantic ↔ 帧一致', () => {
  it('随机数组：每个 swap/compare semantic 与该步帧的 swapping/comparing 一致', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: -99, max: 999 }), { minLength: 2, maxLength: 30 }), (arr) => {
        for (const id of ['bubble-sort', 'quick-sort', 'heap-sort', 'selection-sort'] as const) {
          const steps = collectSteps(getAlgorithm(id)!.run({ type: 'sort', array: arr }));
          for (const s of steps) {
            const sem = s.semantic;
            if (!sem) continue;
            if (s.frame.kind !== 'array') continue;
            if (sem.type === 'swap') {
              expect([...s.frame.swapping].sort((a, b) => a - b)).toEqual([...sem.indices].sort((a, b) => a - b));
            }
            if (sem.type === 'compare' && sem.indices.length === 2) {
              // quick-scan 语义含 (j, pivot 位) 双下标，但帧只高亮扫描位 j（pivot 另有着色）
              const expectedFrame = sem.purpose === 'quick-scan' ? [sem.indices[0]!] : [...sem.indices].sort((a, b) => a - b);
              expect([...s.frame.comparing].sort((a, b) => a - b)).toEqual(expectedFrame);
            }
          }
        }
      }),
      { numRuns: 40 },
    );
  });
});
