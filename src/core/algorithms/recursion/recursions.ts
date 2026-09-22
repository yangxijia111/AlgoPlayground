/**
 * 递归可视化生成器：阶乘 / 斐波那契（朴素双递归）/ 汉诺塔。
 * RecursionFrame.callStack 底→顶；返回值在帧上标注。
 */
import type { CallFrameView, PegView, RecursionFrame, RecursionTreeNodeView } from '../../step/frame';
import type { VizStep } from '../../step/step';
import type { StepSemantic } from '../../step/semantic';

interface RecCtx {
  counters: { recursions: number };
  stack: CallFrameView[];
  pegs: PegView[] | null;
  lastMove: string | null;
  memo: { key: string; value: string }[] | null;
  /** 递归树视图节点（仅 fibonacci 填充） */
  treeNodes: RecursionTreeNodeView[];
  treeCurrentId: string | null;
}

function makeRecEmit(ctx: RecCtx) {
  return (message: string, lines: number[], semantic?: StepSemantic): VizStep => ({
    frame: {
      kind: 'recursion',
      callStack: ctx.stack.map((f) => ({ ...f })),
      pegs: ctx.pegs ? ctx.pegs.map((p) => ({ name: p.name, disks: [...p.disks] })) : null,
      lastMove: ctx.lastMove,
      memo: ctx.memo ? ctx.memo.map((m) => ({ ...m })) : null,
      ...(ctx.treeNodes.length > 0
        ? {
            tree: {
              nodes: ctx.treeNodes.map((n) => ({ ...n })),
              currentId: ctx.treeCurrentId,
            },
          }
        : {}),
      message,
    } as RecursionFrame,
    description: message,
    pseudocodeLines: lines,
    counters: { ...ctx.counters },
    ...(semantic ? { semantic } : {}),
  });
}

function freshCtx(withPegs: boolean, withMemo: boolean): RecCtx {
  return {
    counters: { recursions: 0 },
    treeNodes: [],
    treeCurrentId: null,
    stack: [],
    pegs: withPegs
      ? [
          { name: 'A', disks: [] },
          { name: 'B', disks: [] },
          { name: 'C', disks: [] },
        ]
      : null,
    lastMove: null,
    memo: withMemo ? [] : null,
  };
}

/** 斐波那契参考实现（基准 fib(1)=fib(2)=1） */
export function fib(n: number): number {
  if (n <= 2) return 1;
  return fib(n - 1) + fib(n - 2);
}

// ---------------------------------------------------------------------------
// 阶乘
// 伪代码：
// 0 procedure fact(n)
// 1   if n ≤ 1 then return 1
// 2   return n × fact(n-1)
// ---------------------------------------------------------------------------

export function* factorialGen(n: number): Generator<VizStep, void, void> {
  const ctx = freshCtx(false, false);
  const emit = makeRecEmit(ctx);
  yield emit(`初始状态：准备计算 fact(${n})`, [0]);

  // 下行：逐层调用、挂起
  for (let k = n; k >= 1; k--) {
    ctx.counters.recursions++;
    ctx.stack.push({ id: `f${k}`, label: `fact(${k})`, state: 'active', returnValue: null });
    for (let i = 0; i < ctx.stack.length - 1; i++) {
      if (ctx.stack[i].state !== 'returned') ctx.stack[i].state = 'waiting';
    }
    if (k === 1) {
      yield emit(`调用 fact(1)：n ≤ 1，到达基准情形，返回 1`, [1], {
        type: 'call',
        label: `fact(1)`,
        note: '基准情形',
      });
      const base = ctx.stack[ctx.stack.length - 1];
      base.state = 'returned';
      base.returnValue = '1';
      yield emit(`fact(1) = 1，开始逐层返回`, [1], { type: 'return', label: 'fact(1)', value: '1' });
    } else {
      yield emit(`调用 fact(${k})：需要 fact(${k - 1}) 的结果，当前调用挂起等待`, [2], {
        type: 'call',
        label: `fact(${k})`,
      });
    }
  }

  // 上行：逐层恢复并返回
  let prev = 1;
  for (let k = 2; k <= n; k++) {
    ctx.stack.pop(); // 弹出已返回的 fact(k-1)
    const top = ctx.stack[ctx.stack.length - 1]; // fact(k)
    const val = k * prev;
    top.state = 'active';
    yield emit(`返回到 fact(${k})：${k} × fact(${k - 1})=${prev}，得 ${val}`, [2]);
    prev = val;
    top.returnValue = String(val);
    top.state = 'returned';
    yield emit(`fact(${k}) = ${val}，继续向上返回`, [2], { type: 'return', label: `fact(${k})`, value: String(val) });
  }
  ctx.stack.pop(); // 弹出最外层
  yield emit(`计算完成：fact(${n}) = ${prev}`, [2]);
}

// ---------------------------------------------------------------------------
// 斐波那契（朴素双递归，基准 fib(1)=fib(2)=1）
// 伪代码：
// 0 procedure fib(n)
// 1   if n ≤ 2 then return 1
// 2   return fib(n-1) + fib(n-2)
// ---------------------------------------------------------------------------

