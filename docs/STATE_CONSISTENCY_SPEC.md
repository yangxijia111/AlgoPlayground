# STATE_CONSISTENCY_SPEC — 编辑器状态一致性（P11）

## 1. 问题模型

每个「结构类」算法页存在三份状态：

```
Editor 本地展示态（chips）
    ── onCommit(beforeState, operation) ──▶  AlgorithmPage input
                                                ── entry.run ──▶ Generator 结果帧（终态）
```

一致性契约：**UI 编辑器在操作后展示的状态 ≡ Generator 对同一 (beforeState, operation) 产出的终态帧**。

v1.1.0 两处违约：
1. Stack Pop：编辑器 `slice(1)` vs Generator `slice(0,-1)`。
2. BST Delete：编辑器 `filter` vs Generator 中序后继替换——双子节点删除时两者产出**不同构**的树。

## 2. 修复设计

### 2.1 领域状态提取为 pure reducer（React 只调用）

新增 `src/core/editors/structureState.ts`：

```ts
/** 栈/队列参考模型：与 stackGen/queueGen 的终态严格一致 */
export function applyLinearOperation(initial: string[], structure: 'stack' | 'queue', op: LinearOperation): LinearOpResult;
export interface LinearOpResult { next: string[]; rejected: boolean; removed: string | null }

/** 链表参考模型：与 linkedListGen 终态严格一致 */
export function applyLinkedListOperation(initial: string[], op: LinkedListOperation): LinkedListOpResult;

/** BST 参考模型：
 * - insert  → [...seq, v]        （append 即重建同构树）
 * - delete  → 删除产物树的先序序列（BST 先序序列唯一重建同构树）
 * - search/traverse/build → seq 不变 / 重建
 */
export function applyBSTOperation(startTree: number[], op: BSTOperation): BSTOpResult;
```

要点：
- `applyBSTOperation` 的 delete 内部走 `buildTree(seq) → removeNode(root, v) → preorder(root)`，与 Generator 的删除实现共用 `tree/model.ts`，结构上不可能分叉。
- 编辑器组件改为调用 reducer 计算 `next`；禁止组件内自写 `slice/filter` 近似。

### 2.2 beforeState / operation / afterState 三段式

编辑器 commit 协议固定为：

```
before = 当前编辑器状态（闭包捕获）
op     = 本次操作
after  = apply*Operation(before, op).next   // 拒绝时 after === before
onCommit({ ..., initial: before, operation: op })
setLocalState(after)
```

约束：
- operation 永远基于 before 执行（Generator 语义）；
- 编辑器下一次展示 after；
- 校验失败的提交不得改变编辑器本地状态（`validate` 失败时 return，不 setLocalState）。

### 2.3 Share 恢复后的状态同步（消除 shadow state）

AlgorithmPage 维护 `inputEpoch: number`。本地 commit 不改变 epoch；share hydration 成功时 `setInputEpoch(e => e + 1)` 并以 `key={entry.meta.id + ':' + inputEpoch}` 重挂 InputEditor → 编辑器以新 `value` 重新初始化本地 state。正常操作链 epoch 不变，不破坏连续操作。

### 2.4 契约测试（锁定）

1. **Reference ⇄ Generator**：随机操作序列（fast-check）下，reducer 的 `after` 每一步都等于 Generator 最后一帧解析出的结构状态（stack: nodes 值序列；queue 同；list 同；bst: 先序序列比对树同构）。
2. **Reference ⇄ UI Editor 语义**：编辑器组件测试（RTL）执行同一随机序列，chips 文本序列 === reducer `after` 序列。
3. **连续多步操作链**：push→pop→push、insert→delete 等序列后三方一致。
4. **BST 双子删除反例锁定**：[8,3,10,1,6,4,7,14] 删 3 后，先序序列重建树 === Generator 终态树，且 ≠ 旧 filter 行为产物。

## 3. 覆盖的操作矩阵

| 结构 | 操作 | reducer | Generator | UI |
|------|------|---------|-----------|-----|
| stack | push/pop/peek | ✓ | ✓ | ✓ |
| queue | enqueue/dequeue/front | ✓ | ✓ | ✓ |
| linkedlist | create/traverse/insert/delete/search | ✓ | ✓ | ✓ |
| bst | build/insert/search/delete/traverse | ✓（delete=先序） | ✓ | ✓ |

拒绝路径（空栈 pop、满栈 push、非法位置）同样进契约：`rejected=true` 时 after===before，Generator 终态帧 === before。
