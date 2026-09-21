# QUIZ_SPEC.md — Quiz 系统

## 1. 数据结构（src/core/quiz/types.ts）

```ts
type QuizType = 'single' | 'multiple' | 'judge';

interface QuizQuestion {
  id: string;                 // 全局唯一，如 'bubble-sort-1'
  algorithmId: string;        // 关联算法；概念题用 'concept:<id>'，如 'concept:complexity'
  category: QuizCategory;     // 'concept' | 'complexity' | 'stability' | 'trace' | 'mechanism'
  type: QuizType;
  question: string;           // 中文题干
  options: string[];          // judge 恰 2 项；single ≥3；multiple ≥3
  answer: number[];           // 正确选项下标升序数组（single/judge 长度 1）
  explanation: string;        // 必填解析（答错也要能看懂）
  difficulty: 1 | 2 | 3;      // 入门 / 进阶 / 挑战
  tags: string[];             // 自由标签，如 ['pivot', 'partition']
}
```

题库按算法分文件放 `src/core/quiz/questions/<category>.ts`，聚合导出 `ALL_QUESTIONS` 与 `questionsByAlgorithm(algorithmId)`。**禁止在 React 组件内硬编码题目。**

## 2. 判分（纯函数）

```ts
function gradeQuiz(q: QuizQuestion, selected: number[]): { correct: boolean }
```

- `single` / `judge`：selected 长度 1 且等于 answer[0]。
- `multiple`：selected 升序排序后与 answer 完全相等（全对才算对；部分选对不得分——规则简单可解释，写入 UI 提示「多选题需全部选对」）。
- selected 含越界下标 → 视为错误（防御）。

## 3. 题库内容要求

19 个核心算法各 3–5 道：Bubble / Selection / Insertion / Merge / Quick / Heap Sort、Linear / Binary Search、Stack / Queue / Linked List、BST Operations / Tree Traversal、BFS / DFS / Dijkstra、Recursion（fibonacci-recursion）、N Queens、DP（fib-dp 与 knapsack 合并为一组）。

类别分布要求（每算法至少覆盖 2 类）：
- **concept**：算法适用场景、核心思想（如「快排分区后 pivot 处于什么位置？」）
- **complexity**：最好/平均/最坏区分（如「快排最坏情况何时发生？」）
- **stability**：稳定性判断（排序类）
- **trace**：给定小输入推演执行结果（如「[3,1,2] 冒泡一轮后数组是？」）
- **mechanism**：机制细节（如「BFS 使用什么数据结构？」）

质量红线：不批量生成低质量重复题；每题 explanation 必须有教学价值；干扰项应是常见误解（而不是乱凑）。

## 4. UI（算法页 Quiz 区块）

- 位置：算法页右栏教学面板下方（或折叠区块）「随堂小测」。
- 一次展示该算法全部题目（3–5 道）顺序作答；每题选择后立即判分并显示 explanation；可更换答案重做（记录以最后一次为准，attemptCount 累加）。
- 顶部进度：已答 x/y；完成后显示本轮正确数。
- 记录：每题作答调用 `store.recordQuizAnswer(algorithmId, questionId, correct)`（QuizRecord 见 LEARNING_DATA_SPEC）；刷新后记录保留（显示每题历史对错小圆点）。
- 无障碍：选项为 button（radio 语义 role="radio"），aria-live 播报判分结果。

## 5. 测试要求

- 判分单测：single 对/错、multiple 全对/部分对/全错、judge、越界下标。
- 题库完整性测试（静态校验 ALL_QUESTIONS）：id 唯一、algorithmId 存在于注册表（或 concept: 前缀合法）、options 数量符合 type、answer 下标合法且升序、explanation/question 非空、difficulty ∈ {1,2,3}。
- 记录测试：作答后 QuizRecord 更新、重复作答覆盖 lastCorrect 且 attemptCount 增加、刷新（重新 load）后保留。
