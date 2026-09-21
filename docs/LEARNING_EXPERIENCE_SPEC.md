# LEARNING_EXPERIENCE_SPEC.md — 学习体验总纲

## 1. 学习闭环

```
知识讲解（Learn 路线 + 概念课）
  → 看动画（现有算法页）
  → 单步观察（现有播放器）
  → 初学者解释（Beginner Mode）
  → 猜下一步（Predict）
  → 小测验（Quiz）
  → 动手挑战（Challenge）
  → 复习（Bookmarks / Notes / 重访）
  → 掌握度（Mastery）
  → 学习记录（Progress）
```

原则：轻量、本地优先；不做重型 LMS。所有学习功能围绕**现有算法页**增强，而不是另建一套平行内容。

## 2. 页面与路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | Home | 增加 First Run Welcome（仅一次，可 Skip） |
| `/learn` | Learning Path | 13 章路线，状态/完成度/推荐下一步，不强制解锁 |
| `/learn/concept/:conceptId` | 概念课 | 基础概念 4 节 |
| `/:category/:algoId` | 算法页（现有） | 增强：Beginner/Predict/Quiz/Notes/收藏/分享 |
| `/challenges` | 挑战列表 | |
| `/challenges/:challengeId` | 挑战详情 | |
| `/progress` | Progress | 掌握度/统计/Bookmarks/Import-Export/Reset |
| `/glossary` | 术语表 | |
| `/complexity` | Complexity Explorer | |

现有 `/compare` 与 `/:category/:algoId` 路由保持原样（静态路由声明在动态段之前，React Router v6 自动按特异性匹配）。

顶栏保持简洁：品牌 + Beginner 切换 + 主题切换。Sidebar 顶部导航：首页 / Learn / 挑战 / 进度 / 术语 / 复杂度 / 排序比较，下方为算法分类列表。

## 3. 学习路线（13 章）

1. 基础概念（概念课 ×4）
2. 数组（Bubble Sort 入门）
3. 链表（Linked List）
4. 栈（Stack）
5. 队列（Queue）
6. 搜索（Linear / Binary Search）
7. 树（BST Operations / Tree Traversal）
8. 堆（Heap Sort）
9. 排序（Selection / Insertion / Merge / Quick）
10. 图（BFS / DFS / Dijkstra）
11. 递归（Factorial / Fibonacci / Hanoi）
12. 回溯（N Queens）
13. 动态规划（Fib DP / Knapsack）

每章列出小节（概念课或算法链接）+ 每节学习状态 + 章节完成度（已学/总数）。排序章按学习价值排序：Selection → Insertion → Merge → Quick。**不强制解锁**，用户可自由跳转；「推荐下一步」只是引导（第一个未开始的小节）。

## 4. 课程结构（算法页增强）

算法讲解不在 Learn 里复制一遍，统一由算法页承载。算法页从上到下已有的教学要素（What/Why = 用途、Core Idea、Pseudocode、Complexity、Animation、Step Explanation、变量状态、统计）之外，P10 增加：

1. **Beginner Mode**：逐步详解（见 §5）。
2. **Predict Next Step**：播放中暂停出题（见 PREDICT_SPEC）。
3. **Quiz**：本算法题组（见 QUIZ_SPEC）。
4. **Challenge 入口**：若该算法有挑战，显示入口卡片。
5. **Notes**：右栏底部 textarea，自动保存。
6. **收藏 / 分享**：标题栏星标 + 分享按钮。
7. **三档复杂度**：`complexity?` 存在时显示 Best/Average/Worst（如快排 O(n log n)/O(n log n)/O(n²)），否则回退单值。

概念课页结构统一为：What → Why → Key Points → 关联算法/章节链接（内部跳转）。纯静态结构化数据渲染，无富文本。

## 5. Beginner Mode

全局双档：Beginner / Standard（顶栏切换，存 settings）。关闭时 UI 与 v1.0.1 完全一致。

开启时，「当前步骤」卡片在原 `description` 下方追加：
1. **逐步详解**：由 `explainStepBeginner(cur, next)` 从 Frame 语义字段（comparing/swapping/pivot/range/pointers/frontier/distance/dependencies…）确定性推导，包含具体下标与值。不调用 AI、无随机。示例（快排）：
   > 正在检查下标 3 的元素 a[3]=7。pivot 是本分区选定的基准值 a[5]=9。a[3] < pivot，所以它应留在 pivot 左侧区域。
2. **算法要点**：`AlgorithmMeta.beginnerNote?`（每算法一句，如「快排每次分区会把 pivot 放到最终位置」）。

步骤类型推导 `deriveStepKind(frame)`：compare / swap / pivot-set / range-shrink / visit / enqueue / dequeue / push / pop / relax / found / fill / call / return / move 等；无法识别的步骤返回 none，Beginner 下只显示原 description（不强凑解释）。

## 6. Glossary

集中管理在 `src/core/learning/glossary.ts`（UI 不内嵌术语文案）。首批 ≥22 个术语：pivot、stack、queue、FIFO、LIFO、recursion、base case、visited、frontier、relaxation、distance、predecessor、heap、stable sort、in-place、time complexity、space complexity、DP state、backtracking、branch、node、edge。

- `/glossary` 页：全部术语索引（按字母/拼音分组）。
- 概念课文本中术语以 `[term:pivot]` 标记，渲染为虚线下划线链接，点击弹出浮层解释（不离开当前页；Esc/点击外部关闭；aria-haspopup）。

## 7. First Run Welcome

Home 首次访问（`settings.welcomeDone === false`）显示单屏欢迎卡片：AlgoPlayground 是什么 / 推荐从 Learn 开始 / 播放器如何用 / Beginner 开关在哪。按钮：「从冒泡排序开始」与「跳过」。点击任意按钮即写 `welcomeDone = true`，之后不再出现。不做多屏强制 Tutorial。

## 8. 无障碍（新增功能强制）

- 所有交互控件 `aria-label`；Predict/Quiz/Challenge 全部可键盘操作（选项为真实 button/radio，Enter 提交）。
- 浮层（术语/Welcome）有 Esc 关闭 + 焦点管理（打开聚焦首个控件，关闭归还触发元素）。
- `:focus-visible` 样式保留；答题反馈使用 `aria-live="polite"`；遵循 `prefers-reduced-motion`（新动画一律 CSS transition，禁用装饰性长动画）。

## 9. 移动端

桌面优先不变；720px 下学习相关页面（Learn/Progress/Quiz/Challenge）纵向堆叠不破版、基本可操作。不为移动端做专门优化。

## 10. 性能约束

- Progress 页与 Sidebar 的掌握度计算：以 `useMemo` 派生自 store 快照，不在渲染期重复全量计算。
- Predict/Quiz 明细展示只读 `recent` 截断列表，不遍历全量历史。
- localStorage 写入防抖；单帧渲染路径（算法页）不因学习功能增加而新增重计算。
