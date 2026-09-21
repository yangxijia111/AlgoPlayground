# PREDICT_SPEC.md — Predict Next Step（猜下一步）

P10 核心交互：把「看动画」变成「主动思考算法下一步」。完全确定性、本地生成，禁止 AI 出题。

## 1. 交互流程

```
开启 Predict 模式（算法页播放器旁开关）
  → 播放/单步推进
  → 到达出题点（默认每推进 4 步检查一次，且该步可出题）
  → 自动暂停，弹出题目（四选一）
  → 用户选择 → 判分 → 显示 对/错 + 解释（解释引用真实下一步）
  → 「继续」恢复播放/单步
```

- 出题点判断：`index % 4 === 3` 且 `generatePredictQuestion(steps, index) !== null`。拖动时间轴、手动 next 不触发出题（只在播放推进或「下一步提问」按钮时触发）；答完一题后重新计数。
- 用户也可随时点「考考我」立即在当前步出题（可出题时）。
- 会话内显示：本题结果 + 本次会话 correct/total。持久化记录见 §4。

## 2. 出题引擎（src/core/predict/engine.ts）

```ts
interface PredictQuestion {
  kind: PredictKind;
  prompt: string;          // 中文问题
  options: string[];       // 3–4 个选项
  answerIndex: number;     // 正确选项下标
  explanation: string;     // 判分后展示（引用真实下一步内容）
  stepType: StepKind;      // deriveStepKind(cur.frame)
}

function generatePredictQuestion(steps: VizStep[], index: number): PredictQuestion | null
```

输入：预计算步骤数组 + 当前步下标。基于 `cur = steps[index]`、`next = steps[index+1]`（无 next → null）。禁止 `Math.random`；干扰项从当前帧的其他候选值确定性构造（邻近下标/帧内元素/已知常量）。

### 各帧类型题型

| 帧 | 条件（next 相对 cur 的 diff） | 题型 | 示例 prompt |
| --- | --- | --- | --- |
| array | next.comparing 非空且不同于 cur | next-compare | 下一步将比较哪些元素？ |
| array | next.swapping 非空 | next-swap | 下一步将交换哪两个位置？ |
| array | next.pointers.mid 存在（二分） | next-mid | 下一步 mid 将是多少？（选项为数值下标） |
| array | next.found 非空 | found | 目标值在哪个位置？ |
| graph | next.current 变化 | next-visit | 下一个被访问的节点是？（选项取 frontier 中的节点） |
| graph | 某节点 distance 变化（Dijkstra） | next-relax | dist[B] 将更新为多少？ |
| structure | layout=stack，push/pop 步 | next-stack-op | 下一步栈顶将是？（或下一个操作） |
| structure | layout=queue | next-queue-op | 下一个出队元素是？ |
| tree | highlight 变化（BST 下降） | next-tree-node | 下一步将走到哪个节点？ |
| dp | next.current 变化 | next-dp-cell | 下一个填充的格子是？（行/列）及格值 |
| recursion | callStack 长度+1 | next-call | 下一个发生的调用是？ |
| nqueens | tryingRow/Col 变化 | next-try | 皇后下一步尝试放在哪行哪列？ |

规则：
- 不适合出题（初始步、总结步、无有效 diff、候选干扰项不足 3 个）→ 返回 `null`，播放不暂停。
- 干扰项必须「看起来合理」：同帧邻近候选（如比较 (2,3) 的干扰项取 (1,2)/(3,4)/(0,1)）；数值题取帧内其它元素值。
- `explanation` 由真实 next 步生成，如「真实下一步：比较 a[4]=6 与 pivot=9（因为 j 前进到 4）」。

### 与算法正确性的一致性

题目答案永远取自真实 `steps[index+1]`，结构上不可能与算法行为冲突。专项单测（PREDICT 一致性测试）遍历代表性输入的完整步骤序列，断言每个非 null 题目的 `options[answerIndex]` 与 nextStep 的对应字段一致。

## 3. 判分

`gradePredict(question, selectedIndex): { correct: boolean }` —— selectedIndex === answerIndex。多答/越界视为错误。

## 4. 记录

每次作答调用 `store.recordPredictAttempt(algorithmId, { at, stepIndex, stepType, correct })`：
- 聚合 `predict.total / correct`（供掌握度与 Progress 页正确率）；
- `predict.recent` 保留最近 50 条明细（FIFO）；
- 会话内本次正确率仅存内存，不入库。
