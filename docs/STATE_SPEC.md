# STATE_SPEC.md — 状态规格

## 1. 播放器状态机（src/core/player/engine.ts）

```ts
interface PlayerSnapshot {
  index: number;      // 当前步下标，0 ≤ index < total
  total: number;      // 步骤总数
  playing: boolean;
  speed: number;      // 0.25 | 0.5 | 1 | 2 | 4
  finished: boolean;  // index === total - 1（total ≥ 1 时）
}
```

状态转移：

| 动作 | 前置 | 后置 |
| --- | --- | --- |
| play | — | playing=true；若 finished 则先 seek(0) |
| pause | — | playing=false |
| toggle | — | play/pause 互换 |
| next | index < total-1 | index+1，playing=false（手动导航暂停） |
| prev | index > 0 | index-1，playing=false |
| seek(i) | 任意 | index=clamp(i,0,total-1)，playing=false |
| restart | — | index=0，acc=0，playing=false，speed 不变 |
| setSpeed(x) | — | speed=x，acc=0（index 不变） |
| tick(dt) | playing 且未 finished | 累积 dt；每达到 `baseMs/speed` 推进 1 步；一次 tick 可推进多步；到达最后一步自动 playing=false |

不变式（测试断言）：
- I1 `0 ≤ index < total`（total ≥ 1）；total=0 时 index=0、finished=true、tick 无效。
- I2 非 playing 状态 tick 不改变任何状态。
- I3 暂停/恢复/变速/seek 前后，同一下标的快照内容恒定（可重放性）。
- I4 speed 只影响推进速率，不影响步数与结果。

驱动：React 侧 `usePlayback(stepCount)` 用 requestAnimationFrame 循环调用 `engine.tick(dt)`，`useSyncExternalStore` 订阅快照；stepCount 变化时重建引擎（新运行从第 0 步开始）。

## 2. 页面状态（AlgorithmPage 本地 state，无全局 store）

```ts
input: AlgorithmInput        // 当前输入（编辑器修改）
validationError: string|null // validate(input) 的中文错误
steps: VizStep[]             // useMemo: 校验通过时 collectSteps(run(input))，否则 []
index/playing/speed          // 来自 usePlayback
```

派生规则：`steps[index]` 为当前渲染帧；steps 为空时显示校验错误或空态占位。

## 3. 比较模式状态（ComparePage 本地 state）

```ts
array: number[]                       // 共同数据
selected: AlgorithmId[]               // 2–3 个，重复选择被禁止
runs: { meta, steps, finalCounters }[] // useMemo 各自预计算
engine: PlaybackEngine(stepCount = max(runs.steps.length))
```

同步语义：三个视图都渲染 `steps[min(index, len-1)].frame`；表格取 `finalCounters` 与 `steps.length`。

## 4. 全局状态

仅两项：
- `theme: 'dark' | 'light'`（Context + localStorage 持久化，默认 dark）。
- 路由（react-router）。

不引入 Redux/Zustand：跨页面共享运行时状态只有 theme；页面状态生命周期与页面一致（ADR-5）。

## 5. 图编辑器状态（GraphPage 本地 state）

```ts
graph: GraphModel                    // 节点/边/权重（编辑器本地模型）
startId/endId: string|null           // 起点/终点
mode: 'move'|'addNode'|'addEdge'|'delete'
pendingEdgeFrom: string|null         // addEdge 模式下第一个已点节点
selectedEdgeId: string|null          // 用于改权重/删除边
// 提交：点击"运行算法"→ onCommit({graph, start, end})，算法重新预计算
```

编辑约束（校验）：节点 ≤ 12；边 ≤ 24；无自环/重复边（无向图 (a,b) 与 (b,a) 视为重复）；权重整数 1–99；起点必选才能运行；删除节点级联删除关联边。

## 6. 输入校验（src/core/validation.ts）

统一返回 `string | null`（null=通过），全部中文消息，示例：
- `"数组长度必须在 4–60 之间"`、`"第 3 项不是整数"`、`"数值范围为 -99–999"`
- `"二分查找要求数组已按升序排列"`
- `"值已存在于树中"`、`"位置必须在 0–长度 之间"`
- `"权重必须是 1–99 的整数"`、`"起点必须选择"`
- `"n 必须在 4–8 之间"`、`"背包容量必须在 1–20 之间"`

校验失败 → 不生成新步骤，保留上一次成功结果并显示错误（播放器状态保持）。
