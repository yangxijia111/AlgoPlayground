# CHALLENGE_SPEC.md — Challenge Mode（动手挑战）

不是看动画，而是**由用户执行算法的每一步**，系统判断操作是否符合正确算法。

## 1. 架构原则

- **复用现有 Generator**：挑战的期望序列由 `entry.run(input)` 预计算得到，绝不复制算法实现，保证挑战与真实算法永不冲突。
- 挑战逻辑独立于 UI（headless 可测）：纯函数状态机 + React 薄壳。
- 惰性步骤过滤：生成器产出中「纯解说步」（如「开始新一轮扫描」）不构成用户操作，过滤出**可交互步骤子序列** `interactive[]`（带原步下标，供渲染帧与解释）。

## 2. 类型（src/core/challenge/types.ts）

```ts
/** 一种挑战 = 一类可交互动作 + 从步骤提取期望动作的规则 */
interface ChallengeDef {
  id: string;                  // 如 'bubble-pass'
  algorithmId: string;
  title: string;
  goal: string;                // 中文目标描述
  input: AlgorithmInput;       // 挑战固定输入（规模小，3–8 元素）
  /** 从 VizStep 提取期望动作；null = 该步不是可交互步 */
  extractAction: (cur: VizStep, prev: VizStep | null) => ChallengeAction | null;
  /** 用户动作提示文案（按钮/点击语义） */
  actionLabels: Record<ChallengeAction['kind'], string>;
}

type ChallengeAction =
  | { kind: 'compare'; indices: [number, number] }
  | { kind: 'swap'; indices: [number, number] }
  | { kind: 'pick'; value: string }            // 选节点/选元素（BFS 序、BST 走向、mid 选择）
  | { kind: 'op'; op: string; value?: string } // push/pop/enqueue/dequeue/peek/front
  ;

interface ChallengeMachine {
  def: ChallengeDef;
  interactive: { action: ChallengeAction; stepIndex: number }[];
  cursor: number;              // 下一个期望动作
  mistakes: number;
  status: 'active' | 'completed';
}

interface ChallengeResult {
  machine: ChallengeMachine;
  accepted: boolean;           // 本次动作是否被接受
  feedback: string;            // 教学性反馈（对/错都要有内容）
  justCompleted: boolean;
}

function createMachine(def: ChallengeDef, steps: VizStep[]): ChallengeMachine;
function submitAction(m: ChallengeMachine, a: ChallengeAction): ChallengeResult;
```

`submitAction` 规则：
- `status === 'completed'` → 忽略后续动作。
- 动作与 `interactive[cursor].action` 匹配（kind 与载荷全等）→ 接受，cursor+1；feedback 给出正向确认（含算法原因，如「正确：BFS 用队列，所以先访问最早入队的 B」）。
- 不匹配 → mistakes+1，cursor 不动，feedback 教学性提示（引用期望动作的来源帧 description 提炼，如「此时应该先比较下标 0 和 1」「BST 上 7 < 8 应走左子树」）。
- cursor 走完 → status='completed'，justCompleted=true。

## 3. 首批 7 个挑战

| id | 算法 | 玩法 | 动作 |
| --- | --- | --- | --- |
| bubble-pass | bubble-sort | 对 [5,2,4,1] 完成一轮冒泡扫描 | compare(i,i+1) / swap(i,i+1) |
| selection-round | selection-sort | 对 [7,3,5,2] 完成第一轮选择（找最小、换到队首） | compare / swap |
| binary-search | binary-search | 在 [1,3,5,7,9,11] 中找 9：每轮选出 mid | pick(mid 下标对应的值) |
| stack-ops | stack | 依目标序列（push A,B → pop → peek）选操作 | op |
| queue-ops | queue | 依目标序列（enqueue A,B → dequeue → front）选操作 | op |
| bst-search | bst-operations | 在给定 BST 上搜 6：逐节点选走向 | pick(节点值) |
| bfs-order | bfs | 给定 6 节点图，按 BFS 序点出访问序列 | pick(节点 id) |

范围控制：做好这 7 个、真正可玩；不为覆盖更多算法把每个都做浅。

## 4. UI（/challenges/:id）

- 顶部：目标说明 + 进度（cursor/total）+ 错误计数 + Restart。
- 中部：当前可视化帧（复用 FrameView，取 interactive[cursor] 对应原步的 frame；完成显示终态帧）。
- 操作方式（按挑战类型）：
  - 排序：点击两个元素高亮 →「比较」/「交换」按钮；
  - 二分：点击区间内元素选 mid；
  - 栈/队列：操作按钮组（push 需输入值从候选中选）；
  - BST/BFS：直接点击节点。
- 反馈区（aria-live）：accepted + feedback。
- 完成：显示「完成！ mistakes 次」并写 `store.recordChallengeResult`。

## 5. 反馈质量

错误时不只显示「错误」；必须说明算法原因。每类挑战在 def 中提供 `explainWrong(expected, got)`（缺省实现引用期望动作与算法机制短句）。示例：
- 「当前算法此时应该先比较下标 0 和 1。」
- 「BFS 使用队列，因此下一步应该访问最早入队的节点 B。」
- 「7 小于当前节点 8，应进入左子树。」

## 6. 测试要求

- 每个挑战：正确序列通关（ mistakes=0）、每一步的错误动作被拒绝且 cursor 不动、重复动作处理、Restart 后状态归零。
- 一致性测试：interactive 提取的动作数 ≥1；通关序列回放 = 真实算法 interactive 子序列。
- 边界：空输入 / 单元素输入 的挑战不可用时不列出（列表过滤）。