export function* fibonacciGen(n: number): Generator<VizStep, void, void> {
  const ctx = freshCtx(false, true);
  const emit = makeRecEmit(ctx);
  yield emit(`初始状态：准备计算 fib(${n})（朴素双递归，观察调用次数的指数增长）`, [0]);

  // 恢复栈顶（当前帧）为 active，其余未返回帧为 waiting
  const syncViews = () => {
    for (let i = 0; i < ctx.stack.length; i++) {
      if (ctx.stack[i].state !== 'returned') {
        ctx.stack[i].state = i === ctx.stack.length - 1 ? 'active' : 'waiting';
      }
    }
  };

  function* fibRec(k: number, parentId: string | null): Generator<VizStep, number, void> {
    ctx.counters.recursions++;
    const nodeId = `fib${ctx.counters.recursions}`;
    ctx.stack.push({ id: nodeId, label: `fib(${k})`, state: 'active', returnValue: null });
    ctx.treeNodes.push({ id: nodeId, label: `fib(${k})`, parent: parentId, state: 'active', returnValue: null });
    ctx.treeCurrentId = nodeId;
    // 父节点此刻处于 waiting（被子调用挂起）
    for (const tn of ctx.treeNodes) {
      if (tn.state === 'active' && tn.id !== nodeId) tn.state = 'waiting';
    }
    syncViews();
    yield emit(`调用 fib(${k})`, [0, 2], { type: 'call', label: `fib(${k})` });

    let val: number;
    if (k <= 2) {
      val = 1;
      // 基准情形说明（transition）：真正的 return 语义在「返回给上层」步
      yield emit(`fib(${k})：n ≤ 2，基准情形直接返回 1`, [1]);
    } else {
      yield emit(`fib(${k})：先递归计算左子问题 fib(${k - 1})`, [2]);
      const left = yield* fibRec(k - 1, nodeId);
      syncViews();
      yield emit(`左子结果返回：fib(${k - 1}) = ${left}，再递归计算 fib(${k - 2})`, [2]);
      const right = yield* fibRec(k - 2, nodeId);
      syncViews();
      val = left + right;
      yield emit(`fib(${k}) = ${left} + ${right} = ${val}`, [2]);
    }

    const top = ctx.stack[ctx.stack.length - 1];
    top.state = 'returned';
    top.returnValue = String(val);
    const treeNode = ctx.treeNodes.find((tn) => tn.id === nodeId);
    if (treeNode) {
      treeNode.state = 'returned';
      treeNode.returnValue = String(val);
    }
    yield emit(`fib(${k}) = ${val}，返回给上层`, [2], { type: 'return', label: `fib(${k})`, value: String(val) });
    ctx.stack.pop();
    return val;
  }

  const result = yield* fibRec(n, null);
  ctx.memo!.push({ key: `fib(${n})`, value: String(result) });
  yield emit(`计算完成：fib(${n}) = ${result}，共发生 ${ctx.counters.recursions} 次函数调用`, [2]);
}

// ---------------------------------------------------------------------------
// 汉诺塔
// 伪代码：
// 0 procedure hanoi(k, from, to, via)
// 1   if k = 0 then return
// 2   hanoi(k-1, from, via, to)     // 上面的 k-1 个盘先移到中转柱
// 3   移动盘 k：from → to
// 4   hanoi(k-1, via, to, from)     // 再把 k-1 个盘从中转柱移到目标柱
// ---------------------------------------------------------------------------

export function* hanoiGen(n: number): Generator<VizStep, void, void> {
  const ctx = freshCtx(true, false);
  const emit = makeRecEmit(ctx);
  ctx.pegs![0].disks = Array.from({ length: n }, (_, i) => n - i); // A 柱：底 n … 顶 1
  yield emit(`初始状态：${n} 个盘都在 A 柱，目标是把它们全部移到 C 柱`, [0]);

  function* rec(k: number, from: string, to: string, via: string, depth: number): Generator<VizStep, void, void> {
    if (k === 0) return;
    ctx.counters.recursions++;
    ctx.stack.push({ id: `h${depth}-${k}-${from}${to}`, label: `hanoi(${k}, ${from}→${to})`, state: 'active', returnValue: null });
    for (let i = 0; i < ctx.stack.length - 1; i++) {
      if (ctx.stack[i].state !== 'returned') ctx.stack[i].state = 'waiting';
    }
    yield emit(`调用 hanoi(${k})：把 ${k} 个盘从 ${from} 移到 ${to}（借助 ${via}）`, [0, 2], {
      type: 'call',
      label: `hanoi(${k}, ${from}→${to})`,
    });
    yield* rec(k - 1, from, via, to, depth + 1);
    const fromPeg = ctx.pegs!.find((p) => p.name === from)!;
    const toPeg = ctx.pegs!.find((p) => p.name === to)!;
    fromPeg.disks.pop();
    toPeg.disks.push(k);
    ctx.lastMove = `盘 ${k}: ${from} → ${to}`;
    yield emit(`移动盘 ${k}：${from} → ${to}（${from} 柱顶 → ${to} 柱顶）`, [3], {
      type: 'move',
      disk: k,
      from,
      to,
    });
    yield* rec(k - 1, via, to, from, depth + 1);
    const top = ctx.stack[ctx.stack.length - 1];
    top.state = 'returned';
    top.returnValue = '完成';
    yield emit(`hanoi(${k}, ${from}→${to}) 完成，返回上层`, [4], {
      type: 'return',
      label: `hanoi(${k}, ${from}→${to})`,
      value: '完成',
    });
    ctx.stack.pop();
  }

  yield* rec(n, 'A', 'C', 'B', 0);
  yield emit(`完成！${n} 个盘已全部移到 C 柱，共移动 ${Math.pow(2, n) - 1} 次`, [4]);
}
